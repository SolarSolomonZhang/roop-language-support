/**
 * ROOP Language Server (server.ts)
 *
 * Table of Contents
 * 1. Overview
 * 2. Server wiring and capabilities
 * 3. Configuration model
 * 4. Language catalog (keywords, directives, actions, events, operators)
 * 5. Utilities (tokenization, text range helpers)
 * 6. Diagnostics
 *    6.1 Missing colon on block headers
 *    6.2 Unbalanced 'start task' / 'end task'
 *    6.3 Unknown or unsupported top-level verb
 * 7. Completion
 *    7.1 Context-aware snippets
 *    7.2 Action catalog completions
 *    7.3 Event and directive completions
 * 8. Hover (inline help)
 * 9. Document symbols (task outline and templates)
 * 10. Folding ranges
 * 11. Formatting (indentation and block headers)
 * 12. Code actions (quick fixes)
 * 13. Document lifecycle hooks and main
 */

import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  Diagnostic,
  DiagnosticSeverity,
  InitializeParams,
  InitializeResult,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  Hover,
  MarkupKind,
  DocumentSymbol,
  SymbolKind,
  FoldingRange,
  FoldingRangeKind,
  TextEdit,
  CodeAction,
  CodeActionKind,
  Range,
  Position,
  WorkspaceFolder,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

/* ============================================================================
 * 1. Overview
 * ----------------------------------------------------------------------------
 * This language server provides a pragmatic, production-ready set of features
 * for the ROOP DSL: diagnostics, completion, hover, symbols, folding,
 * formatter, and quick-fixes. The implementation follows the language
 * constructs used across the ROOP manual and example scripts.
 * ==========================================================================*/

/* ============================================================================
 * 2. Server wiring and capabilities
 * ==========================================================================*/

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
let workspaceFolders: WorkspaceFolder[] | null = null;

connection.onInitialize((params: InitializeParams): InitializeResult => {
  workspaceFolders = params.workspaceFolders || null;

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [" ", '"', ":", ".", "[", "(", "{"],
      },
      hoverProvider: true,
      documentSymbolProvider: true,
      foldingRangeProvider: true,
      documentFormattingProvider: true,
      codeActionProvider: {
        codeActionKinds: [CodeActionKind.QuickFix],
      },
    },
  };
});

connection.onInitialized(() => {
  connection.console.log("ROOP language server initialized.");
});

/* ============================================================================
 * 3. Configuration model
 * ----------------------------------------------------------------------------
 * These keys mirror the extension configuration so users see consistent
 * behavior between client and server.
 * ==========================================================================*/

type LintLevel = "off" | "hint" | "warning" | "error";

interface RoopSettings {
  format: {
    enabled: boolean;
    indentSize: number;
  };
  lint: {
    missingColon: { severity: LintLevel };
    unbalancedTask: { severity: LintLevel };
  };
  completion?: {
    extraKeywords?: string[];
  };
}

const defaultSettings: RoopSettings = {
  format: {
    enabled: true,
    indentSize: 2,
  },
  lint: {
    missingColon: { severity: "hint" },
    unbalancedTask: { severity: "warning" },
  },
  completion: {
    extraKeywords: [],
  },
};

let globalSettings: RoopSettings = defaultSettings;

connection.onDidChangeConfiguration((change) => {
  const cfg = change.settings?.roop || {};
  globalSettings = {
    format: {
      enabled: cfg.format?.enabled ?? defaultSettings.format.enabled,
      indentSize: clampInt(
        cfg.format?.indentSize,
        2,
        8,
        defaultSettings.format.indentSize,
      ),
    },
    lint: {
      missingColon: {
        severity: validateLint(
          cfg.lint?.missingColon?.severity,
          defaultSettings.lint.missingColon.severity,
        ),
      },
      unbalancedTask: {
        severity: validateLint(
          cfg.lint?.unbalancedTask?.severity,
          defaultSettings.lint.unbalancedTask.severity,
        ),
      },
    },
    completion: {
      extraKeywords: Array.isArray(cfg.completion?.extraKeywords)
        ? cfg.completion!.extraKeywords
        : [],
    },
  };
  // Revalidate all open docs when configuration changes.
  documents.all().forEach(validateTextDocument);
});

function clampInt(v: any, min: number, max: number, def: number): number {
  const n = typeof v === "number" ? Math.floor(v) : def;
  return Math.max(min, Math.min(max, n));
}

function validateLint(v: any, def: LintLevel): LintLevel {
  return v === "off" || v === "hint" || v === "warning" || v === "error"
    ? v
    : def;
}

function toSeverity(level: LintLevel): DiagnosticSeverity | undefined {
  switch (level) {
    case "hint":
      return DiagnosticSeverity.Hint;
    case "warning":
      return DiagnosticSeverity.Warning;
    case "error":
      return DiagnosticSeverity.Error;
    default:
      return undefined;
  }
}

/* ============================================================================
 * 4. Language catalog (keywords, directives, actions, events, operators)
 * ----------------------------------------------------------------------------
 * These lists back completion, hover, and diagnostics. Catalog entries aim to
 * cover the full range of tasks users typically express in ROOP. Categories
 * are used for documentation and sorting.
 * ==========================================================================*/

type Catalog = Record<string, string[]>;

const DIRECTIVES = ["import", "include", "pragma"];

const STRUCTURAL = [
  "start task",
  "end task",
  "template task",
  "context",
  "use module",
  "define",
  "run",
  "call",
  "await run",
  "detached run",
  "assign",
  "dispatch task",
  "synchronize",
];

const CONTROL = [
  // Triggers and blocks
  "when",
  "on",
  "if",
  "elseif",
  "else",
  "repeat",
  "while",
  "for",
  "parallel",
  "at time",
  // Flow control
  "break",
  "continue",
  "exit",
  "abort",
  "retry",
  "fallback",
];

const EVENTS = ["failure", "success", "timeout", "deviation", "interruption"];

const OPERATORS = [
  "and",
  "or",
  "not",
  "is",
  "exists",
  "near",
  "on",
  "in",
  "before",
  "after",
  "within",
  "confidently",
  "probably",
  "similar to",
  "anchor on",
  "relative to",
];

// High‑coverage action catalog grouped by domain
const ACTIONS: Catalog = {
  Perception: [
    "detect",
    "scan",
    "observe",
    "track",
    "classify",
    "identify",
    "localize",
    "map",
    "estimate",
  ],
  Navigation: [
    "move",
    "navigate",
    "go to",
    "approach",
    "follow",
    "back off",
    "retreat",
    "avoid",
    "dock",
    "undock",
    "align",
    "orient",
    "set speed",
  ],
  Manipulation: [
    "grasp",
    "release",
    "pick",
    "place",
    "push",
    "pull",
    "press",
    "turn",
    "flip",
    "slide",
    "insert",
    "remove",
    "pour",
    "fill",
    "empty",
    "stir",
    "scoop",
    "shake",
    "tighten",
    "loosen",
    "open",
    "close",
    "lock",
    "unlock",
  ],
  Environment: [
    "turn on",
    "turn off",
    "dim",
    "brighten",
    "toggle",
    "set temperature",
    "ventilate",
    "humidify",
  ],
  Household: [
    "clean",
    "wipe",
    "wash",
    "rinse",
    "dry",
    "vacuum",
    "mop",
    "sweep",
    "sanitize",
    "disinfect",
    "sort",
    "stack",
    "fold",
  ],
  Kitchen: [
    "cook",
    "bake",
    "boil",
    "fry",
    "heat",
    "cool",
    "brew",
    "serve",
    "deliver",
  ],
  Logistics: ["fetch", "bring", "collect", "carry", "transfer", "handover"],
  Communication: [
    "say",
    "display",
    "notify",
    "ask",
    "expect",
    "wait for",
    "log",
    "play",
    "pause",
    "stop",
    "resume",
    "record",
    "capture",
    "photograph",
    "stream",
  ],
  Measurement: [
    "measure",
    "weigh",
    "sample",
    "analyze",
    "test",
    "calibrate",
    "self-check",
  ],
  Maintenance: ["charge", "start module", "stop module", "restart module"],
  "Multi-robot": [
    "assign",
    "dispatch",
    "synchronize",
    "coordinate",
    "share map",
  ],
  "Data & Memory": ["remember", "recall", "store", "load"],
  Safety: ["emergency stop", "yield", "wait"],
  Planning: ["plan", "plan path", "plan grasp"],
};

// Quick doc for key verbs and phrases
const DOCS: Record<string, string> = {
  "start task": "Begins a named task. Balanced with `end task`.",
  "end task": "Ends the current task.",
  "template task": "Declares a named task template block.",
  "use module":
    "Declares a capability module by name so its actions can be invoked.",
  run: "Invokes a named task or inline block.",
  "await run": "Runs a task and waits for it to complete before continuing.",
  "detached run": "Runs a task asynchronously and continues immediately.",
  assign: "Assigns a role to an agent (multi-robot orchestration).",
  "dispatch task": "Sends a named task to a remote agent.",
  synchronize: "Declares a rendezvous or barrier.",
  when: "Event-driven trigger block based on perception or context.",
  on: "Outcome/event branch such as `on failure:`.",
  if: "Conditional block.",
  elseif: "Conditional else-if block.",
  else: "Else branch.",
  repeat: "Fixed-count loop block.",
  while: "Conditioned loop block.",
  for: "Iteration over a collection.",
  parallel: "Runs child blocks concurrently.",
  "at time": "Schedules a block to run at a specific time.",
  abort: "Terminates the current task.",
  retry: "Repeats the preceding action/block after failure.",
  fallback: "Declares an alternate strategy when the main one fails.",
  move: "Moves a robot or actuator to a target (object, location, or offset).",
  grasp: "Closes the end-effector around a target to hold it.",
  release: "Opens the end-effector to let go of the target.",
  "turn on": "Switches a device or module on.",
  "turn off": "Switches a device or module off.",
  say: "Speaks the given text.",
  display: "Shows text on a visual panel or screen.",
  notify: "Sends a user/system notification.",
  ask: "Prompts the user and captures an answer.",
  expect: "Waits for a value or condition within a deadline.",
  "wait for": "Pauses until an event or state is observed.",
  detect: "Invokes perception to find an entity matching the description.",
  track: "Maintains a live reference to a moving target.",
  plan: "Requests a plan (e.g., path or sequence) for a goal.",
  "plan path": "Plans a path from the current state to a target.",
  "plan grasp": "Plans a feasible grasp for a target.",
};

// Convenience sets for quick checks
const ALL_MULTIWORD_STARTERS = new Set<string>([
  ...DIRECTIVES,
  ...STRUCTURAL,
  ...CONTROL,
  ...OPERATORS,
  "turn on",
  "turn off",
  "go to",
  "back off",
  "set speed",
  "emergency stop",
  "plan path",
  "plan grasp",
  "wait for",
  "at time",
  "dispatch task",
]);

const SINGLE_WORD_STARTERS = new Set<string>([
  "let",
  "say",
  "move",
  "grasp",
  "release",
  "display",
  "notify",
  "ask",
  "expect",
  "log",
  "detect",
  "scan",
  "observe",
  "track",
  "classify",
  "identify",
  "localize",
  "map",
  "navigate",
  "approach",
  "follow",
  "retreat",
  "avoid",
  "dock",
  "undock",
  "align",
  "orient",
  "push",
  "pull",
  "press",
  "turn",
  "flip",
  "slide",
  "insert",
  "remove",
  "pour",
  "fill",
  "empty",
  "stir",
  "scoop",
  "shake",
  "tighten",
  "loosen",
  "open",
  "close",
  "lock",
  "unlock",
  "clean",
  "wipe",
  "wash",
  "rinse",
  "dry",
  "vacuum",
  "mop",
  "sweep",
  "sanitize",
  "disinfect",
  "sort",
  "stack",
  "fold",
  "cook",
  "bake",
  "boil",
  "fry",
  "heat",
  "cool",
  "brew",
  "serve",
  "deliver",
  "fetch",
  "bring",
  "collect",
  "carry",
  "transfer",
  "handover",
  "play",
  "pause",
  "stop",
  "resume",
  "record",
  "capture",
  "photograph",
  "stream",
  "measure",
  "weigh",
  "sample",
  "analyze",
  "test",
  "calibrate",
  "charge",
  "assign",
  "dispatch",
  "synchronize",
  "coordinate",
  "remember",
  "recall",
  "store",
  "load",
  "yield",
  "wait",
  "plan",
  "run",
  "call",
  "define",
  "context",
  "template",
  "start",
  "end",
  "use",
  "import",
  "include",
  "pragma",
  "abort",
  "retry",
  "fallback",
  "break",
  "continue",
  "exit",
  "parallel",
  "if",
  "elseif",
  "else",
  "when",
  "on",
  "while",
  "repeat",
  "for",
]);

/* ============================================================================
 * 5. Utilities (tokenization, text range helpers)
 * ==========================================================================*/

function getWordRangeAt(doc: TextDocument, pos: Position): Range {
  const text = doc.getText();
  const offset = doc.offsetAt(pos);
  const start = scanBackward(text, offset);
  const end = scanForward(text, offset);
  return Range.create(doc.positionAt(start), doc.positionAt(end));
}

function scanBackward(text: string, start: number): number {
  let i = Math.max(0, start - 1);
  while (i > 0) {
    const ch = text[i - 1];
    if (!ch || !/[A-Za-z0-9_\-]/.test(ch)) {
      break;
    }
    i--;
  }
  return i;
}
function scanForward(text: string, start: number): number {
  let i = start;
  while (i < text.length) {
    const ch = text[i];
    if (!ch || !/[A-Za-z0-9_\-]/.test(ch)) {
      break;
    }
    i++;
  }
  return i;
}

function lineAt(doc: TextDocument, line: number): string {
  const start = doc.offsetAt({ line, character: 0 });
  const end = doc.offsetAt({ line: line + 1, character: 0 });
  return doc
    .getText({ start: doc.positionAt(start), end: doc.positionAt(end) })
    .replace(/\r?\n$/, "");
}

function makeRange(line: number, startChar: number, endChar: number): Range {
  return Range.create(
    Position.create(line, startChar),
    Position.create(line, endChar),
  );
}

function endsWithColonCandidate(line: string): boolean {
  // Lines that should end with ':' according to block rules.
  // (when/on/if/elseif/else/repeat/while/for/parallel [+ template task])
  const trimmed = line.trim();
  if (/^\/\//.test(trimmed) || trimmed.length === 0) return false;
  return /^(when\b.*|on\s+\w+|if\b.*|elseif\b.*|else\b.*|repeat\b.*|while\b.*|for\b.*|parallel\b.*|template\s+task\b.*)$/.test(
    trimmed,
  );
}

function isStartTask(line: string): boolean {
  return /^\s*start\s+task\b/.test(line);
}
function isEndTask(line: string): boolean {
  return /^\s*end\s+task\b/.test(line);
}

function firstVerb(line: string): string | null {
  const t = line.trim();
  if (t.length === 0 || t.startsWith("//")) return null;

  // Try multi-word starters first (ordered by longest to shortest)
  const multi = [
    "dispatch task",
    "await run",
    "detached run",
    "start task",
    "end task",
    "turn on",
    "turn off",
    "go to",
    "back off",
    "set speed",
    "at time",
    "plan path",
    "plan grasp",
  ];
  for (const m of multi) {
    if (
      t.startsWith(m + " ") ||
      t === m ||
      t.startsWith(m + ":") ||
      t.startsWith(m + '"')
    ) {
      return m;
    }
  }

  // token + space/punctuation
  const m1 = /^([A-Za-z][A-Za-z\-]*)\b/.exec(t);
  return m1?.[1] ?? null;
}

/* ============================================================================
 * 6. Diagnostics
 * ==========================================================================*/

async function validateTextDocument(doc: TextDocument): Promise<void> {
  const diagnostics: Diagnostic[] = [];

  // 6.1 Missing colon on block headers
  if (globalSettings.lint.missingColon.severity !== "off") {
    for (let i = 0; i < doc.lineCount; i++) {
      const text = lineAt(doc, i);
      if (endsWithColonCandidate(text) && !text.trim().endsWith(":")) {
        const sev = toSeverity(globalSettings.lint.missingColon.severity)!;
        diagnostics.push({
          severity: sev,
          message: "Block header should end with ':'",
          source: "roop",
          range: makeRange(i, 0, text.length),
        });
      }
    }
  }

  // 6.2 Unbalanced 'start task' / 'end task'
  if (globalSettings.lint.unbalancedTask.severity !== "off") {
    let starts = 0,
      ends = 0;
    for (let i = 0; i < doc.lineCount; i++) {
      const t = lineAt(doc, i);
      if (isStartTask(t)) starts++;
      if (isEndTask(t)) ends++;
    }
    if (starts !== ends) {
      const sev = toSeverity(globalSettings.lint.unbalancedTask.severity)!;
      diagnostics.push({
        severity: sev,
        message: `Unbalanced tasks: found ${starts} 'start task' and ${ends} 'end task'.`,
        source: "roop",
        range: makeRange(0, 0, Math.max(1, lineAt(doc, 0).length)),
      });
    }
  }

  // 6.3 Unknown or unsupported top-level verb (soft hint)
  for (let i = 0; i < doc.lineCount; i++) {
    const raw = lineAt(doc, i);
    const text = raw.trim();
    if (
      !text ||
      text.startsWith("//") ||
      text.startsWith('"') ||
      text.startsWith("'")
    )
      continue;

    const v = firstVerb(text);
    if (!v) continue;

    let ok = SINGLE_WORD_STARTERS.has(v) || ALL_MULTIWORD_STARTERS.has(v);
    if (!ok && globalSettings.completion?.extraKeywords?.length) {
      ok = globalSettings.completion!.extraKeywords!.includes(v);
    }

    if (!ok) {
      diagnostics.push({
        severity: DiagnosticSeverity.Hint,
        message: `Unrecognized leading verb '${v}'.`,
        source: "roop",
        range: makeRange(i, raw.indexOf(v), raw.indexOf(v) + v.length),
      });
    }
  }

  connection.sendDiagnostics({ uri: doc.uri, diagnostics });
}

/* ============================================================================
 * 7. Completion
 * ==========================================================================*/

connection.onCompletion(
  (params: TextDocumentPositionParams): CompletionItem[] => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];

    const pos = params.position;
    const lineText = lineAt(doc, pos.line);
    const tillCursor = lineText.slice(0, pos.character);

    const items: CompletionItem[] = [];
    const push = (
      label: string,
      kind: CompletionItemKind,
      detail?: string,
      insertText?: string,
      sort = "z",
    ) => {
      const item: CompletionItem = {
        label,
        kind,
        sortText: sort,
      };
      if (detail !== undefined) {
        item.detail = detail;
      }
      if (insertText !== undefined) {
        item.insertText = insertText;
      }
      const doc = DOCS[label];
      if (doc) {
        item.documentation = { kind: MarkupKind.Markdown, value: doc };
      }
      items.push(item);
    };

    // 7.1 Context-aware snippets
    if (/^\s*$/.test(tillCursor)) {
      // High-value starters
      push(
        "start task",
        CompletionItemKind.Snippet,
        "Begin a task",
        'start task "${1:TaskName}"\n\t$0\nend task',
        "a",
      );
      push(
        "when",
        CompletionItemKind.Keyword,
        "Event-triggered block",
        "when ${1:predicate}:\n\t$0",
        "b",
      );
      push(
        "if",
        CompletionItemKind.Keyword,
        "Conditional block",
        "if ${1:condition}:\n\t$0",
        "c",
      );
      push(
        "parallel",
        CompletionItemKind.Keyword,
        "Parallel block",
        "parallel:\n\t$0",
        "d",
      );
      push(
        "repeat",
        CompletionItemKind.Keyword,
        "Repeat block",
        "repeat ${1:3} times:\n\t$0",
        "e",
      );
    }

    if (/\bon\s+$/.test(tillCursor)) {
      for (const e of EVENTS)
        push(
          `on ${e}:`,
          CompletionItemKind.Keyword,
          "Event branch",
          `on ${e}:\n\t$0`,
          "a",
        );
    }

    if (/\buse\s+$/.test(tillCursor)) {
      push(
        "use module",
        CompletionItemKind.Keyword,
        "Declare a capability module",
        'use module "${1:ModuleName}"',
        "a",
      );
    }

    if (/\brepeat\s+\d*\s*$/.test(tillCursor)) {
      push(
        "repeat N times:",
        CompletionItemKind.Snippet,
        "Fixed-count loop",
        "repeat ${1:3} times:\n\t$0",
        "a",
      );
    }

    if (/\bif\s+$/.test(tillCursor)) {
      push(
        'if object "type" with color "c" is on "Area":',
        CompletionItemKind.Snippet,
        "Perceptual condition",
        'if object "${1:mug}" with color "${2:red}" is on "${3:Table}":\n\t$0',
        "a",
      );
    }

    if (/\bat\s+time\s*$/.test(tillCursor)) {
      push(
        'at time "HH:MM":',
        CompletionItemKind.Snippet,
        "Time trigger",
        'at time "${1:08:00}":\n\t$0',
        "a",
      );
    }

    // 7.2 Action catalog completions
    for (const [cat, verbs] of Object.entries(ACTIONS)) {
      for (const v of verbs) {
        const label = v;
        const detail = `${cat} action`;
        let insert = v;
        // Provide friendly insert texts for common verbs
        if (v === "say") insert = 'say "${1:text}"';
        else if (v === "display")
          insert = 'display "${1:text}" on "${2:Panel}"';
        else if (v === "notify") insert = 'notify user "${1:message}"';
        else if (v === "ask") insert = 'ask "${1:question}" as ${2:variable}';
        else if (v === "expect")
          insert = 'expect ${1:object "name"} within ${2:10} seconds';
        else if (v === "wait for") insert = "wait for ${1:event}";
        else if (v === "move") insert = 'move ${1:Arm1} to ${2:"Target"}';
        else if (v === "grasp") insert = "grasp with ${1:Gripper1}";
        else if (v === "release") insert = "release with ${1:Gripper1}";
        else if (v === "detect")
          insert =
            'let ${1:var} = object "${2:type}" with ${3:attribute} "${4:value}"';
        else if (v === "track")
          insert = "track position of ${1:target} as ${2:var}";
        else if (v === "plan path")
          insert = "plan path from ${1:Arm1} to ${2:Target}";
        else if (v === "plan grasp") insert = "plan grasp for ${1:Target}";
        push(label, CompletionItemKind.Function, detail, insert);
      }
    }

    // 7.3 Events and directives
    for (const d of DIRECTIVES)
      push(d, CompletionItemKind.Keyword, "Directive");
    for (const s of STRUCTURAL)
      push(s, CompletionItemKind.Keyword, "Structural");

    // Operators as text suggestions
    for (const op of OPERATORS) {
      push(op, CompletionItemKind.Operator, "Operator");
    }

    // Extra keywords configured by users
    const extras = globalSettings.completion?.extraKeywords || [];
    for (const x of extras)
      push(x, CompletionItemKind.Keyword, "Custom keyword");

    return items;
  },
);

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  if (!item.documentation) {
    const doc = DOCS[item.label];
    if (doc) {
      item.documentation = { kind: MarkupKind.Markdown, value: doc };
    }
  }
  return item;
});

/* ============================================================================
 * 8. Hover (inline help)
 * ==========================================================================*/

connection.onHover((params): Hover | null => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const range = getWordRangeAt(doc, params.position);
  const word = doc.getText(range);

  // Try multi-word around cursor by peeking left/right tokens
  const line = lineAt(doc, params.position.line).trim();
  const candidates = new Set<string>([
    word,
    extractAround(line, word, [
      "turn on",
      "turn off",
      "go to",
      "back off",
      "plan path",
      "plan grasp",
      "await run",
      "detached run",
      "start task",
      "end task",
    ]),
  ]);

  for (const key of candidates) {
    if (!key) continue;
    const doc = DOCS[key];
    if (doc) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**${key}** — ${doc}`,
        },
      };
    }
  }
  return null;
});

function extractAround(line: string, focus: string, phrases: string[]): string {
  for (const p of phrases) {
    if (line.includes(p) && p.includes(focus)) return p;
  }
  return "";
}

/* ============================================================================
 * 9. Document symbols (task outline and templates)
 * ==========================================================================*/

connection.onDocumentSymbol((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const symbols: DocumentSymbol[] = [];
  const stack: { name: string; startLine: number; kind: SymbolKind }[] = [];

  for (let i = 0; i < doc.lineCount; i++) {
    const text = lineAt(doc, i);

    const taskMatch = /^\s*start\s+task\s+"([^"]+)"/.exec(text);
    if (taskMatch?.[1]) {
      stack.push({ name: taskMatch[1], startLine: i, kind: SymbolKind.Module });
      continue;
    }
    const templateMatch = /^\s*template\s+task\s+"([^"]+)":/.exec(text);
    if (templateMatch?.[1]) {
      stack.push({
        name: `(template) ${templateMatch[1]}`,
        startLine: i,
        kind: SymbolKind.Class,
      });
      continue;
    }
    if (/^\s*end\s+task\b/.test(text)) {
      const last = stack.pop();
      if (last) {
        symbols.push({
          name: last.name,
          kind: last.kind,
          range: Range.create(
            Position.create(last.startLine, 0),
            Position.create(i, lineAt(doc, i).length),
          ),
          selectionRange: Range.create(
            Position.create(last.startLine, 0),
            Position.create(last.startLine, lineAt(doc, last.startLine).length),
          ),
          children: [],
        });
      }
    }
  }

  // Close any unterminated blocks at EOF for outline purposes
  const eofLine = doc.lineCount - 1;
  while (stack.length) {
    const last = stack.pop()!;
    symbols.push({
      name: last.name,
      kind: last.kind,
      range: Range.create(
        Position.create(last.startLine, 0),
        Position.create(eofLine, lineAt(doc, eofLine).length),
      ),
      selectionRange: Range.create(
        Position.create(last.startLine, 0),
        Position.create(last.startLine, lineAt(doc, last.startLine).length),
      ),
      children: [],
    });
  }

  return symbols;
});

/* ============================================================================
 * 10. Folding ranges
 * ==========================================================================*/

connection.onFoldingRanges((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const folds: FoldingRange[] = [];

  function pushFold(start: number, end: number, kind?: FoldingRangeKind) {
    if (end > start) {
      folds.push(FoldingRange.create(start, end, undefined, undefined, kind));
    }
  }

  // Task folds
  let taskStart: number | null = null;
  for (let i = 0; i < doc.lineCount; i++) {
    const t = lineAt(doc, i);
    if (/^\s*start\s+task\b/.test(t)) {
      taskStart = i;
    } else if (/^\s*end\s+task\b/.test(t)) {
      if (taskStart !== null) {
        pushFold(taskStart, i, FoldingRangeKind.Region);
        taskStart = null;
      }
    }
  }

  // Block folds (when/on/if/elseif/else/repeat/while/for/parallel/template task)
  const stack: number[] = [];
  for (let i = 0; i < doc.lineCount; i++) {
    const t = lineAt(doc, i).trim();
    if (
      /^(when\b.*:|on\s+\w+\s*:|if\b.*:|elseif\b.*:|else\s*:|repeat\b.*:|while\b.*:|for\b.*:|parallel\s*:|template\s+task\b.*:)$/.test(
        t,
      )
    ) {
      stack.push(i);
    } else if (/^\s*$/.test(t)) {
      // close on blank lines for stability
      if (stack.length) {
        const s = stack.pop()!;
        pushFold(s, i - 1);
      }
    }
  }
  // Close any remaining blocks at EOF
  const eof = doc.lineCount - 1;
  while (stack.length) {
    pushFold(stack.pop()!, eof);
  }

  return folds;
});

/* ============================================================================
 * 11. Formatting (indentation and block headers)
 * ==========================================================================*/

connection.onDocumentFormatting((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc || !globalSettings.format.enabled) return [];

  const indentSize = globalSettings.format.indentSize;
  const lines: string[] = [];
  let level = 0;

  for (let i = 0; i < doc.lineCount; i++) {
    let t = lineAt(doc, i);
    const trimmed = t.trim();

    // Pre-decrease for certain tokens
    if (/^end\s+task\b/.test(trimmed)) {
      level = Math.max(0, level - 1);
    } else if (/^(elseif\b.*:|else\s*:)$/.test(trimmed)) {
      level = Math.max(0, level - 1);
    }

    const pad = " ".repeat(level * indentSize);
    // Ensure colon on common block headers if missing (non-destructive)
    if (endsWithColonCandidate(trimmed) && !trimmed.endsWith(":")) {
      t = pad + trimmed + ":";
    } else {
      t = pad + trimmed;
    }
    lines.push(t);

    // Post-increase for block starters
    if (/^start\s+task\b/.test(trimmed)) {
      level++;
    } else if (
      /^(when\b.*:|on\s+\w+\s*:|if\b.*:|elseif\b.*:|else\s*:|repeat\b.*:|while\b.*:|for\b.*:|parallel\s*:|template\s+task\b.*:)$/.test(
        trimmed,
      )
    ) {
      level++;
    }
  }

  const fullRange = Range.create(
    Position.create(0, 0),
    doc.positionAt(doc.getText().length),
  );
  return [TextEdit.replace(fullRange, lines.join("\n"))];
});

/* ============================================================================
 * 12. Code actions (quick fixes)
 * ==========================================================================*/

connection.onCodeAction((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const fixes: CodeAction[] = [];

  for (const d of params.context.diagnostics) {
    if (d.message === "Block header should end with ':'") {
      const line = d.range.start.line;
      const text = lineAt(doc, line);
      const edit = TextEdit.replace(
        makeRange(line, 0, text.length),
        text.trimEnd() + ":",
      );
      fixes.push({
        title: "Add ':' to block header",
        kind: CodeActionKind.QuickFix,
        diagnostics: [d],
        edit: { changes: { [doc.uri]: [edit] } },
      });
    }
  }
  return fixes;
});

/* ============================================================================
 * 13. Document lifecycle hooks and main
 * ==========================================================================*/

documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});
documents.onDidOpen((e) => {
  validateTextDocument(e.document);
});
documents.onDidSave((e) => {
  validateTextDocument(e.document);
});

documents.listen(connection);
connection.listen();
