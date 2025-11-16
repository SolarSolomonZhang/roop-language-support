/**
 * ROOP Language Support — VS Code Extension Entry
 *
 * Table of Contents
 *  1. Imports and Globals
 *  2. Activation
 *     2.1 Language Client Bootstrapping (LSP)
 *     2.2 Output Channel and Tracing
 *     2.3 File Watchers (schemas and modules)
 *  3. Commands
 *     3.1 roop.insertTask — Insert Task Block
 *     3.2 roop.newProject — Create Example Project
 *     3.3 roop.openDocs — Open Language Reference
 *     3.4 roop.runTask — Run Current Task
 *     3.5 roop.validateDocument — Validate Current Document
 *     3.6 roop.scanModules — Scan and Register Modules
 *     3.7 roop.generateModuleManifest — Generate .roopmodule.json
 *  4. Client-Side Fallback Features (used if the server does not provide them)
 *     4.1 Completion Provider (keywords, directives, actions)
 *     4.2 Hover Provider (keyword documentation)
 *     4.3 Document Formatter (minimal indentation & block header normalization)
 *  5. Utilities (scaffolding, file I/O, language helpers)
 *  6. Deactivation
 *
 * References for alignment of commands, activation events, menus, config, and language rules:
 *  - package.json (contributes.commands/menus/activationEvents, configuration, tasks, views). :contentReference[oaicite:0]{index=0}
 *  - language-configuration.json (indentation rules and onEnter patterns mirrored below). :contentReference[oaicite:1]{index=1}
 *  - language-reference.md (block headers, task structure, examples). :contentReference[oaicite:2]{index=2}
 *  - README.md (editor features, schema overview, example module). :contentReference[oaicite:3]{index=3}
 */

import * as vscode from "vscode";
import * as path from "path";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient | undefined;
let output: vscode.OutputChannel;
let diagnostics: vscode.DiagnosticCollection;

/* ------------------------------------------------------------------------------------------------
 * 1. Imports and Globals
 * --------------------------------------------------------------------------------------------- */

const LANGUAGE_ID = "roop";

// The repo ships language-reference.md at the root; fall back to docs/ if needed.
const PRIMARY_DOCS_REL = ["language-reference.md"];
const FALLBACK_DOCS_REL = ["docs", "language-reference.md"];

const SERVER_OUT_JS = ["out", "server.js"];

// These regexes mirror (and slightly generalize) the language-configuration indentation rules.
// increaseIndentPattern (headers that open a block) and decreaseIndentPattern (closers/branch realignment)
const INCREASE_INDENT_RE =
  /^\s*(?:(?:when|on|at|if|elseif|else|repeat|while|for|parallel|context|with\s+timeout|every|sync\s+when)\b.*:|(?:detached\s+run|await\s+run|run)\b.*:|template\s+task\b.*:|start\s+task\b.*(?::\s*)?$|fallback:)\s*$/i;

const DECREASE_INDENT_RE = /^\s*(?:end\s+task\b|elseif\b.*:|else:)\s*$/i;

// Lines that are block headers and should end with a colon (used by the formatter and validator).
const HEADER_MAY_REQUIRE_COLON_RE =
  /^\s*(?:when\b.*|on\b.*|at\b.*|if\b.*|elseif\b.*|else|repeat\b.*|while\b.*|for\b.*|parallel|context\b.*|with\s+timeout\b.*|every\b.*|sync\s+when\b.*|template\s+task\b.*|fallback)\s*:?\s*$/i;

const MODULE_GLOB = "**/*.roopmodule.json";

// Client-side keyword inventory (for fallback completion/hover).
const KEYWORDS = {
  directives: [
    "import",
    "include",
    "pragma",
    "use module",
    "define",
    "template task",
    "call",
    "start task",
    "end task",
  ],
  control: [
    "if",
    "elseif",
    "else",
    "when",
    "on",
    "at time",
    "with",
    "repeat",
    "while",
    "for",
    "parallel",
    "await run",
    "detached run",
    "run",
    "assign",
    "dispatch",
    "synchronize",
    "break",
    "continue",
    "exit",
    "abort",
    "retry",
    "fallback",
  ],
  exceptions: [
    "on failure",
    "on success",
    "on timeout",
    "on deviation",
    "on interruption",
  ],
  variables: ["let", "set", "context"],
  io: ["say", "display", "notify", "log", "ask", "expect", "wait for"],
  sensing: [
    "observe",
    "detect",
    "scan",
    "track",
    "measure",
    "count",
    "estimate",
    "recognize",
    "classify",
    "locate",
  ],
  manipulation: [
    "move",
    "navigate",
    "follow",
    "approach",
    "retreat",
    "rotate",
    "tilt",
    "grasp",
    "release",
    "pick",
    "place",
    "pour",
    "scoop",
    "stir",
    "mix",
    "shake",
    "push",
    "pull",
    "press",
    "twist",
    "cut",
    "slice",
    "peel",
    "fold",
    "unfold",
    "open",
    "close",
    "lock",
    "unlock",
    "attach",
    "detach",
    "insert",
    "remove",
    "stack",
    "unstack",
    "sort",
    "align",
    "center",
    "calibrate",
  ],
  environment: [
    "turn on",
    "turn off",
    "toggle",
    "dim",
    "brighten",
    "heat",
    "cool",
    "start",
    "stop",
    "pause",
    "resume",
    "activate",
    "deactivate",
    "enable",
    "disable",
    "sanitize",
    "disinfect",
    "clean",
    "wipe",
    "wash",
    "dry",
    "sweep",
    "vacuum",
    "mop",
    "water",
    "feed",
    "charge",
    "dock",
    "undock",
    "ventilate",
  ],
  multimedia: [
    "play",
    "pause media",
    "resume media",
    "stop media",
    "record",
    "capture image",
    "stream video",
  ],
  multiAgent: [
    "assign",
    "dispatch",
    "synchronize",
    "coordinate",
    "handover",
    "handoff",
  ],
  testing: ["testcase", "simulate", "expect"],
} as const;

const KEYWORD_DOCS: Record<string, string> = {
  "start task": "Begin a named task block. Must be closed with end task.",
  "end task": "Close the current start task block.",
  "use module":
    "Declare a capability-bearing module used by subsequent actions.",
  when: "Event-driven trigger. Executes the following block when the condition becomes true.",
  on: "Outcome-driven branch (e.g., on failure:) attached to the preceding action or block.",
  if: "Conditional branch evaluated immediately.",
  elseif: "Additional conditional branch appended to an if block.",
  else: "Fallback branch when previous conditions are not met.",
  repeat: "Fixed-count loop. Example: repeat 3 times:",
  while:
    'Condition-driven loop. Example: while object "trash" exists on "Floor":',
  for: "Sequence iteration over a list or detection set.",
  parallel:
    "Run multiple tasks or blocks concurrently with resource-aware scheduling.",
  "await run": "Start a task and wait until it completes before proceeding.",
  "detached run":
    "Start a task and continue immediately without waiting for completion.",
  run: "Invoke another task (synchronously unless used with await or detached).",
  retry: "Retry the previous action or block, optionally after a delay.",
  abort: "Abort the current task with cleanup.",
  fallback: "Define a degraded alternative plan when the primary action fails.",
  let: "Declare and bind a variable to a value or semantic reference.",
  say: "Speak text to the user via the speech module.",
  ask: "Ask the user a question and bind the response to a variable.",
  expect:
    "Expect an event or value within a time window; supports on timeout: handling.",
  "wait for": "Suspend until a specified event becomes true.",
  grasp: "Close a gripper on a target object.",
  release: "Open a gripper to let go of a held object.",
  move: "Move a module (arm/base) to a position, object, or referenced pose.",
  navigate: "Navigate a mobile base to a named area or coordinates.",
  "turn on": "Power on or enable a device or module.",
  "turn off": "Power off or disable a device or module.",
  testcase:
    "Begin a test case for a target task; supports simulate/expect clauses.",
  simulate: "Inject a percept, state, or context for testing.",
};

/* ------------------------------------------------------------------------------------------------
 * 2. Activation
 * --------------------------------------------------------------------------------------------- */

export async function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("ROOP");
  diagnostics = vscode.languages.createDiagnosticCollection(LANGUAGE_ID);
  context.subscriptions.push(output, diagnostics);
  output.appendLine("[ROOP] Activating extension…");

  // 2.1 Language Client Bootstrapping (LSP)
  const clientDisposable = await startLanguageClient(context);
  if (clientDisposable) {
    context.subscriptions.push(clientDisposable);
  }

  // 2.2 Output Channel and Tracing
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("roop")) {
        output.appendLine("[ROOP] Configuration changed; notifying server…");
        await client?.sendNotification("workspace/didChangeConfiguration", {});
      }
    }),
  );

  // 2.3 File Watchers (schemas and modules)
  // Watch for module manifest presence to drive viewsWelcome and inform the server.
  const moduleWatcher = vscode.workspace.createFileSystemWatcher(MODULE_GLOB);
  moduleWatcher.onDidCreate((uri) => notifyServerFileEvent("created", uri));
  moduleWatcher.onDidChange((uri) => notifyServerFileEvent("changed", uri));
  moduleWatcher.onDidDelete((uri) => notifyServerFileEvent("deleted", uri));
  context.subscriptions.push(moduleWatcher);

  // Optional: watch workspace-level schema files to let a custom server react if needed.
  const schemaWatcher = vscode.workspace.createFileSystemWatcher(
    "**/schemas/**/*.json",
  );
  schemaWatcher.onDidChange((uri) => notifyServerFileEvent("changed", uri));
  schemaWatcher.onDidCreate((uri) => notifyServerFileEvent("created", uri));
  schemaWatcher.onDidDelete((uri) => notifyServerFileEvent("deleted", uri));
  context.subscriptions.push(schemaWatcher);

  // Initial context for modules view
  await updateModulesContext();

  // 3. Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("roop.insertTask", insertTaskCommand),
    vscode.commands.registerCommand("roop.newProject", newProjectCommand),
    vscode.commands.registerCommand("roop.openDocs", () => openDocs(context)),

    // Newly implemented and registered commands to match package.json
    vscode.commands.registerCommand("roop.runTask", runCurrentTask),
    vscode.commands.registerCommand(
      "roop.validateDocument",
      validateActiveDocument,
    ),
    vscode.commands.registerCommand("roop.scanModules", async () => {
      await updateModulesContext(true);
    }),
    vscode.commands.registerCommand(
      "roop.generateModuleManifest",
      generateModuleManifest,
    ),
  );

  // === add begin: register "ROOP: Validate Current Document" ===
  // 简单本地校验器：检查常见块头是否以 ":" 结尾，并在 Problems 面板给出提示
  const ROOP_LANG_ID = "roop";
  const roopDiagnostics = vscode.languages.createDiagnosticCollection("roop");
  context.subscriptions.push(roopDiagnostics);

  async function validateCurrentRoopDoc() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== ROOP_LANG_ID) {
      vscode.window.showWarningMessage("Open a ROOP (.roop) file to validate.");
      return;
    }

    const doc = editor.document;
    const text = doc.getText();
    const lines = text.split(/\r?\n/);

    // 可能作为块头的关键字（可按需增减）
    const headerRe =
      /^(when|on|if|elseif|else|repeat|while|for|parallel|task|start task|template task)\b.*$/i;

    const diags: vscode.Diagnostic[] = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i]; // raw: string | undefined
      if (raw == null) continue; // changed: 防御性判空，修复 TS18048
      const trimmed = raw.trim(); // changed: 现在 raw 被缩小为 string

      if (headerRe.test(trimmed) && !trimmed.endsWith(":")) {
        const range = new vscode.Range(i, 0, i, raw.length); // changed: raw 为 string，安全
        diags.push(
          new vscode.Diagnostic(
            range,
            "Missing ':' at end of block header",
            vscode.DiagnosticSeverity.Warning,
          ),
        );
      }
    }

    roopDiagnostics.set(doc.uri, diags);
    vscode.window.setStatusBarMessage(
      diags.length
        ? `ROOP: ${diags.length} issue(s) found.`
        : "ROOP: No problems.",
      3000,
    );
  }

  // 注册命令（与 package.json 的 contributes.commands 保持一致）
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "roop.validateDocument",
      validateCurrentRoopDoc,
    ),
  );
  // === add end ===

  // 4. Client-side fallback features
  registerFallbackFeatures(context);

  output.appendLine("[ROOP] Extension activated.");
}

async function startLanguageClient(
  context: vscode.ExtensionContext,
): Promise<vscode.Disposable | undefined> {
  try {
    const serverModule = context.asAbsolutePath(path.join(...SERVER_OUT_JS));
    const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

    const serverOptions: ServerOptions = {
      run: { module: serverModule, transport: TransportKind.ipc },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: debugOptions,
      },
    };

    const cfg = vscode.workspace.getConfiguration("roop");

    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: "file", language: LANGUAGE_ID },
        { scheme: "untitled", language: LANGUAGE_ID },
      ],
      synchronize: {
        fileEvents: [
          vscode.workspace.createFileSystemWatcher("**/*.roop"),
          vscode.workspace.createFileSystemWatcher(MODULE_GLOB),
        ],
      },
      initializationOptions: {
        format: {
          enabled: cfg.get<boolean>("format.enabled", true),
          indentSize: cfg.get<number>("format.indentSize", 2),
        },
        lint: {
          missingColon: cfg.get<"hint" | "warning" | "error" | "off">(
            "lint.missingColon.severity",
            "hint",
          ),
          unbalancedTask: cfg.get<"hint" | "warning" | "error" | "off">(
            "lint.unbalancedTask.severity",
            "warning",
          ),
        },
        validation: {
          enable: cfg.get<boolean>("validation.enable", true),
          maxProblems: cfg.get<number>("validation.maxProblems", 200),
        },
        server: {
          trace: cfg.get<"off" | "messages" | "verbose">("server.trace", "off"),
          extraArgs: cfg.get<string[]>("server.extraArgs", []),
        },
      },
      outputChannel: output,
      traceOutputChannel: output,
    };

    client = new LanguageClient(
      "roopLanguageServer",
      "ROOP Language Server",
      serverOptions,
      clientOptions,
    );
    output.appendLine("[ROOP] Language server starting…");
    await client.start();
    output.appendLine("[ROOP] Language server ready.");
    return new vscode.Disposable(() => {
      void client?.stop();
    });
  } catch (err: any) {
    output.appendLine(
      `[ROOP] Failed to start language server: ${err?.message ?? String(err)}`,
    );
    return undefined;
  }
}

function notifyServerFileEvent(
  kind: "created" | "changed" | "deleted",
  uri: vscode.Uri,
) {
  output.appendLine(`[ROOP] File ${kind}: ${uri.fsPath}`);
  void vscode.commands.executeCommand(
    "setContext",
    "roop.hasModules",
    undefined,
  ); // ensure context is refreshed by scan
  client?.sendNotification("roop/moduleFileEvent", {
    kind,
    uri: uri.toString(),
  });
}

/* ------------------------------------------------------------------------------------------------
 * 3. Commands
 * --------------------------------------------------------------------------------------------- */

// 3.1 Insert Task Block
async function insertTaskCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== LANGUAGE_ID) {
    vscode.window.showInformationMessage(
      "Open a ROOP file to insert a task block.",
    );
    return;
  }

  const name = await vscode.window.showInputBox({
    title: "Task Name",
    prompt: "Enter the name of the task to insert",
    placeHolder: "ServeDrink",
    value: "NewTask",
  });
  if (!name) return;

  const snippet = new vscode.SnippetString(
    [
      `start task "${name}"`,
      '  // use module "Arm1"',
      '  // use module "Gripper1"',
      '  say "${1:Task initialized.}"',
      "end task",
      "",
    ].join("\n"),
  );
  await editor.insertSnippet(snippet, editor.selection.active);
}

// 3.2 Create Example Project
async function newProjectCommand() {
  const folder = await ensureWorkspaceFolder();
  if (!folder) return;

  const root = folder.uri;
  const targetDir = vscode.Uri.joinPath(root, "roop-examples");
  await ensureDir(targetDir);

  const files: Array<{ rel: string; content: string }> = [
    {
      rel: "basic.roop",
      content: [
        'start task "Hello"',
        '  say "Hello from ROOP"',
        "end task",
        "",
      ].join("\n"),
    },
    {
      rel: "events.roop",
      content: [
        'start task "EventDemo"',
        '  use module "Camera1"',
        '  use module "Speaker"',
        "",
        '  when object "human" appears:',
        '    say "Welcome!"',
        "",
        "  on failure:",
        '    say "Event handling failed."',
        "end task",
        "",
      ].join("\n"),
    },
    {
      rel: "control_flow.roop",
      content: [
        'start task "ControlFlow"',
        "  let attempts = 0",
        '  if surface "Table" is clear:',
        '    say "Table is clear."',
        "  else:",
        '    say "Table is cluttered."',
        "",
        "  repeat 2 times:",
        '    say "Blinking lights."',
        "",
        '  while object "trash" exists on "Floor":',
        '    say "Cleaning…"',
        "    break",
        "end task",
        "",
      ].join("\n"),
    },
    {
      rel: "concurrency.roop",
      content: [
        'start task "ConcurrentOps"',
        "  parallel:",
        '    run "ScanRoom"',
        '    detached run "WatchForVisitors"',
        '  await run "MoveTrayToCounter"',
        '  say "Tray delivered."',
        "end task",
        "",
      ].join("\n"),
    },
    {
      rel: "modules/ExampleArm.roopmodule.json",
      content: createManifestSkeleton({
        id: "loop.arm.v1",
        name: "6-DoF Robotic Arm",
        vendor: "Loop Robotics",
        category: "manipulation",
      }),
    },
  ];

  for (const f of files) {
    const uri = vscode.Uri.joinPath(targetDir, f.rel);
    await writeFileIfAbsent(uri, f.content);
  }

  vscode.window.showInformationMessage(
    `ROOP example project created in ${targetDir.fsPath}`,
  );
  const doc = await vscode.workspace.openTextDocument(
    vscode.Uri.joinPath(targetDir, "basic.roop"),
  );
  await vscode.window.showTextDocument(doc, { preview: false });

  // Refresh module context
  await updateModulesContext();
}

// 3.3 Open Language Reference
async function openDocs(context: vscode.ExtensionContext) {
  let candidate = vscode.Uri.joinPath(
    context.extensionUri,
    ...PRIMARY_DOCS_REL,
  );
  try {
    await vscode.workspace.fs.stat(candidate);
  } catch {
    const alt = vscode.Uri.joinPath(context.extensionUri, ...FALLBACK_DOCS_REL);
    try {
      await vscode.workspace.fs.stat(alt);
      candidate = alt;
    } catch {
      // Fall back to homepage if bundled docs are missing.
      await vscode.env.openExternal(
        vscode.Uri.parse("https://example.com/roop-vscode"),
      );
      return;
    }
  }

  const doc = await vscode.workspace.openTextDocument(candidate);
  await vscode.window.showTextDocument(doc, { preview: false });
}

// 3.4 Run Current Task
async function runCurrentTask() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== LANGUAGE_ID) {
    vscode.window.showInformationMessage("Open a ROOP file to run a task.");
    return;
  }

  const doc = editor.document;
  const tasks = parseTasks(doc);

  if (tasks.length === 0) {
    vscode.window.showWarningMessage("No tasks found in the current document.");
    return;
  }

  const cursorLine = editor.selection.active.line;
  let selected = tasks.find(
    (t) => cursorLine >= t.startLine && cursorLine <= t.endLine,
  );

  if (!selected) {
    const pick = await vscode.window.showQuickPick(
      tasks.map((t) => ({
        label: t.name,
        description: `${path.basename(doc.fileName)}:${t.startLine + 1}–${t.endLine + 1}`,
        task: t,
      })),
      { placeHolder: "Select a task to run" },
    );
    if (!pick) return;
    selected = pick.task;
  }

  if (doc.isDirty) {
    await doc.save();
  }

  // Try to execute a workspace task of type "roop" with command "run".
  const all = await vscode.tasks.fetchTasks();
  const roopRun = all.find((t) => {
    const def: any = t.definition;
    return (
      def?.type === "roop" && (def?.command === "run" || /run/i.test(t.name))
    );
  });

  if (roopRun) {
    output.appendLine(
      `[ROOP] Executing workspace task "${roopRun.name}" for "${selected.name}"…`,
    );
    await vscode.tasks.executeTask(roopRun);
  } else {
    const term = getOrCreateTerminal("ROOP Runner");
    term.show(true);
    term.sendText(
      `echo Running task "${selected.name}" from ${quote(doc.fileName)} lines ${selected.startLine + 1}-${selected.endLine + 1}`,
    );
    term.sendText(
      'echo (No workspace task of type "roop" was found. Define one to integrate with your toolchain.)',
    );
  }

  vscode.window.setStatusBarMessage(`ROOP: Running "${selected.name}"`, 2000);
}

// 3.5 Validate Current Document
async function validateActiveDocument() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== LANGUAGE_ID) {
    return;
  }
  await validateDocument(editor.document, true);
}

// 3.6 Scan and Register Modules
async function updateModulesContext(showMessage = false) {
  const uris = await vscode.workspace.findFiles(
    MODULE_GLOB,
    "**/{node_modules,.git}/**",
    1000,
  );
  const hasModules = uris.length > 0;
  await vscode.commands.executeCommand(
    "setContext",
    "roop.hasModules",
    hasModules,
  );
  if (showMessage) {
    vscode.window.showInformationMessage(
      `Detected ${uris.length} .roopmodule.json file(s).`,
    );
  }
  output.appendLine(`[ROOP] Module manifests detected: ${uris.length}`);
}

// 3.7 Generate .roopmodule.json
async function generateModuleManifest() {
  const folder = await ensureWorkspaceFolder();
  if (!folder) return;

  const id = await vscode.window.showInputBox({
    title: "Module ID (e.g., vendor.device.v1)",
    value: "loop.arm.v1",
    validateInput: (v) => (v.trim() ? undefined : "Module ID is required."),
  });
  if (!id) return;

  const name = await vscode.window.showInputBox({
    title: "Module Name",
    value: "6-DoF Robotic Arm",
    validateInput: (v) => (v.trim() ? undefined : "Module name is required."),
  });
  if (!name) return;

  const vendor = await vscode.window.showInputBox({
    title: "Vendor",
    value: "Loop Robotics",
  });
  if (vendor === undefined) return;

  const category = await vscode.window.showInputBox({
    title: "Category (e.g., manipulation, perception, navigation)",
    value: "manipulation",
  });
  if (category === undefined) return;

  const fileName = await vscode.window.showInputBox({
    title: "File name",
    value: `${sanitizeFileName(name)}.roopmodule.json`,
    validateInput: (v) =>
      v.trim().endsWith(".roopmodule.json")
        ? undefined
        : "File name must end with .roopmodule.json",
  });
  if (!fileName) return;

  const target = vscode.Uri.joinPath(folder.uri, fileName);
  const content = createManifestSkeleton({ id, name, vendor, category });

  await vscode.workspace.fs.writeFile(target, Buffer.from(content, "utf8"));
  await vscode.window.showTextDocument(target, { preview: false });
  vscode.window.showInformationMessage(`Created ${fileName}`);

  await updateModulesContext();
}

/* ------------------------------------------------------------------------------------------------
 * 4. Client-Side Fallback Features
 * --------------------------------------------------------------------------------------------- */

function registerFallbackFeatures(context: vscode.ExtensionContext) {
  // 4.1 Completion Provider
  const completionItems = buildKeywordCompletions();
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    [
      { language: LANGUAGE_ID, scheme: "file" },
      { language: LANGUAGE_ID, scheme: "untitled" },
    ],
    {
      provideCompletionItems() {
        // Always provide static suggestions; language server will enrich/override where applicable.
        return new vscode.CompletionList(completionItems, true);
      },
    },
    ":",
    " ",
    '"',
  );
  context.subscriptions.push(completionProvider);

  // 4.2 Hover Provider
  const hoverProvider = vscode.languages.registerHoverProvider(LANGUAGE_ID, {
    provideHover(doc, position) {
      const range = doc.getWordRangeAtPosition(position, /[A-Za-z][\w-]*/);
      if (!range) return;
      const word = doc.getText(range).toLowerCase();
      const text = KEYWORD_DOCS[word];
      if (text) {
        return new vscode.Hover(new vscode.MarkdownString(text));
      }
      return;
    },
  });
  context.subscriptions.push(hoverProvider);

  // 4.3 Document Formatter
  const cfg = vscode.workspace.getConfiguration("roop");
  const formatEnabled = cfg.get<boolean>("format.enabled", true);
  if (formatEnabled) {
    const formatter = vscode.languages.registerDocumentFormattingEditProvider(
      LANGUAGE_ID,
      {
        provideDocumentFormattingEdits(document): vscode.TextEdit[] {
          const indentSize = Math.max(
            2,
            Math.min(8, cfg.get<number>("format.indentSize", 2)),
          );
          const edits: vscode.TextEdit[] = [];
          let indentLevel = 0;

          for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;

            // Normalize header colon
            let normalized = text;
            const mayBeHeader = HEADER_MAY_REQUIRE_COLON_RE.test(text.trim());
            const hasColon = /:\s*$/.test(text);
            if (mayBeHeader && !hasColon) {
              normalized = text.replace(/\s*$/, ":");
            }

            // Compute indentation
            const trimmed = normalized.trimStart();
            const isDecreasing = DECREASE_INDENT_RE.test(trimmed);
            if (isDecreasing && indentLevel > 0) {
              indentLevel--;
            }

            const desiredIndent = " ".repeat(indentLevel * indentSize);
            const rebuilt = desiredIndent + trimmed;
            if (rebuilt !== text) {
              const range = new vscode.Range(i, 0, i, line.text.length);
              edits.push(vscode.TextEdit.replace(range, rebuilt));
            }

            // Increase after headers and openers
            if (INCREASE_INDENT_RE.test(trimmed)) {
              indentLevel++;
            }
          }
          return edits;
        },
      },
    );
    context.subscriptions.push(formatter);
  }
}

/* ------------------------------------------------------------------------------------------------
 * 5. Utilities
 * --------------------------------------------------------------------------------------------- */

// Diagnostics: lightweight static validation mirroring configuration (missing colon, unbalanced tasks)
async function validateDocument(
  doc: vscode.TextDocument,
  showSummary: boolean,
) {
  if (doc.languageId !== LANGUAGE_ID) return;

  const cfg = vscode.workspace.getConfiguration("roop");
  const enabled = cfg.get<boolean>("validation.enable", true);
  if (!enabled) {
    diagnostics.delete(doc.uri);
    return;
  }

  const maxProblems = Math.max(
    1,
    cfg.get<number>("validation.maxProblems", 200),
  );
  const sevMissing = toSeverity(
    cfg.get<"hint" | "warning" | "error" | "off">(
      "lint.missingColon.severity",
      "hint",
    ),
  );
  const sevUnbalanced = toSeverity(
    cfg.get<"hint" | "warning" | "error" | "off">(
      "lint.unbalancedTask.severity",
      "warning",
    ),
  );

  const diags: vscode.Diagnostic[] = [];
  if (sevMissing) {
    diags.push(
      ...collectMissingColonDiagnostics(
        doc,
        sevMissing,
        maxProblems - diags.length,
      ),
    );
  }
  if (diags.length < maxProblems && sevUnbalanced) {
    diags.push(
      ...collectTaskBalanceDiagnostics(
        doc,
        sevUnbalanced,
        maxProblems - diags.length,
      ),
    );
  }

  diagnostics.set(doc.uri, diags);

  if (showSummary) {
    const errs = diags.filter(
      (d) => d.severity === vscode.DiagnosticSeverity.Error,
    ).length;
    const warns = diags.filter(
      (d) => d.severity === vscode.DiagnosticSeverity.Warning,
    ).length;
    vscode.window.setStatusBarMessage(
      `ROOP: ${errs} error(s), ${warns} warning(s)`,
      2500,
    );
  }
}

function collectMissingColonDiagnostics(
  doc: vscode.TextDocument,
  severity: vscode.DiagnosticSeverity,
  budget: number,
): vscode.Diagnostic[] {
  if (budget <= 0) return [];
  const out: vscode.Diagnostic[] = [];

  for (let i = 0; i < doc.lineCount && out.length < budget; i++) {
    const line = doc.lineAt(i);
    if (line.isEmptyOrWhitespace) continue;
    const text = stripLineComment(line.text).trim();
    if (!text) continue;

    const looksHeader = HEADER_MAY_REQUIRE_COLON_RE.test(text);
    const hasColon = /:\s*$/.test(text);

    if (looksHeader && !hasColon) {
      out.push(
        new vscode.Diagnostic(
          line.range,
          "Block header is missing a trailing ':'",
          severity,
        ),
      );
    }
  }
  return out;
}

function collectTaskBalanceDiagnostics(
  doc: vscode.TextDocument,
  severity: vscode.DiagnosticSeverity,
  budget: number,
): vscode.Diagnostic[] {
  if (budget <= 0) return [];
  const startRe = /^\s*start\s+task\b/i;
  const endRe = /^\s*end\s+task\b/i;

  const stack: { line: number }[] = [];
  const out: vscode.Diagnostic[] = [];

  for (let i = 0; i < doc.lineCount && out.length < budget; i++) {
    const text = stripLineComment(doc.lineAt(i).text);
    if (!text) continue;

    if (startRe.test(text)) {
      stack.push({ line: i });
    } else if (endRe.test(text)) {
      if (stack.length === 0) {
        out.push(
          new vscode.Diagnostic(
            doc.lineAt(i).range,
            '"end task" without a matching "start task".',
            severity,
          ),
        );
      } else {
        stack.pop();
      }
    }
  }

  while (stack.length > 0 && out.length < budget) {
    const unclosed = stack.pop()!;
    out.push(
      new vscode.Diagnostic(
        doc.lineAt(unclosed.line).range,
        '"start task" has no matching "end task".',
        severity,
      ),
    );
  }
  return out;
}

function toSeverity(
  s: "hint" | "warning" | "error" | "off",
): vscode.DiagnosticSeverity | 0 {
  switch (s) {
    case "hint":
      return vscode.DiagnosticSeverity.Hint;
    case "warning":
      return vscode.DiagnosticSeverity.Warning;
    case "error":
      return vscode.DiagnosticSeverity.Error;
    default:
      return 0;
  }
}

function stripLineComment(text: string): string {
  const idx = text.indexOf("//");
  return (idx >= 0 ? text.slice(0, idx) : text).trimEnd();
}

function parseTasks(
  doc: vscode.TextDocument,
): Array<{ name: string; startLine: number; endLine: number }> {
  const startRe = /^\s*start\s+task\s+"([^"]+)"\s*$/i;
  const endRe = /^\s*end\s+task\b/i;

  const tasks: Array<{ name: string; startLine: number; endLine: number }> = [];
  const stack: Array<{ name: string; startLine: number }> = [];

  for (let i = 0; i < doc.lineCount; i++) {
    const line = doc.lineAt(i);
    const text = stripLineComment(line.text);
    if (!text) continue;

    const start = text.match(startRe);
    if (start) {
      const name = start[1] ?? `Task@${i + 1}`;
      stack.push({ name, startLine: i });
      continue;
    }
    if (endRe.test(text)) {
      const open = stack.pop();
      if (open) {
        tasks.push({ name: open.name, startLine: open.startLine, endLine: i });
      }
    }
  }

  for (const open of stack) {
    tasks.push({
      name: open.name,
      startLine: open.startLine,
      endLine: doc.lineCount - 1,
    });
  }
  return tasks;
}

function getOrCreateTerminal(name: string): vscode.Terminal {
  const existing = vscode.window.terminals.find((t) => t.name === name);
  return existing ?? vscode.window.createTerminal({ name });
}

// function quote(s: string): string {
//   if (process.platform === 'win32') return `"${s.replace(/"/g, '\\"')}"`;
//   return `'${s.replace(/'/g, `'\\''`)}'`;
// }

function quote(s: string): string {
  if (process.platform === "win32") return `"${s.replace(/"/g, '\\"')}"`;
  return `'${s.replace(/'/g, "'\\''")}'`; // changed: 使用模板字符串并修正替换参数
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w\-.]+/g, "_");
}

function createManifestSkeleton(opts: {
  id: string;
  name: string;
  vendor?: string;
  category?: string;
}): string {
  const now = new Date().toISOString().slice(0, 10);
  const obj = {
    module: {
      id: opts.id,
      name: opts.name,
      version: "1.0.0",
      vendor: opts.vendor || "ACME Robotics",
      category: opts.category || "manipulation",
      created: now,
    },
    interfaces: {
      // Add transport bindings (ROS, gRPC, REST, Serial, MQTT…) as needed.
    },
    capabilities: [
      {
        id: "manipulation.move",
        verbs: ["move", "approach", "align"],
        parameters: [
          { name: "target", type: "pose", required: true },
          { name: "linearSpeed", type: "speed", unit: "m/s", default: 0.2 },
        ],
        returns: { type: "object" },
        resources: [{ name: "arm", kind: "arm", access: "exclusive" }],
        concurrency: { strategy: "queue", maxParallel: 1, mutexGroup: "arm" },
        safety: { emergencyStop: true, speedLimit: 0.2 },
      },
      {
        id: "manipulation.gripper",
        verbs: ["grasp", "release"],
        parameters: [
          { name: "gripper", type: "string", required: true },
          { name: "force", type: "number", unit: "N", default: 30 },
        ],
      },
    ],
    events: [],
    telemetry: [],
    profiles: [
      {
        name: "home",
        defaults: { linearSpeed: 0.15 },
        limits: { speedLimit: 0.25 },
      },
      {
        name: "factory",
        defaults: { linearSpeed: 0.4 },
        limits: { speedLimit: 0.6 },
      },
    ],
    testing: { smoke: "Move to Home; grasp and release." },
    examples: [
      {
        name: "Pick and place",
        roop: 'start task "PickAndPlace"\n  move Arm1 to "Tray"\nend task',
      },
    ],
  };
  return JSON.stringify(obj, null, 2) + "\n";
}

async function ensureDir(uri: vscode.Uri) {
  try {
    await vscode.workspace.fs.createDirectory(uri);
  } catch {
    // ignore
  }
}

async function writeFileIfAbsent(uri: vscode.Uri, content: string) {
  try {
    await vscode.workspace.fs.stat(uri);
    // exists; skip
  } catch {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
  }
}

async function ensureWorkspaceFolder(): Promise<
  vscode.WorkspaceFolder | undefined
> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showWarningMessage("Open a folder or workspace first.");
    return undefined;
  }
  if (folders.length === 1) return folders[0];
  const pick = await vscode.window.showWorkspaceFolderPick({
    placeHolder: "Select a folder",
  });
  return pick ?? folders[0];
}

/* ------------------------------------------------------------------------------------------------
 * 6. Deactivation
 * --------------------------------------------------------------------------------------------- */

export async function deactivate(): Promise<void> {
  diagnostics?.dispose();
  if (client) {
    await client.stop();
    client = undefined;
  }
  output?.dispose();
}

/* ------------------------------------------------------------------------------------------------
 * Completion inventory builder (with user-configurable extras)
 * --------------------------------------------------------------------------------------------- */

function buildKeywordCompletions(): vscode.CompletionItem[] {
  const items: vscode.CompletionItem[] = [];
  const cfgExtras = vscode.workspace
    .getConfiguration("roop")
    .get<string[]>("completion.extraKeywords", []);

  const push = (
    label: string,
    detail: string,
    insertText?: string | vscode.SnippetString,
    kind = vscode.CompletionItemKind.Keyword,
  ) => {
    const item = new vscode.CompletionItem(label, kind);
    item.detail = detail;
    item.insertText = insertText ?? label;
    item.filterText = label;
    items.push(item);
  };

  // Directives & structure
  KEYWORDS.directives.forEach((k) => push(k, "Directive / structural keyword"));
  // Control & flow
  KEYWORDS.control.forEach((k) => push(k, "Control flow / scheduling"));
  KEYWORDS.exceptions.forEach((k) => push(k, "Exception branch header"));
  KEYWORDS.variables.forEach((k) => push(k, "Variables and context"));
  // I/O & interaction
  KEYWORDS.io.forEach((k) => push(k, "User interaction / output"));
  // Sensing & perception
  KEYWORDS.sensing.forEach((k) => push(k, "Perception / sensing action"));
  // Manipulation & mobility
  KEYWORDS.manipulation.forEach((k) =>
    push(
      k,
      "Manipulation / mobility action",
      undefined,
      vscode.CompletionItemKind.Function,
    ),
  );
  // Environment
  KEYWORDS.environment.forEach((k) =>
    push(
      k,
      "Environment control",
      undefined,
      vscode.CompletionItemKind.Function,
    ),
  );
  // Multimedia
  KEYWORDS.multimedia.forEach((k) =>
    push(k, "Media control", undefined, vscode.CompletionItemKind.Function),
  );
  // Multi-agent
  KEYWORDS.multiAgent.forEach((k) =>
    push(
      k,
      "Multi-agent orchestration",
      undefined,
      vscode.CompletionItemKind.Function,
    ),
  );
  // Testing
  KEYWORDS.testing.forEach((k) => push(k, "Testing and validation"));

  // Common block skeletons as snippets
  items.push(
    makeSnippet("if …:", "if condition:", "if ${1:condition}:\n  ${0}"),
  );
  items.push(
    makeSnippet(
      "elseif …:",
      "elseif condition:",
      "elseif ${1:condition}:\n  ${0}",
    ),
  );
  items.push(makeSnippet("else:", "else branch", "else:\n  ${0}"));
  items.push(
    makeSnippet(
      "when …:",
      "event trigger",
      'when ${1:object "mug"} appears:\n  ${0}',
    ),
  );
  items.push(
    makeSnippet("on failure:", "failure branch", "on failure:\n  ${0}"),
  );
  items.push(
    makeSnippet("repeat …:", "repeat loop", "repeat ${1:3} times:\n  ${0}"),
  );
  items.push(
    makeSnippet("while …:", "while loop", "while ${1:condition}:\n  ${0}"),
  );
  items.push(
    makeSnippet(
      "for … in …:",
      "for loop",
      "for ${1:item} in ${2:list}:\n  ${0}",
    ),
  );
  items.push(
    makeSnippet(
      "parallel:",
      "parallel block",
      'parallel:\n  run "${1:TaskA}"\n  run "${2:TaskB}"\n',
    ),
  );
  items.push(
    makeSnippet(
      "template task …",
      "template declaration",
      'template task "${1:Name}" with (${2:param}):\n  ${0}\nend task',
    ),
  );
  items.push(
    makeSnippet(
      "start task …",
      "task declaration",
      'start task "${1:Name}"\n  ${0}\nend task',
    ),
  );
  items.push(
    makeSnippet(
      'use module "…"',
      "module declaration",
      'use module "${1:ModuleName}"',
    ),
  );

  // User-configurable extras
  for (const extra of cfgExtras ?? []) {
    push(extra, "User-defined keyword");
  }

  return items;
}

function makeSnippet(
  label: string,
  detail: string,
  body: string,
): vscode.CompletionItem {
  const item = new vscode.CompletionItem(
    label,
    vscode.CompletionItemKind.Snippet,
  );
  item.detail = detail;
  item.insertText = new vscode.SnippetString(body);
  return item;
}
