# LSP Design and Implementation Notes

This document describes the VS Code client and Language Server Protocol (LSP) implementation for the ROOP language, covering architecture, features, data flows, parsing strategy, diagnostics, formatting, code actions, performance, testing, and an extensibility roadmap.

## Table of Contents

1. Goals and Scope
2. Architecture Overview  
   2.1 Components  
   2.2 Process model and transport  
   2.3 File types handled and activation
3. Initialization and Settings  
   3.1 Client-to-server initialization  
   3.2 Configuration keys and dynamic updates  
   3.3 Workspace trust and capability flags
4. Document Lifecycle and Synchronization  
   4.1 open/change/save/close events  
   4.2 Incremental sync strategy  
   4.3 Debounce and batching
5. Parsing and Analysis Strategy  
   5.1 Tokenization assumptions  
   5.2 Line-based scanner and header detection  
   5.3 Indentation model and on-enter rules  
   5.4 Word pattern and selection behavior  
   5.5 Optional AST and behavior-graph hooks
6. Language Features Implemented  
   6.1 Completion  
   6.2 Hover  
   6.3 Diagnostics  
   6.4 Code actions  
   6.5 Formatting  
   6.6 Folding ranges  
   6.7 Document symbols and outline  
   6.8 Semantic tokens (optional)  
   6.9 Workspace symbols (optional)  
   6.10 Rename, go to definition, and references (planned)
7. Grammar, Blocks, and Semantics Recognized  
   7.1 Block headers and colons  
   7.2 Actions, entities, durations, numbers  
   7.3 Concurrency and triggers  
   7.4 Error-handling headers
8. JSON Validation for .roopmodule.json  
   8.1 Schema binding  
   8.2 Typical validation errors  
   8.3 Authoring tips
9. Performance Notes  
   9.1 Complexity and incremental updates  
   9.2 Memory and caching  
   9.3 Large-file strategies
10. Telemetry and Logging
11. Security and Workspace Trust
12. Commands, Views, and UX Integration
13. Testing Strategy and Automation
14. Extensibility Roadmap
15. Diagnostic Codes and Conventions
16. Settings Reference
17. File Associations and Activation Events
18. Appendix A: Key Regex Patterns
19. Appendix B: Minimal server skeleton

---

## 1. Goals and Scope

The goal of the ROOP LSP is to provide a fast, predictable, and safe authoring experience for _.roop_ scripts and _.roopmodule.json_ manifests. The feature set focuses on high-signal assistance (completion, hover, diagnostics, quick fixes, formatting, folding, symbols) while keeping the parsing model simple and robust for real-time editing.

## 2. Architecture Overview

### 2.1 Components

- VS Code client extension (TypeScript) responsible for activation, command registration, and starting the language client.
- Language server (TypeScript) implementing LSP features: completion, hover, diagnostics, formatting, folding, document symbols, code actions, and optional semantic tokens.
- JSON schema binding for _.roopmodule.json_ manifests.

### 2.2 Process model and transport

The extension launches the language server in a separate Node process and communicates over stdio/IPC using the LSP protocol. The server uses textDocument and workspace requests/notifications and returns results in the standard LSP structures.

### 2.3 File types handled and activation

- ROOP source files: _.roop_ (TextMate grammar and language configuration apply).
- Module manifests: _.roopmodule.json_ (JSON schema validation applies).
- The extension activates when a workspace contains _.roop_ or _.roopmodule.json_ files, or when the roop language is opened; commands can also trigger activation.

## 3. Initialization and Settings

### 3.1 Client-to-server initialization

The client passes initialization options, including user settings, when starting the server. The server reads these and configures format, lint, and completion behavior. Typical shape:

```json
{
  "settings": {
    "roop.format.enabled": true,
    "roop.format.indentSize": 2,
    "roop.lint.missingColon.severity": "warning",
    "roop.lint.unbalancedTask.severity": "error",
    "roop.completion.extraKeywords": ["dock", "undock"]
  }
}
```

### 3.2 Configuration keys and dynamic updates

- roop.format.enabled: enable the formatter.
- roop.format.indentSize: number of spaces per indent level (2–8).
- roop.lint.missingColon.severity: hint|warning|error|off.
- roop.lint.unbalancedTask.severity: hint|warning|error|off.
- roop.completion.extraKeywords: array of extra keywords to suggest.

Clients may re-send settings via workspace/didChangeConfiguration. The server should re-apply settings without requiring restart.

### 3.3 Workspace trust and capability flags

The extension supports untrusted workspaces. The server must avoid executing external code, reading arbitrary files outside the workspace, or attempting network access when trust is not granted.

## 4. Document Lifecycle and Synchronization

### 4.1 open/change/save/close events

For each opened document, the server tracks text and version. On change, analysis is re-run on the current snapshot.

### 4.2 Incremental sync strategy

Use incremental sync (Range-based) to minimize compute and data transfer. The server invalidates only affected regions: lines around the change, current block, and current task.

### 4.3 Debounce and batching

Changes are debounced (for example 150–250 ms) to coalesce rapid edits into a single analysis pass. Formatting and code actions are computed lazily once diagnostics are ready.

## 5. Parsing and Analysis Strategy

### 5.1 Tokenization assumptions

The server does not depend on the TextMate tokenizer at runtime but follows the same lexical assumptions regarding strings, numbers, durations, and operators so that diagnostics align with highlighting.

### 5.2 Line-based scanner and header detection

A pragmatic line-by-line scanner identifies block headers using a colon suffix and known leading keywords such as when, on, at, if, elseif, else, repeat, while, for, parallel, context, with timeout, every, sync when, detached run, await run, run, template task, start task. A closing end task line reduces nesting. This enables fast edits without a full parser.

### 5.3 Indentation model and on-enter rules

Indentation is computed from header lines (indent after a header that ends with a colon) and outdented for end task and the transitional headers else and elseif. On-enter rules mirror this: pressing Enter after a header indents; typing an end task line auto-outdents. Else/elseif cause an indentOutdent motion to keep the block aligned.

### 5.4 Word pattern and selection behavior

The word pattern treats letters, digits, underscore, dot, and hyphen as part of words and recognizes signed numeric literals, enabling reliable double-click selection and cursor motion for DSL identifiers and numbers.

### 5.5 Optional AST and behavior-graph hooks

The line scanner can be upgraded to a node-based parser that produces a lightweight AST or directly builds a behavior graph, enabling richer features such as definition/reference indexing, semantic folding, and cross-file navigation. This is optional and can be introduced incrementally.

## 6. Language Features Implemented

### 6.1 Completion

- Keywords and block headers such as start task, end task, when, on, at, if, elseif, else, repeat, while, for, parallel, context, with timeout, every, sync when, detached run, await run, run.
- Entities and verbs commonly used in ROOP scripts (move, grasp, release, say, display, notify) and concurrency helpers (parallel, await run, detached run).
- Extras provided by roop.completion.extraKeywords.
- Snippet completions provided by the client for common task templates.

Completion items should be context-aware: within headers, suggest header keywords and time/event fragments; within action lines, suggest verbs and entity selectors; after say or display, prefer string snippets.

### 6.2 Hover

Hovers provide concise explanations for key constructs, verbs, and headers, including short examples and links to reference materials in the workspace when available.

### 6.3 Diagnostics

Current checks include:

- Unbalanced tasks: mismatch between start task and end task lines in a document.
- Missing colon: header-like lines that do not end with a colon.

Recommended extensions:

- Unknown directive or verb name.
- Reserved word used as an identifier.
- Empty block warnings (header followed by immediate end task).
- Suspicious indentation (inconsistent with computed model).

### 6.4 Code actions

- Quick fix: add the missing colon to a header-like line.
- Quick fix: insert end task at the end of file when headers are unmatched.
- Suggested refactors: wrap selected lines in a parallel block; convert a run line to await run.

### 6.5 Formatting

A single-pass formatter computes indent levels from the scanner’s block stack. Rules:

- Dedent end task and else/elseif lines before applying indentation.
- Indent lines immediately after headers that end with a colon.
- Use the configured indent size.
- Normalize trailing whitespace and ensure a newline at EOF.

On-type formatting may adjust indentation as the user types a colon or presses Enter after a header.

### 6.6 Folding ranges

Provide folding ranges for task blocks and nested headers. Region comments // #region and // #endregion are also recognized as explicit fold markers.

### 6.7 Document symbols and outline

Symbols include top-level tasks and, optionally, nested blocks as regions so that the Outline view reflects the logical structure of a script. The symbol kind for tasks is Function or Namespace; for nested headers Region or Namespace.

### 6.8 Semantic tokens (optional)

If enabled, provide token types for headers, verbs, entity selectors, durations, and operators to align with TextMate scopes while allowing theme-aware semantic coloring in editors that support it.

### 6.9 Workspace symbols (optional)

Index task names across the workspace so users can jump to tasks via the Command Palette or Go to Symbol in Workspace.

### 6.10 Rename, go to definition, and references (planned)

With an AST in place, the server can support symbol rename (for task names or labels) and reference finding across files. Care must be taken to restrict rename inside string literals that are used as semantic selectors.

## 7. Grammar, Blocks, and Semantics Recognized

### 7.1 Block headers and colons

Headers follow the shape: a keyword phrase, optional arguments, and a trailing colon. Examples:

```
start task "ServeDrink"
when object "mug" appears:
if surface "Table" is clear:
else:
end task
```

### 7.2 Actions, entities, durations, numbers

Action lines use plain verbs and prepositions: move Arm1 to pose "Tray", grasp with Gripper1, say "Hello". Durations accept units ms, s, sec, min, m, h, hours. Numbers support integers and floats.

### 7.3 Concurrency and triggers

Concurrency constructs include parallel blocks, await run for asynchronous waits, and detached run for background tasks. Triggers include when and on for events, at for time, and every for periodic scheduling. sync when provides guarded synchronization semantics.

### 7.4 Error-handling headers

Error branches include on failure, on timeout, on deviation, and on interruption. A fallback: header can introduce a degraded path. These headers behave like blocks and participate in indentation and folding.

## 8. JSON Validation for .roopmodule.json

### 8.1 Schema binding

Files matching \*_/_.roopmodule.json are validated against a bundled JSON Schema. Required fields include module and capabilities. The schema defines structured sub-objects for module metadata, interfaces (ROS, REST, gRPC, serial, MQTT), capability declarations, events, telemetry, errors, safety, permissions, dependencies, profiles, testing, and examples.

### 8.2 Typical validation errors

- Missing required properties (module, capabilities).
- Unknown category or parameter type; enum mismatch.
- Properties with invalid types or units (e.g., speed, acceleration).
- AdditionalProperties violations in strict objects such as module.hardware or module.software.

### 8.3 Authoring tips

- Use DNS-like, stable ids for module.module.id (for example loop.arm.v1).
- Provide capability verbs and parameter constraints with units and ranges.
- Supply examples to improve hover and completion UX in the editor.
- Use profiles to capture context-specific defaults and limits.

## 9. Performance Notes

### 9.1 Complexity and incremental updates

The scanner operates in O(n) time per full pass. With incremental sync, only the affected block and nearby lines are rescanned. Most edits amortize to O(1)–O(k) where k is the block size.

### 9.2 Memory and caching

Maintain a per-document cache of header positions, block stack snapshots at line boundaries, and quick-look tables for tasks and labels. Invalidate selectively on edits.

### 9.3 Large-file strategies

- Cap diagnostic passes and folding calculation after a time budget, deferring deep work until idle.
- Provide partial document symbols when scanning times out.
- Downsample completion suggestions if the list grows beyond a configured threshold.

## 10. Telemetry and Logging

Use the LSP connection console for logging. Provide a server log level setting (info|warn|error) and include timing for analysis passes to assist with performance tuning.

## 11. Security and Workspace Trust

In untrusted workspaces, disable any operation that would read external processes or files beyond the current workspace, and never invoke network calls. Validation and formatting run purely on in-memory text. Respect the platform’s untrusted workspace capability flag.

## 12. Commands, Views, and UX Integration

The extension contributes commands such as:

- ROOP: Insert Task Block
- ROOP: Create Example Project
- ROOP: Open Language Reference
- ROOP: Run Current Task
- ROOP: Validate Current Document
- ROOP: Scan and Register Modules
- ROOP: Generate .roopmodule.json

Views include Modules, Tasks, and World Model in the ROOP activity bar. The LSP provides the symbols and quick validations these views rely on.

## 13. Testing Strategy and Automation

- Unit tests for the scanner: header detection, colon inference, block balancing, and indentation calculation.
- Quick fixes: expected edits for add-colon and insert-end-task.
- Formatting tests: golden files for common patterns (if/elseif/else, nested when/on, parallel blocks).
- Smoke test script: compile the extension and run a sample workspace with example _.roop_ and _.roopmodule.json_ files to verify the end-to-end experience.

## 14. Extensibility Roadmap

- Node-based parser and lightweight AST.
- Semantic tokens provider aligned with grammar scopes.
- Cross-file index of tasks, labels, and module ids; workspace symbols and references.
- Definition/rename across tasks and templates.
- Code lens: Run Task and Validate for each start task header.
- Inline inlay hints for durations and units where helpful.

## 15. Diagnostic Codes and Conventions

Use a concise code namespace:

- ROOP001 MissingColon: header-like line lacks trailing colon.
- ROOP002 UnbalancedTask: unmatched start task/end task.
- ROOP003 UnknownDirective: unrecognized header keyword.
- ROOP004 ReservedIdentifier: reserved word used as identifier.
- ROOP005 EmptyBlock: header not followed by content before next header or end task.

Provide clear messages and related information ranges; offer quick fixes where applicable.

## 16. Settings Reference

- roop.format.enabled: Enable or disable the formatter.
- roop.format.indentSize: Integer, default 2.
- roop.lint.missingColon.severity: hint|warning|error|off.
- roop.lint.unbalancedTask.severity: hint|warning|error|off.
- roop.completion.extraKeywords: Array of strings to add to completion lists.
- server.logLevel: info|warn|error.

## 17. File Associations and Activation Events

Language id roop is associated with _.roop_, with a TextMate grammar and a language configuration for indentation and on-enter rules. The extension activates on language open, when the workspace contains _.roop_ or _.roopmodule.json_, or when commands are invoked. JSON validation is wired for _.roopmodule.json_ to the bundled schema.

## 18. Appendix A: Key Regex Patterns

Header increaseIndent (illustrative):

```
^(?:when|on|at|if|elseif|else|repeat|while|for|parallel|context|with\s+timeout|every|sync\s+when)\b.*:|(?:detached\s+run|await\s+run|run)\b.*:|template\s+task\b.*:|start\s+task\b.*$
```

Header decreaseIndent (illustrative):

```
^(?:end\s+task\b|elseif\b.*:|else:)\s*$
```

Word pattern (illustrative):

```
([A-Za-z_][\w\.-]*)|(-?\b\d+(?:\.\d+)?\b)
```

## 19. Appendix B: Minimal server skeleton

```ts
import {
  createConnection,
  ProposedFeatures,
  InitializeParams,
  TextDocuments,
  TextDocumentSyncKind,
  Diagnostic,
  DiagnosticSeverity,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let settings = {
  format: { enabled: true, indentSize: 2 },
  lint: { missingColon: "warning", unbalancedTask: "error" },
  completion: { extraKeywords: [] as string[] },
};

connection.onInitialize((_params: InitializeParams) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { resolveProvider: false },
      hoverProvider: true,
      documentFormattingProvider: true,
      codeActionProvider: true,
      foldingRangeProvider: true,
      documentSymbolProvider: true,
    },
  };
});

documents.onDidChangeContent((change) => {
  validateDocument(change.document);
});

function validateDocument(doc: TextDocument) {
  const text = doc.getText();
  const diagnostics: Diagnostic[] = [];
  // Example: detect header lines missing a trailing colon
  const headerPattern =
    /^(\s*)(when|on|at|if|elseif|else|repeat|while|for|parallel|context|with\s+timeout|every|sync\s+when|detached\s+run|await\s+run|run|template\s+task|start\s+task)\b(?!.*:\s*$).*$/gm;
  let match: RegExpExecArray | null;
  while ((match = headerPattern.exec(text))) {
    const start = doc.positionAt(match.index);
    const end = doc.positionAt(match.index + match[0].length);
    diagnostics.push({
      source: "roop-lsp",
      code: "ROOP001",
      message: "Header is missing a trailing colon.",
      severity: DiagnosticSeverity.Warning,
      range: { start, end },
    });
  }
  connection.sendDiagnostics({ uri: doc.uri, diagnostics });
}

documents.listen(connection);
connection.listen();
```

This skeleton illustrates the incremental sync, a simple diagnostic, and the capability surface. Real implementation should add completion, hover, formatting, code actions, folding, and symbols as described above.
