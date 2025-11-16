# ROOP Language Server — Design & Implementation

> Target editor: Visual Studio Code  
> Protocol: Language Server Protocol (LSP)  
> Implementation language: TypeScript (NodeJS)

## Table of Contents

1. Scope and Goals  
   1.1 Intended audience and non‑goals  
   1.2 Supported file types and activation
2. Architecture Overview  
   2.1 Client–server wiring  
   2.2 Capabilities advertised to the client  
   2.3 Process model and lifecycle
3. Configuration Model  
   3.1 User/workspace settings (format, lint, completion)  
   3.2 Configuration defaults scoped to `[roop]`  
   3.3 Reading settings on initialize / didChangeConfiguration
4. Syntax, Tokenization & Structure Hints  
   4.1 TextMate grammar (keywords, block headers, literals)  
   4.2 Language configuration (comments, brackets, indentation, on‑enter)  
   4.3 Word boundaries and folding markers
5. Parsing Strategy  
   5.1 Line‑based scanner and header detection (`...:`)  
   5.2 Task stack for `start task` / `end task` pairs  
   5.3 Lightweight tokenization helpers
6. Diagnostics  
   6.1 Missing colon on block headers  
   6.2 Unbalanced `start task` / `end task`  
   6.3 Unknown or unsupported top‑level verb  
   6.4 Severity mapping and configuration keys  
   6.5 Diagnostic codes, ranges, and messages
7. Completion  
   7.1 Keywords and headers  
   7.2 Extra keywords from settings  
   7.3 Action/event/directive suggestions  
   7.4 Module‑driven verb completion (.roopmodule awareness)  
   7.5 Snippet shapes and commit characters
8. Hover  
   8.1 Grammar‑level help  
   8.2 Module/entity hover (capabilities, parameters, units)  
   8.3 Markdown rendering and links
9. Document Symbols & Folding  
   9.1 Symbols for task and template headers  
   9.2 Folding ranges for structural blocks
10. Formatting  
    10.1 Indentation algorithm  
    10.2 Header colon normalization quick fix  
    10.3 Interaction with editor.formatOnSave and indent size
11. Code Actions (Quick Fixes)  
    11.1 Insert `end task` at EOF  
    11.2 Add missing `:` to header lines  
    11.3 Batch fixes and conflict resolution
12. JSON Validation for Module Manifests  
    12.1 VS Code `jsonValidation` wiring  
    12.2 Schema highlights and common diagnostics  
    12.3 Authoring guidance and examples
13. Commands, Views, and Explorer Integrations  
    13.1 Commands and keybindings  
    13.2 Activity bar container and custom views  
    13.3 ViewsWelcome content
14. Multi‑file Indexing and Cross‑References (Roadmap)  
    14.1 Definition/reference index  
    14.2 Rename and workspace symbols  
    14.3 Semantic tokens
15. Performance, Telemetry, and Logging  
    15.1 Incremental sync and trigger characters  
    15.2 Avoiding N^2 scans  
    15.3 Server logging and diagnostics volume
16. Security & Trust Model  
    16.1 Untrusted workspaces  
    16.2 Virtual workspaces
17. Testing and CI  
    17.1 `scripts/smoke-test.js` sanity check  
    17.2 Unit tests for scanners/formatters  
    17.3 Packaging and marketplace publishing
18. Versioning and Compatibility  
    18.1 Extension version and language version  
    18.2 Backward‑compatible rule changes
19. Appendix A — Heads‑Up Display of Grammar Keywords
20. Appendix B — Diagnostic Codes and Message Catalog
21. Appendix C — Example Server Replies (JSON excerpts)

---

## 1. Scope and Goals

The ROOP language server delivers a pragmatic, low‑latency authoring experience for the ROOP DSL: diagnostics, completion, hover, symbols, folding, formatting, and quick fixes. The server aligns with the language’s task‑oriented design so that what authors type (goals, places, moments) maps directly to editor affordances.

### 1.1 Intended audience and non‑goals

This document targets maintainers and contributors of the ROOP VS Code extension and its language server. It does not define the ROOP language itself (see the language reference), nor the runtime/robot drivers. The LSP implementation focuses on interactive editing; heavy static analyses or full semantic checkers are out of scope in the base server and may be provided by companion tools.

### 1.2 Supported file types and activation

- `.roop` source files (syntax highlighting, LSP features).
- `.roopmodule.json` module manifests (JSON schema validation).

The extension activates on the ROOP language and when the workspace contains either `.roop` or `.roopmodule.json` files. See the extension manifest for activation events and contributions.

---

## 2. Architecture Overview

### 2.1 Client–server wiring

- Client: VS Code extension entrypoint starts the LSP client and wires configuration and folder context.
- Server: `server.ts` creates an LSP connection, registers feature handlers, and tracks open documents.

### 2.2 Capabilities advertised to the client

The server advertises incremental text sync, completion (with `resolveProvider`), hover, document symbols, folding ranges, document formatting, and quick‑fix code actions. Completion is triggered on space, quotes, colon, period, brackets, and braces to support natural ROOP typing.

### 2.3 Process model and lifecycle

- `initialize` → compute capabilities based on server build.
- `initialized` → log readiness and begin telemetry/timers if enabled.
- `shutdown/exit` → dispose resources.

---

## 3. Configuration Model

### 3.1 User/workspace settings (format, lint, completion)

Settings are grouped under the `roop.*` namespace:

- `roop.format.enabled` — enable/disable the built‑in formatter.
- `roop.format.indentSize` — spaces per indent (2–8).
- `roop.lint.missingColon.severity` — hint | warning | error | off.
- `roop.lint.unbalancedTask.severity` — hint | warning | error | off.
- `roop.completion.extraKeywords` — additional completions to surface.

### 3.2 Configuration defaults scoped to `[roop]`

The extension contributes sensible defaults, including enabling `editor.formatOnSave` for ROOP files, while leaving global settings untouched.

### 3.3 Reading settings on initialize / didChangeConfiguration

On `initialize`, the server reads the configuration block from `initializationOptions` (if provided) and falls back to `defaultSettings`. A dynamic settings cache can be invalidated on `workspace/didChangeConfiguration` to update severities and indent width at runtime.

---

## 4. Syntax, Tokenization & Structure Hints

### 4.1 TextMate grammar (keywords, block headers, literals)

Tokenization is provided via a TextMate grammar that declares categories for block headers (`when`, `on`, `at`, `if`, `elseif`, `else`, `repeat`, `while`, `for`, `parallel`, `context`, `with timeout`, `every`, `sync when`, `detached run`, `await run`, `run`, `template task`, `start task`), strings with interpolation, numbers, durations, operators, booleans/null, and domain‑specific actions/entities. The grammar keeps scopes stable so themes can color ROOP consistently.

### 4.2 Language configuration (comments, brackets, indentation, on‑enter)

The language configuration defines `//` line comments, bracket pairs `()[]{}`, auto‑closing pairs for braces/brackets/parens and quotes, on‑enter indentation for header lines (ending with `:`), and indentation rules that increase after block headers and decrease on `end task`, `elseif`, and `else`.

### 4.3 Word boundaries and folding markers

Word boundaries include letters, digits, underscore, dash, and dot to make double‑click selections and rename operations friendlier. Optional region folding markers can be used with `// #region` / `// #endregion` in addition to structural folding provided by the language server.

---

## 5. Parsing Strategy

### 5.1 Line‑based scanner and header detection (`...:`)

The server employs a pragmatic line‑based scanner. Header lines are detected using a regular expression that matches known header keywords followed by a colon. This keeps the implementation small and responsive during interactive edits.

### 5.2 Task stack for `start task` / `end task` pairs

A simple stack tracks `start task` and `end task` pairs to compute outline symbols, folding regions, and unbalanced‑task diagnostics.

### 5.3 Lightweight tokenization helpers

Utility functions identify numbers, durations, and identifiers sufficiently for diagnostics and completions without building a full AST.

---

## 6. Diagnostics

### 6.1 Missing colon on block headers

When a header keyword line lacks the trailing `:`, the server emits a diagnostic with configured severity and a quick fix to add the colon.

### 6.2 Unbalanced `start task` / `end task`

If the file ends with more `start task` than `end task`, the server emits a diagnostic near EOF and offers a quick fix to insert a closing `end task` line.

### 6.3 Unknown or unsupported top‑level verb

Lines that look like action invocations but begin with an unknown verb can be flagged to help catch typos. Future improvements may consult the active module catalog for verb validation.

### 6.4 Severity mapping and configuration keys

Each rule maps to `roop.lint.*` settings so users can tune noise level per workspace.

### 6.5 Diagnostic codes, ranges, and messages

Diagnostics include stable `code` fields (e.g., `roop.missingColon`, `roop.unbalancedTask`) and precise ranges covering the offending token or header line. Messages are short and actionable.

---

## 7. Completion

### 7.1 Keywords and headers

The server suggests block headers and control keywords as the user types. Space and punctuation are completion triggers so authors can type naturally.

### 7.2 Extra keywords from settings

Items from `roop.completion.extraKeywords` are appended to the list, marked as `CompletionItemKind.Keyword` or `Text` depending on shape.

### 7.3 Action/event/directive suggestions

Common verb stems (move, grasp, release, say, turn on/off), event names, and directives (template task, run, await run, detached run) are included as snippets with placeholders where appropriate.

### 7.4 Module‑driven verb completion (.roopmodule awareness)

When `.roopmodule.json` manifests are present, the client or a future indexer can extract capability verbs and surface them as completions (e.g., `move`, `align`, `grasp`) with parameter hints (units, ranges, defaults). This keeps editor help synchronized with the hardware/software capabilities present in the workspace.

### 7.5 Snippet shapes and commit characters

Snippets include placeholders for names and parameters (e.g., `start task "$1"\n  $0\nend task`). Quotes and colon are used as commit characters to flow with ROOP’s syntax style.

---

## 8. Hover

### 8.1 Grammar‑level help

Hover over a header or keyword shows a short description and an example. Hovers are rendered as Markdown for readability.

### 8.2 Module/entity hover (capabilities, parameters, units)

When hovering over verbs/nouns linked to a known module capability, the server (or client) can show parameter types, units, ranges, and safety notes extracted from the manifest.

### 8.3 Markdown rendering and links

Hovers link to the language reference and manifest documentation where available.

---

## 9. Document Symbols & Folding

### 9.1 Symbols for task and template headers

The outline lists `start task` and `template task` blocks with their names and ranges to help navigation.

### 9.2 Folding ranges for structural blocks

Folding regions are computed for task blocks and other indented structures where a header is followed by nested content.

---

## 10. Formatting

### 10.1 Indentation algorithm

A single‑pass formatter walks the document, adjusting indentation according to header/dedent rules and the configured indent size. `elseif` and `else` are outdented to align with their `if`, while `end task` is outdented to close the surrounding block.

### 10.2 Header colon normalization quick fix

A code action adds a trailing `:` to header lines when missing. The same logic can normalize spacing before the colon to a single space for consistency.

### 10.3 Interaction with editor.formatOnSave and indent size

The extension enables `editor.formatOnSave` for ROOP by default and defers to `roop.format.indentSize` to compute the correct indent width.

---

## 11. Code Actions (Quick Fixes)

### 11.1 Insert `end task` at EOF

When the file ends with an unterminated task, the quick fix inserts `end task` on a new line with the right indentation.

### 11.2 Add missing `:` to header lines

A single‑edit quick fix appends `:` to the header line and re-indents the next line if needed.

### 11.3 Batch fixes and conflict resolution

When both issues are present, batch actions are offered in a stable order: first fix headers, then close tasks.

---

## 12. JSON Validation for Module Manifests

### 12.1 VS Code `jsonValidation` wiring

The extension registers a schema for `*.roopmodule.json` so authors get completions and validation while editing manifests.

### 12.2 Schema highlights and common diagnostics

The schema defines module metadata, capabilities (verbs, parameters with units and ranges), events, telemetry, safety, permissions, dependencies, profiles, testing, and examples. Typical errors include missing required fields, wrong types/units, or values outside allowed ranges.

### 12.3 Authoring guidance and examples

Manifests should provide human‑readable names and machine‑parsable ids, enumerate verbs with clear parameter contracts, and include at least one example that maps a capability to ROOP code.

---

## 13. Commands, Views, and Explorer Integrations

### 13.1 Commands and keybindings

The extension contributes commands such as inserting a task block, creating an example project, opening documentation, running the current task, validating the current document, scanning modules, and generating a module manifest. Keybindings are provided for frequently used commands.

### 13.2 Activity bar container and custom views

A “ROOP” container hosts **Modules**, **Tasks**, and **World Model** views for future browsing and telemetry.

### 13.3 ViewsWelcome content

Empty states contain links to create an example project and open the language reference for first‑run guidance.

---

## 14. Multi‑file Indexing and Cross‑References (Roadmap)

### 14.1 Definition/reference index

Index task names, templates, and module ids across the workspace to enable Go to Definition, Find References, and global symbols.

### 14.2 Rename and workspace symbols

Provide Rename for task and template names and a Workspace Symbols provider to find scripts quickly.

### 14.3 Semantic tokens

Add semantic tokens (custom token types and modifiers) to color verbs, entities, and selectors beyond what TextMate scopes can express.

---

## 15. Performance, Telemetry, and Logging

### 15.1 Incremental sync and trigger characters

Use incremental sync to reduce payload sizes and trigger completion on characters that naturally appear in ROOP authoring (space, quotes, colon, period, brackets, braces).

### 15.2 Avoiding N^2 scans

Cache line classifications and reuse previous pass results where possible. Keep regexes linear and avoid catastrophic backtracking.

### 15.3 Server logging and diagnostics volume

Log initialization and configuration changes to the LSP console. Allow users to throttle diagnostics by severity settings if the workspace is large or noisy.

---

## 16. Security & Trust Model

### 16.1 Untrusted workspaces

The extension declares support for untrusted workspaces. The language server avoids executing workspace code and only analyzes text.

### 16.2 Virtual workspaces

Virtual workspaces are not supported; file system APIs may be required by views and schema resolution.

---

## 17. Testing and CI

### 17.1 `scripts/smoke-test.js` sanity check

A lightweight script compiles the extension and boots the LSP to catch regressions in wiring and packaging.

### 17.2 Unit tests for scanners/formatters

Coverage should focus on indentation calculation, header detection, and diagnostic ranges.

### 17.3 Packaging and marketplace publishing

Use `vsce package` to produce a `.vsix` and `vsce publish` to release updates. Ensure `vscode:prepublish` compiles sources and that all contributed assets (grammar, schema, configurations) are included.

---

## 18. Versioning and Compatibility

### 18.1 Extension version and language version

Keep the extension’s `version` aligned with user‑visible changes to the language experience. Avoid breaking changes to diagnostics codes and settings names.

### 18.2 Backward‑compatible rule changes

Add new rules in opt‑in or low‑severity mode by default. Document breaking behavior and provide migration hints.

---

## 19. Appendix A — Heads‑Up Display of Grammar Keywords

Block headers: when, on, at, if, elseif, else, repeat, while, for, parallel, context, with timeout, every, sync when, detached run, await run, run, template task, start task.  
Other categories: strings with interpolation, numbers, durations, operators (logical, comparison, membership, relational), booleans/null, spatial and entity selectors, variables, punctuation.

---

## 20. Appendix B — Diagnostic Codes and Message Catalog

- `roop.missingColon` — “Block header is missing a trailing colon.”
- `roop.unbalancedTask` — “More ‘start task’ than ‘end task’ detected.”
- `roop.unknownVerb` — “Unknown top‑level verb. Check spelling or install the module that provides this capability.”

---

## 21. Appendix C — Example Server Replies (JSON excerpts)

- `initialize` result: advertises `completionProvider.resolveProvider = true`, `hoverProvider = true`, `documentSymbolProvider = true`, `foldingRangeProvider = true`, `documentFormattingProvider = true`, and `codeActionProvider` with kind `quickfix`.
- `textDocument/completion` items: keywords and verbs; snippets for `start task` and `template task`.
- `textDocument/publishDiagnostics`: range, code (`roop.*`), severity (hint|warning|error), and message.
