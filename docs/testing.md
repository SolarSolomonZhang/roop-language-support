# ROOP Testing Guide

Version: 1.0  
Audience: Extension maintainers, language authors, and module providers who need deterministic, repeatable tests for the ROOP language, its VS Code tooling, and `.roopmodule.json` manifests.

This guide compiles and expands all testing‑related practices from this repository: the smoke test scaffold, the language configuration and grammar, the language reference (including testing constructs), package scripts, and the LSP design notes. It adds an end‑to‑end matrix so you can validate every class of human task the language is designed to express.

Primary sources include the existing `testing.md` smoke test note, Contributing and Getting Started guides, the language configuration and TextMate grammar, the language reference, the LSP design notes, the extension manifest (`package.json`), and the publishing quality gates. fileciteturn0file0 fileciteturn0file1 fileciteturn0file2 fileciteturn0file3 fileciteturn0file4 fileciteturn0file5 fileciteturn0file6 fileciteturn0file7 fileciteturn0file8 fileciteturn0file9

## Table of Contents

1. Goals and Scope
2. Quick Start  
   2.1 Local prerequisites  
   2.2 One‑command smoke test
3. Test Layers and What They Cover
4. Smoke Test (authoritative baseline)
5. Unit Tests: Scanner, Indentation, Diagnostics, Formatting
6. Grammar Tests: TextMate tokens and scopes
7. Language Configuration Tests: on‑enter, indent/outdent, folding markers
8. JSON Schema Tests for `.roopmodule.json`
9. LSP Integration Tests: completion, hover, code actions, symbols, folding, formatting
10. Manual E2E Checks in the Extension Development Host
11. Language‑level Test Catalog for Human Tasks  
    11.1 Motion and navigation  
    11.2 Manipulation and tool use  
    11.3 Vision and perception  
    11.4 Speech, audio, display, and interaction  
    11.5 Smart‑home and IoT  
    11.6 Healthcare and assistive flows  
    11.7 Hospitality, retail, service  
    11.8 Industrial and warehouse  
    11.9 Household and domestic routines  
    11.10 Multi‑agent coordination and system utilities
12. Testing Constructs in ROOP (DSL)
13. Performance and Reliability Tests
14. Security and Workspace Trust Tests
15. CI Configuration and Problem Matchers
16. Troubleshooting Failures
17. Appendices  
    A. Golden samples (fixtures) for unit and integration tests  
    B. Regex patterns used by the LSP (reference)  
    C. Minimal server skeleton for experimentation  
    D. Release quality gates that intersect testing

---

## 1. Goals and Scope

Testing serves three objectives:

1. Keep authoring stable while the language evolves (indentation, headers, scopes).
2. Validate the end‑to‑end experience: grammar, configuration, LSP, schema validation.
3. Exercise the full task surface of the language so authors can express real‑world behavior with confidence. fileciteturn0file5 fileciteturn0file6

## 2. Quick Start

### 2.1 Local prerequisites

- Visual Studio Code at or above the version declared in the extension engines. fileciteturn0file9
- Node.js LTS and npm.
- Optional: `@vscode/vsce` CLI for packaging (used later for CI and release checks). fileciteturn0file7

### 2.2 One‑command smoke test

Run:

```bash
npm test
```

This compiles TypeScript and verifies that the compiled client/server exist and the TextMate grammar loads as JSON. Expected artifacts: `out/extension.js`, `out/server.js`; validated file: `syntaxes/roop.tmLanguage.json`. fileciteturn0file0

The test script is wired via `package.json` scripts (`pretest` compiles, `test` runs the smoke). fileciteturn0file9

## 3. Test Layers and What They Cover

Layered approach recommended by the LSP notes and Contributing guide: fileciteturn0file5 fileciteturn0file1

- Type‑level checks: TypeScript strict compilation.
- Unit tests: line scanner, header detection, indentation calculator, formatter.
- Integration tests: LSP capabilities (completion, hover, diagnostics, code actions, folding, symbols, formatting).
- Asset tests: language configuration and grammar tokenization; schema validation for `.roopmodule.json`.
- End‑to‑end: open `.roop` and manifest files in an Extension Development Host and verify UX.
- Release checks: quality gates before publishing (see Section 15 and Appendix D). fileciteturn0file7

## 4. Smoke Test (authoritative baseline)

What it asserts:

- Client and server compile.
- `out/extension.js` and `out/server.js` exist.
- `syntaxes/roop.tmLanguage.json` is loadable JSON. fileciteturn0file0

Run: `npm test`. The script is declared in `package.json`, alongside `vscode:prepublish`, `compile`, and `check` tasks that are useful in CI. fileciteturn0file9

## 5. Unit Tests: Scanner, Indentation, Diagnostics, Formatting

Scope and references:

- Header detection: block headers recognized by the configuration and grammar (when, on, at, if, elseif, else, repeat, while, for, parallel, context, with timeout, every, sync when, detached run, await run, run, template task, start task, fallback). fileciteturn0file8 fileciteturn0file10
- Indentation/outdent rules (increase after header with `:`, decrease on `end task`, `elseif`, `else`). fileciteturn0file8
- Missing‑colon diagnostic and quick fix; unbalanced `start task`/`end task` diagnostic. fileciteturn0file5 fileciteturn0file6

Suggested cases:

1. Each header with and without the trailing colon. Expect a diagnostic and a quick‑fix edit when missing.
2. `elseif`/`else` alignment against `if` after Enter and after formatter.
3. Multi‑nesting with `parallel` and event blocks.
4. Formatter: two‑space indent by default; configurable indent width respected. fileciteturn0file9

Minimal golden for colon rule:

```roop
if surface "Countertop" is clear:
  say "ok"
elseif surface "Countertop" is cluttered:
  say "no"
else:
  say "maybe"
end task
```

## 6. Grammar Tests: TextMate tokens and scopes

Validate that the grammar scopes tokens consistently: headers, strings with interpolation, numbers, durations, operators, entities, actions, variables, punctuation. Use representative snippets and assert scopes at token positions. fileciteturn0file10

Example snippet that should exercise most categories:

```roop
start task "ScopesDemo"
  let attemptCount = 1
  say "Hello, {attemptCount}"
  if object "mug" is near area "Table":
    move Arm1 to "mug"
    grasp with Gripper1
    wait 200 ms
    release with Gripper1
  on failure:
    retry after 2 s
end task
```

Expected highlights: `start task` as header, `:` punctuation, double‑quoted strings with `{}` interpolation, numeric and duration tokens, logical/relational operators, entity selectors, and verbs under their respective scope names. fileciteturn0file10

## 7. Language Configuration Tests: on‑enter, indent/outdent, folding markers

Automate on‑enter tests:

- Typing Enter after a header ending with `:` indents one level.
- Typing `elseif:` or `else:` performs indent‑outdent.
- Typing `end task` auto‑outdents.
- Region folding via `// #region` and `// #endregion`. fileciteturn0file8

Also verify bracket/quote auto‑closing, colorized bracket pairs, and the word pattern used for selection. fileciteturn0file8

## 8. JSON Schema Tests for `.roopmodule.json`

Validate example manifests against the bundled schema: required `module` and `capabilities`; capability fields for verbs, parameters (types, units, ranges), resources, concurrency, safety, events, telemetry, permissions, dependencies, profiles, testing, examples. fileciteturn0file11

Programmatic approach (pseudo‑code):

```ts
import { readFileSync } from "node:fs";
import Ajv from "ajv";
const ajv = new Ajv({ allErrors: true, strict: false });
const schema = JSON.parse(
  readFileSync("schemas/roopmodule.schema.json", "utf8"),
);
const validate = ajv.compile(schema);
const sample = JSON.parse(readFileSync("examples/arm.roopmodule.json", "utf8"));
if (!validate(sample))
  throw new Error(JSON.stringify(validate.errors, null, 2));
```

The extension also wires JSON validation in `package.json` via `contributes.jsonValidation`, so an end‑to‑end check is to open a manifest and confirm squiggles/completions. fileciteturn0file9

## 9. LSP Integration Tests: completion, hover, code actions, symbols, folding, formatting

Focus areas from the LSP notes: fileciteturn0file5 fileciteturn0file6

- Completion: headers, verbs, selectors, and `roop.completion.extraKeywords`.
- Hover: short help for headers/verbs and links to reference docs.
- Diagnostics: `MissingColon` and `UnbalancedTask`; optionally unknown verb.
- Code actions: add `:` to header; insert `end task` at EOF; refactors like wrap‑in‑parallel.
- Formatting: indent widths, `elseif/else` alignment.
- Folding ranges and document symbols: task and nested blocks.

Run these in a headless language client test harness or as VS Code integration tests. Ensure settings like `roop.format.indentSize` and lint severities are honored at runtime. fileciteturn0file5

## 10. Manual E2E Checks in the Extension Development Host

Hands‑on verification flow: fileciteturn0file2

1. Press F5 to launch the Extension Development Host.
2. Create `demo.roop`; paste a minimal task and event blocks.
3. Verify: header highlighting, `:` increases indentation, `end task` outdents, folding works.
4. Create `demo.roopmodule.json`; verify schema validation and completions.
5. Use commands from the palette (Insert Task Block, Open Language Reference, Validate Current Document, etc.). fileciteturn0file9

## 11. Language‑level Test Catalog for Human Tasks

This catalog ensures coverage across what authors do in the real world. It is organized around the capability categories defined by the language reference and the built‑in verb inventory in the extension manifest. fileciteturn0file4 fileciteturn0file9

For each category below:

- Provide at least one positive path and one failure path.
- Include an event‑driven variant (`when`), a scheduled variant (`at time`), and a guarded variant (`if`).
- Include concurrency where natural (parallel, await run, detached run).
- Include recovery (`on failure`, `on timeout`, `retry`/`fallback`). fileciteturn0file4

### 11.1 Motion and navigation

Key verbs: move, navigate, follow, avoid, dock, undock, rotate, stop. fileciteturn0file4

```roop
testcase "NavigateToCharger"
  simulate area "ChargingDock" is reachable
  run task "GoCharge"
  expect navigate to "ChargingDock"

start task "GoCharge"
  navigate to "ChargingDock"
end task
```

Failure and recovery:

```roop
start task "GoChargeRobust"
  navigate to "ChargingDock"
  on timeout:
    say "Path blocked, trying again."
    retry after 5 s
end task
```

### 11.2 Manipulation and tool use

Key verbs: grasp, release, pick, place, push, pull, open, close, pour, align. fileciteturn0file4

```roop
testcase "PickRedMug"
  simulate object "mug" with color "red" on "Table"
  run task "PickRedMug"
  expect move Arm1 to "mug"
  expect release with Gripper1 at "Tray"

start task "PickRedMug"
  use module "Arm1"
  use module "Gripper1"
  when object "mug" with color "red" appears on "Table":
    move Arm1 to "mug"
    grasp with Gripper1
    move Arm1 to "Tray"
    release with Gripper1
end task
```

### 11.3 Vision and perception

Key verbs: scan, detect, locate, track, read, count, measure. fileciteturn0file4

```roop
testcase "ScanAndCountPlates"
  simulate objects "plate" on "Table" count 4
  run task "CountPlates"
  expect say "Found 4 plates."

start task "CountPlates"
  let plates = detect all object "plate" on "Table"
  say "Found {plates.count} plates."
end task
```

### 11.4 Speech, audio, display, and interaction

Verbs: say, display, notify, ask, listen. fileciteturn0file4

```roop
testcase "AskDrinkChoice"
  run task "DrinkChoice"
  expect say "Preparing tea."

start task "DrinkChoice"
  ask "Tea or coffee?" as drink
  say "Preparing {drink}."
end task
```

### 11.5 Smart‑home and IoT

Verbs: turn on/off, set, adjust, dim, brighten, open/close blinds. fileciteturn0file4

```roop
start task "MorningLights"
  at time "07:00":
    turn on "LightKitchen"
end task
```

### 11.6 Healthcare and assistive flows

Verbs: notify caregiver, dispense, measure vitals, guard, patrol. fileciteturn0file4

```roop
start task "VitalsReminder"
  every 30 min:
    say "Time to check vitals."
    measure heart rate for "Patient"
  on failure:
    notify caregiver "Unable to measure vitals."
end task
```

### 11.7 Hospitality, retail, service

Verbs: greet, serve, inventory, checkout. fileciteturn0file4

```roop
start task "GreetAtDoor"
  when human appears near "Door":
    say "Hello, welcome"
end task
```

### 11.8 Industrial and warehouse

Verbs: palletize, scan barcode, verify torque, quality inspect. fileciteturn0file4

```roop
start task "Palletize"
  call "PickAndPlace"(object "box", "Pallet")
end task
```

### 11.9 Household and domestic routines

Verbs: clean, wipe, collect toys, make coffee, laundry. fileciteturn0file4

```roop
start task "CollectToys"
  let toys = detect all object "toy" on "Floor"
  for t in toys:
    move Arm1 to t
    grasp with Gripper1
    place t in "Bin"
end task
```

### 11.10 Multi‑agent coordination and system utilities

Verbs: assign, dispatch, synchronize; utilities like update firmware and diagnose. fileciteturn0file4

```roop
start task "TwoBots"
  assign "BotA" as surveyor
  assign "BotB" as carrier
  parallel:
    dispatch task "ScanRoom" to BotA
    dispatch task "FetchObject" to BotB
  synchronize at "Exit"
end task
```

## 12. Testing Constructs in ROOP (DSL)

The language reference includes a testing block shape with `testcase`, `simulate`, `run task`, and `expect`. Use it to bind simulated world state, execute a task, and assert observable outcomes such as action invocations or final states. A runner can collect pass/fail and coverage. fileciteturn0file4 fileciteturn0file12

Example:

```roop
testcase "PickPlates" for task "CleanPlates"
  simulate object "plate" on "Table"
  run task "CleanPlates"
  expect move Arm1 to "Table"
  expect release with Gripper1 at "Sink"
```

Guidelines: keep simulations focused, assert the smallest signal that proves intent (an action line or a resulting state), and always include timeout/failure paths when the task waits on external events. fileciteturn0file4

## 13. Performance and Reliability Tests

Recommended by the LSP notes: keep analysis linear; cap diagnostic passes and folding after a time budget; test incremental sync and debounce behavior. Include a large‑file scenario to verify that partial symbols and folding degrade gracefully. fileciteturn0file5

Performance checklist:

- O(n) full scans; incremental updates confined to nearby blocks.
- Formatting stability under rapid edits.
- Completion responsiveness on trigger characters. fileciteturn0file5

## 14. Security and Workspace Trust Tests

In untrusted workspaces, ensure the server never executes workspace code or makes network calls; tests should open documents and assert that only in‑memory analysis occurs. Verify jsonValidation and formatting still function. fileciteturn0file5

## 15. CI Configuration and Problem Matchers

Use the example GitHub Actions workflow to build, package, and optionally publish; insert smoke/unit/integration steps before packaging. fileciteturn0file7

- Scripts available: `compile`, `watch`, `lint`, `format`, `check`, `vscode:prepublish`, `test`. fileciteturn0file9
- Problem matcher `$roop-lsp` can surface diagnostics with file, line, column, severity, and message in CI logs. fileciteturn0file9

## 16. Troubleshooting Failures

- Extension not activating or tests see no language features: ensure a `.roop` file is open or workspace contains the expected patterns. fileciteturn0file1
- Indentation or on‑enter anomalies: confirm header lines end with `:`; review `language-configuration.json` patterns. fileciteturn0file3
- Highlighting mismatches: check the grammar repository entries for new keywords and header termination rules. fileciteturn0file1 fileciteturn0file10
- JSON validation squiggles: open Problems and compare against the module schema sections for the offending path. fileciteturn0file11
- Command visibility: check `package.json` contributions and `when` clauses. fileciteturn0file9

## 17. Appendices

### A. Golden samples (fixtures) for unit and integration tests

Keep small, focused files to pin behavior.

1. `hello.roop`

```roop
start task "HelloWorld"
  say "Hello, world."
end task
```

2. `headers.roop` (all headers end with `:`; include `elseif`/`else` and `end task` cases). fileciteturn0file8
3. `durations.roop` (numbers and durations such as `200 ms`, `5 s`, `2 min`, `1 h`). fileciteturn0file10
4. `selectors.roop` (object/area/surface/zone/label/pose/reference with relations like in/on/near). fileciteturn0file10
5. `errors.roop` (on failure, on timeout, retry, fallback). fileciteturn0file10
6. `parallel.roop` (parallel, await run, detached run, synchronize). fileciteturn0file10
7. `module.arm.roopmodule.json` (capabilities with verbs, parameters with units/ranges, safety limits, events). fileciteturn0file11

### B. Regex patterns used by the LSP (reference)

Header increase/decrease indent and word pattern are published in the LSP design and language configuration. Use them when authoring unit tests that mirror editor behavior. fileciteturn0file5 fileciteturn0file8

### C. Minimal server skeleton for experimentation

A compact server skeleton is provided in the LSP notes to bootstrap feature tests and diagnostics. It shows incremental sync, a missing‑colon rule, and publishDiagnostics flow. fileciteturn0file5

### D. Release quality gates that intersect testing

Before publishing, validate grammar coverage, language configuration behavior, schema binding, and an end‑to‑end authoring scenario in VS Code or Insiders. These gates are listed in the Publishing guide and should be enforced in CI. fileciteturn0file7

---

Conventions to keep tests consistent:

- Use double quotes for ROOP strings.
- Terminate block headers with trailing colons.
- Default indentation is two spaces (configurable).  
  These are style rules that tests should assume and assert. fileciteturn0file14
