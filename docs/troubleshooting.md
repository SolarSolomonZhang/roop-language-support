# ROOP Troubleshooting Handbook

Version: 1.0  
Audience: ROOP authors, extension maintainers, CI operators, and module vendors

This handbook consolidates the known failure modes and fixes for the ROOP language, the VS Code extension, the language server (LSP), the TextMate grammar, the language configuration, the `.roopmodule.json` schema, and project packaging. It also includes language‑level troubleshooting patterns for task categories such as motion, manipulation, vision, speech, IoT, and multi‑robot coordination so that common human‑centric scenarios can be debugged to completion.

Sources consolidated from the project’s existing guides, language assets, and LSP design notes. See the inline citations to the authoritative files for details and exact patterns. fileciteturn1file0 fileciteturn1file1 fileciteturn1file2 fileciteturn1file4 fileciteturn1file9

---

## Table of contents

1. How to use this handbook
2. 60‑second triage checklist
3. Symptom matrix (quick lookup)
4. Environment and prerequisites
5. Extension activation and LSP startup
6. Language authoring issues in `.roop` files  
   6.1 Block headers and required colons  
   6.2 Indentation and on‑enter rules  
   6.3 Folding and outline  
   6.4 Strings, numbers, durations, operators  
   6.5 Task structure and “unbalanced task”  
   6.6 Concurrency and triggers  
   6.7 Diagnostics codes and quick fixes
7. JSON schema issues in `.roopmodule.json`  
   7.1 Binding to the bundled schema  
   7.2 Typical validation failures and corrections  
   7.3 Capability/verb mismatches
8. Completion, hover, formatting, and code actions
9. Commands, keybindings, views, and problem matchers
10. Workspace trust, security, and virtual workspaces
11. Performance, memory, and large files
12. Packaging and publishing problems (VSIX, Marketplace)
13. CI integration and headless validation
14. Language‑level troubleshooting patterns by task family  
    14.1 Motion and navigation  
    14.2 Manipulation and tool use  
    14.3 Vision and perception  
    14.4 Dialogue, audio, and display  
    14.5 Smart‑home and IoT control  
    14.6 Healthcare and assistive operations  
    14.7 Hospitality, retail, and service  
    14.8 Industrial and warehouse operations  
    14.9 Household and domestic tasks  
    14.10 Multi‑robot coordination  
    14.11 System and utilities
15. Reference checklists  
    15.1 Style sanity check for authors  
    15.2 Settings reference for LSP/extension  
    15.3 Activation and contribution map  
    15.4 Diagnostic catalogue
16. Appendices  
    A. Minimal reproducer templates  
    B. Example module manifest fragments  
    C. Regular expressions used by the editor runtime

---

## 1. How to use this handbook

Start with the triage checklist, look up the symptom in the matrix, then jump to the detailed section. When a language‑level action misbehaves (for example, “grasp with Gripper1 never runs” or “when red mug appears never fires”), go to the relevant task family in section 14 and apply the reproduction, checks, and fixes provided. Cross‑check the language asset rules for indentation, headers, and tokenization to eliminate editor‑side causes first. fileciteturn1file0 fileciteturn1file2 fileciteturn1file1

## 2. 60‑second triage checklist

1. Confirm the extension is activated by opening a `.roop` file; VS Code status should show the ROOP language and you should see syntax colors for headers like `when:` or `start task`. If not, set language mode to ROOP or ensure the file has a `.roop` extension. fileciteturn1file0 fileciteturn1file9
2. Check that your VS Code version satisfies `engines.vscode` in the extension manifest. Current minimum: `^1.84.0`. fileciteturn1file9
3. Verify the language server started. Look for a ready indicator in the status area or open Developer Tools to check for console errors. fileciteturn1file0
4. For formatting issues, confirm `roop.format.enabled` is true and `editor.formatOnSave` is on for `[roop]`, or run the format command directly. fileciteturn1file9
5. For validation of `.roopmodule.json`, ensure the file name matches the glob and that the schema contribution is present under `jsonValidation`. fileciteturn1file9
6. If packaging fails, run `npm run compile` and package with `npx vsce package`. Network and token problems show up as vsce errors. fileciteturn1file18

## 3. Symptom matrix (quick lookup)

| Symptom                                       | Likely cause                                   | Fast check                                              | Fix                                                                                                                                                                                  |
| --------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No syntax colors for `when:` or `start task`  | Language id not active or wrong file extension | Confirm file is `.roop` and language mode is ROOP       | Open `.roop` or set mode; ensure grammar is contributed under `source.roop` in `package.json` and `syntaxes/roop.tmLanguage.json` exists fileciteturn1file9 fileciteturn1file1 |
| Pressing Enter after `if ...:` doesn’t indent | On‑enter rules not applied                     | Check `language-configuration.json` `onEnterRules`      | Keep header lines ending with `:`, ensure keywords match the increaseIndent pattern and on‑enter rules fileciteturn1file2                                                         |
| Else/elseif not aligned                       | Decrease/indentOutdent rules                   | Verify `decreaseIndentPattern` and `indentOutdent` rule | Ensure `elseif:`/`else:` are on their own lines; formatter will outdent them properly fileciteturn1file2                                                                          |
| “Header is missing a trailing colon”          | Forgot `:` at the end of a block header        | Look for diagnostics code roop.missingColon             | Accept quick fix to append `:`; follow header grammar that requires a colon at end fileciteturn1file13 fileciteturn1file1                                                      |
| “Unbalanced task” at EOF                      | Missing `end task`                             | Document symbols show an open task                      | Apply quick fix “Insert end task”; ensure task blocks close explicitly fileciteturn1file13                                                                                        |
| Durations not highlighted                     | Unit typo                                      | Compare against duration regex                          | Use `ms`, `s`, `sec`, `min`, `m`, `h`, `hours` per grammar fileciteturn1file6                                                                                                     |
| Unknown verb squiggle                         | Verb not provided by any module or typo        | Check manifest capabilities and built‑in verb list      | Add or correct verbs in `.roopmodule.json` or install the module; see builtin verbs and completion behavior fileciteturn1file13 fileciteturn1file10                            |
| JSON schema warnings in `.roopmodule.json`    | Missing required fields or enum/type mismatch  | Problems panel shows exact path                         | Fill required `module` and `capabilities`; respect schema enums and units fileciteturn1file16                                                                                     |
| Commands not visible                          | Wrong `when` clause or language not active     | Inspect `package.json` contributes.menus                | Open a `.roop` file; adjust `when: editorLangId == roop` if needed fileciteturn1file14                                                                                            |
| Formatter doesn’t run on save                 | Setting disabled for ROOP scope                | Check `[roop]` configuration defaults                   | Enable `editor.formatOnSave` or run “Format Document” fileciteturn1file10                                                                                                         |

## 4. Environment and prerequisites

The extension requires VS Code `^1.84.0` and activates on ROOP language files and module manifests. Activation events and contributions are declared in the manifest, including languages, grammar, snippets, JSON validation, commands, views, keybindings, task definitions, and a problem matcher. fileciteturn1file9 fileciteturn1file14

## 5. Extension activation and LSP startup

Activation occurs when a `.roop` file opens, when the workspace contains `**/*.roop` or `**/*.roopmodule.json`, or when a ROOP command is invoked. After activation, the client launches the language server and advertises capabilities such as completion, hover, formatting, folding, symbols, and quick fixes. If the language server fails to start, inspect Developer Tools and retry in a trusted workspace. fileciteturn1file9 fileciteturn1file13

Quick checks:

- Open a `.roop` file and verify that completion triggers on space, quotes, colon, and brackets. fileciteturn1file13
- Confirm the outline shows `start task` entries and folding markers on header blocks. fileciteturn1file13
- If activation doesn’t happen, force language mode to ROOP or run “ROOP: Insert Task Block”. fileciteturn1file14

## 6. Language authoring issues in `.roop` files

### 6.1 Block headers and required colons

Headers must end with a colon and match the grammar’s header list: `when`, `on`, `at`, `if`, `elseif`, `else`, `repeat`, `while`, `for`, `parallel`, `context`, `with timeout`, `every`, `sync when`, `detached run`, `await run`, `run`, `template task`, `start task`. The grammar’s `blockHeaders` rule enforces the trailing colon and delimiting of header arguments. fileciteturn1file1

The language server emits a stable diagnostic when you forget the colon and offers a quick fix to append it. fileciteturn1file13

### 6.2 Indentation and on‑enter rules

The editor increases indentation after a header line and outdents for `end task`, and performs indent‑outdent for `elseif:` and `else:` to align with `if:`. These behaviors come from `increaseIndentPattern`, `decreaseIndentPattern`, and `onEnterRules` in `language-configuration.json`. If a new header is added to the language, update both the indent and on‑enter patterns. fileciteturn1file2

### 6.3 Folding and outline

Folding is provided for task blocks and nested header blocks; region comments `// #region` and `// #endregion` are also recognized. The outline lists `start task` and `template task` blocks for navigation. fileciteturn1file2 fileciteturn1file13

### 6.4 Strings, numbers, durations, operators

Double‑quoted strings support escapes and `{}` interpolation. Integers and floats are recognized; durations accept `ms`, `s`, `sec`, `min`/`m`, and `h`/`hours`. Logical, comparison, membership, and spatial/relational operators are tokenized for highlighting. If a token doesn’t colorize as expected, compare against the grammar patterns. fileciteturn1file6

### 6.5 Task structure and “unbalanced task”

A `start task` block must end with `end task`. The language server tracks a simple task stack and reports unbalanced task errors with a quick fix to insert the closing `end task`. fileciteturn1file13

### 6.6 Concurrency and triggers

Concurrency and triggers are structural headers and must follow the same colon and indent rules. Constructs include `parallel`, `await run`, and `detached run`; triggers include `when`, `on`, `at`, and periodic `every`. Error handling headers such as `on failure`, `on timeout`, `on deviation`, and `on interruption`, and `fallback:` also act as blocks and participate in indentation. fileciteturn1file16 fileciteturn1file17

### 6.7 Diagnostics codes and quick fixes

The server uses stable diagnostic codes, for example `roop.missingColon`, `roop.unbalancedTask`, and `roop.unknownVerb`. Quick fixes include “Add trailing colon” and “Insert end task”. Use these as canonical references in your CI problem matcher or scripts. fileciteturn1file13

## 7. JSON schema issues in `.roopmodule.json`

### 7.1 Binding to the bundled schema

The extension binds `**/*.roopmodule.json` to the bundled JSON Schema via `contributes.jsonValidation`, enabling completions and diagnostics in the editor. fileciteturn1file9

### 7.2 Typical validation failures and corrections

Common errors include missing required `module` or `capabilities`, enum/type mismatches for fields such as category or parameter types, invalid units, and `additionalProperties` violations in strict sub‑objects like `module.hardware` or `module.software`. Correct the schema fields and rerun validation. fileciteturn1file16

### 7.3 Capability/verb mismatches

If an action line is flagged as an unknown verb, make sure some installed module advertises that verb in its `capabilities[ ].verbs`, or switch to one of the built‑in verbs listed under the extension configuration defaults. The language server can surface module‑driven verb completions when manifests are present. fileciteturn1file13 fileciteturn1file10 fileciteturn1file19

## 8. Completion, hover, formatting, and code actions

Completion proposes header keywords, verbs, selectors, and optionally extra keywords configured by the user. Hovers summarize constructs and module parameters. The formatter indents according to header/dedent rules, and code actions offer colon insertion and end‑task completion. Verify settings `roop.format.enabled`, `roop.format.indentSize`, and lint severities under `roop.lint.*`. fileciteturn1file13 fileciteturn1file9

## 9. Commands, keybindings, views, and problem matchers

The extension contributes commands including Insert Task Block, Create Example Project, Open Language Reference, Run Current Task, Validate Current Document, Scan and Register Modules, and Generate `.roopmodule.json`. Keybindings are scoped to `editorLangId == roop`. An activity bar container hosts Modules, Tasks, and World Model views. The `$roop-lsp` problem matcher parses diagnostics from CLI or tasks. fileciteturn1file14

## 10. Workspace trust, security, and virtual workspaces

In untrusted workspaces, the server must not run external processes or read outside the workspace; validation and formatting operate on text only. Virtual workspaces are not supported. If features are missing, ensure the workspace is trusted. fileciteturn1file13

## 11. Performance, memory, and large files

The scanner runs in linear time and rescans only affected regions with incremental sync. For very large files, the server may cap work per pass and provide partial symbols; completion lists can be downsampled. Use the server log level to investigate slow validations. fileciteturn1file16

## 12. Packaging and publishing problems (VSIX, Marketplace)

- Build first: `npm ci && npm run compile`. fileciteturn1file18
- Package: `npx vsce package`. Ensure the VSIX contains `syntaxes/roop.tmLanguage.json`, `language-configuration.json`, `schemas/roopmodule.schema.json`, and snippets referenced by the manifest. fileciteturn1file18 fileciteturn1file9
- Verify and publish: use `npx vsce ls`, `npx vsce verify-pat`, and `npx vsce publish` from a tagged commit. fileciteturn1file18

## 13. CI integration and headless validation

Use the contributed task type `roop` and the `$roop-lsp` problem matcher so CI logs map back to editor diagnostics. Keep smoke tests that compile the extension and open sample `.roop` and `.roopmodule.json` files to catch schema or grammar regressions. fileciteturn1file14 fileciteturn1file15

## 14. Language‑level troubleshooting patterns by task family

The following sections focus on the script itself: reproduce the issue, check selectors and modules, apply correction patterns, and add defensive handlers. Cross‑check with the Language Reference for canonical constructs and capability mapping. fileciteturn1file4

### 14.1 Motion and navigation

Common symptoms

- Robot does not move to a pose or place name.
- Movement starts but stops prematurely.
- Collision avoidance blocks the plan.

Reproduce

```
start task "MoveSmoke"
  use module "Base"
  move Base to "ChargingDock"
  on failure:
    log "Move failed"
    retry after 2 s
end task
```

Checks

- Verify the verb exists (move, navigate, go) and is supported by a module. fileciteturn1file10
- Ensure the selector is resolvable: `pose` or named area exists in the world model. fileciteturn1file4
- Confirm `parallel` blocks are not contending for the same resource; add exclusive access if needed. fileciteturn1file17

Corrections

- Switch to `navigate to "ChargingDock"` when path planning is required. fileciteturn1file10
- Add `await run` if subsequent steps depend on completion. fileciteturn1file17
- Add `on deviation:` or `fallback:` to recover from path errors. fileciteturn1file16

### 14.2 Manipulation and tool use

Common symptoms

- Gripper does not close or opens at wrong time.
- Object not found on surface; grasp fails intermittently.

Reproduce

```
start task "PickMug"
  use module "Arm1"
  use module "Gripper1"
  when object "mug" with color "red" appears on "Table":
    move Arm1 to object "mug"
    grasp with Gripper1
    move Arm1 to "Tray"
    release with Gripper1
  on failure:
    say "Retrying"
    retry after 2 s
end task
```

Checks

- `grasp`, `release`, `hold` verbs exist and are declared by a gripper module. fileciteturn1file10
- Header lines end with `:` so the `when` block indents and executes. fileciteturn1file2
- Duration units are correct in any timeouts or retries. fileciteturn1file6

Corrections

- Add `on timeout:` after a `wait` or `expect` to handle slow perception. fileciteturn1file17
- Use `fallback:` to switch to `detect object "mug"` then `track object "mug"` before grasp. fileciteturn1file16

### 14.3 Vision and perception

Common symptoms

- `when object ... appears:` never fires.
- `detect` highlights but returns empty set.

Reproduce

```
start task "WatchForBottle"
  use module "Camera1"
  when object "bottle" appears:
    say "Found a bottle"
  on timeout:
    say "No detection; expanding search"
end task
```

Checks

- Grammar header must end with `:` and match `when`. fileciteturn1file1
- Verb exists in builtin list or in a perception module’s verbs (detect, locate, track, observe). fileciteturn1file10
- Consider confidence qualifiers like `probably` or `confidently` if your runtime supports them. fileciteturn1file4

Corrections

- Use `scan area "Table"` before `detect` to refresh the world model. fileciteturn1file4
- Add `every 2 s:` around detection to sample periodically. fileciteturn1file1

### 14.4 Dialogue, audio, and display

Common symptoms

- Nothing is spoken or displayed.
- User prompt never returns.

Checks

- `say`, `display`, `ask`, `notify` are built‑ins; ensure an audio/display module is present. fileciteturn1file10
- If waiting for input, pair `ask` with `expect` or `wait for` and add an `on timeout:` branch. fileciteturn1file4 fileciteturn1file17

Corrections

- Use string interpolation and double quotes per grammar. fileciteturn1file6
- Route time‑sensitive prompts via `detached run` to avoid blocking motion. fileciteturn1file17

### 14.5 Smart‑home and IoT control

Common symptoms

- `turn on "Lamp"` does nothing.
- `set "Thermostat" to 22` flagged as unknown verb.

Checks

- Built‑in verbs include `turn on`, `turn off`, `toggle`, `set`, `dim`, `brighten`. fileciteturn1file10
- A module must advertise those verbs and transport endpoints (REST, MQTT, etc.) in its manifest. Bindings are validated by the schema. fileciteturn1file16

Corrections

- Add or configure an IoT module with `capabilities[ ].verbs` including the required action and interface details. fileciteturn1file16

### 14.6 Healthcare and assistive operations

Common symptoms

- Monitoring task runs forever.
- Alerts not sent.

Checks

- Long‑running monitors should use `detached run` with explicit `on interruption:`. fileciteturn1file16
- Use verbs like `measure heart rate`, `notify`, `alert` where supported. fileciteturn1file10

Corrections

- Add `every 5 min:` sampling and `on timeout:` fallbacks. fileciteturn1file1

### 14.7 Hospitality, retail, and service

Checks

- `say`, `present`, `assign`, `dispatch` verbs exist in the builtin list; module coverage required for device operations. fileciteturn1file10
- Use `synchronize` to rendezvous before handovers. fileciteturn1file17

### 14.8 Industrial and warehouse operations

Checks

- `pick`, `place`, `align`, `scan`, `read` (barcode/qr) are recognized; ensure capability parameters (force, speed, units) comply with schema constraints. fileciteturn1file10 fileciteturn1file16

Corrections

- Promote reusable flows into `template task` and call them with parameters. fileciteturn1file4

### 14.9 Household and domestic tasks

Checks

- Use semantic selectors `object`, `area`, `surface`, `zone` and relations `on`, `in`, `near`, `within` as per grammar. fileciteturn1file6
- Add `every` for routines and `at time "HH:MM":` for schedules. fileciteturn1file1

### 14.10 Multi‑robot coordination

Checks

- Use `assign`, `dispatch task`, and `synchronize`. Guard shared resources with exclusive access or serialized `run` blocks inside `parallel`. fileciteturn1file10 fileciteturn1file17

### 14.11 System and utilities

Checks

- Use `reset`, `restart`, `shutdown`, `diagnose`, and `update firmware` where supported by modules. Validate permissions in manifests. fileciteturn1file10 fileciteturn1file16

## 15. Reference checklists

### 15.1 Style sanity check for authors

- Use double quotes for all string literals.
- Terminate every block header with a colon.
- Keep two‑space indentation.
- Prefer descriptive task names such as `start task "Pick Red Mug"`. These norms align with editor behavior and avoid spurious diagnostics. fileciteturn1file0

### 15.2 Settings reference for LSP and extension

- roop.format.enabled, roop.format.indentSize
- roop.lint.missingColon.severity, roop.lint.unbalancedTask.severity
- roop.completion.extraKeywords
- roop.server.trace, roop.server.extraArgs
- roop.validation.enable, roop.validation.maxProblems
- roop.snippets.enable
- `[roop]` editor defaults include `editor.formatOnSave` and semantic highlighting. fileciteturn1file9 fileciteturn1file10

### 15.3 Activation and contribution map

Language id `roop`, grammar `source.roop`, snippets, JSON validation for `*.roopmodule.json`, commands, menus, keybindings, views, tasks, problem matcher, walkthroughs. Confirm each path in `package.json` exists. fileciteturn1file9

### 15.4 Diagnostic catalogue

- roop.missingColon — header missing `:`; quick fix appends colon. fileciteturn1file13
- roop.unbalancedTask — unmatched `start task`/`end task`; quick fix inserts `end task`. fileciteturn1file13
- roop.unknownVerb — verb not recognized; install or edit module, or correct spelling. fileciteturn1file13

## 16. Appendices

### A. Minimal reproducer templates

Header/indentation

```roop
start task "HeaderIndentCheck"
  if object "mug" is on "Table":
    say "ok"
  else:
    say "not ok"
end task
```

Unknown verb

```roop
start task "UnknownVerbCheck"
  wobble Arm1 to "Table"
  on failure:
    say "unknown verb"
end task
```

Expected outcome: diagnostic roop.unknownVerb with quick guidance to add a module verb or fix the spelling. fileciteturn1file13

### B. Example module manifest fragments

Capability with verbs and parameters

```json
{
  "module": {
    "id": "loop.gripper.v2",
    "name": "Dual-Finger Gripper",
    "version": "2.1.0",
    "vendor": "Loop Robotics"
  },
  "capabilities": [
    {
      "id": "manipulation.grasp",
      "title": "Grasp object",
      "verbs": ["grasp", "release", "hold"],
      "parameters": [
        { "name": "gripper", "type": "string" },
        { "name": "pose", "type": "pose" },
        {
          "name": "force",
          "type": "number",
          "unit": "N",
          "minimum": 0,
          "maximum": 80,
          "default": 30
        }
      ]
    }
  ]
}
```

Validate against the bundled schema and add events/telemetry as needed. fileciteturn1file16

### C. Regular expressions used by the editor runtime

- Header increase indent and on‑enter patterns include `when`, `on`, `at`, `if`, `elseif`, `else`, `repeat`, `while`, `for`, `parallel`, `context`, `with timeout`, `every`, `sync when`, `detached run`, `await run`, `run`, `template task`, `start task`, `fallback`. fileciteturn1file2
- Duration token: `\b\d+(?:\.\d+)?\s*(?:ms|s|sec(?:onds?)?|m(?:in(?:utes?)?)?|h(?:ours?)?)\b`. fileciteturn1file6

---

End of handbook.
