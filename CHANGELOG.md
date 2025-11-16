# Changelog

All notable changes to this repository are documented in this file. The project follows Semantic Versioning. Dates are in ISO 8601 (YYYY‑MM‑DD).

This changelog covers the VS Code extension, the ROOP language surface as implemented here, the JSON schema for `.roopmodule.json`, the example modules, and the editor grammar/configuration that together enable authoring and validating ROOP scripts.

## Table of Contents

- [Unreleased](#unreleased)
- [0.4.0 — 2025-11-02](#040--2025-11-02)
  - [Language and semantics](#language-and-semantics)
  - [Syntax highlighting and grammar](#syntax-highlighting-and-grammar)
  - [Editor configuration](#editor-configuration)
  - [VS Code extension](#vs-code-extension)
  - [Module schema](#module-schema)
  - [Example modules](#example-modules)
  - [Diagnostics and tasks](#diagnostics-and-tasks)
  - [Documentation](#documentation)
  - [Security and permissions](#security-and-permissions)
  - [Breaking changes](#breaking-changes)
  - [Migration guide](#migration-guide)
- [Earlier previews (≤ 0.3.x)](#earlier-previews--03x)
  - [Highlights](#highlights)
  - [Known gaps resolved since early previews](#known-gaps-resolved-since-early-previews)
- [Acknowledgements](#acknowledgements)

---

## Unreleased

Planned work and candidates for the next minor version:

- Language server quality-of-life: richer hover for capability signatures, improved diagnostic ranges, quick‑fixes for missing colons on block headers.
- Grammar coverage: optional highlighting for future constructs such as resource locks and cooperative barriers consistent with the language reference.
- Schema ergonomics: additional parameter units and composite types (angles with degrees/radians, force/torque vectors) and improved enum completions.
- Walkthroughs: add a “Write your first module” guided flow and a “Test with smoke scripts” step.
- CLI/Tasks: dry‑run validation that prints the derived behavior graph for a `.roop` task.

---

## 0.4.0 — 2025-11-02

### Language and semantics

This release aligns the language implementation with the current reference, focusing on task‑centric authoring with events, guards, concurrency, and structured recovery.

- Tasks and templates
  - `start task "Name"` … `end task` defines runnable tasks.
  - `template task "Name"(params):` enables reusable plans; templates can be invoked with arguments.
- Control flow
  - `if / elseif / else` guards.
  - Iteration with `repeat N times`, `while`, and `for x in collection`.
- Triggers and timing
  - Event‑driven: `when`, named events via `on "eventName":`.
  - Temporal: `at "HH:MM"`, periodic `every 5 min:`.
  - Synchronization trigger: `sync when condition:`.
- Concurrency and orchestration
  - `parallel:` to run branches concurrently.
  - `run`, `await run`, and `detached run` to control subtask lifecycles.
- Error handling and resilience
  - Structured blocks such as `on failure:`, `with timeout 10 s:`, `retry`, and `fallback:`.
- Selectors and the world model
  - Semantic selectors for `object`, `area`, `surface`, `zone`, `label`, `pose`, with relations like `on`, `in`, `near`, `between`, `within`.
- Literals and expressions
  - Numbers (ints and floats), durations (`200 ms`, `5 s`, `2 min`, `1 h`), strings with interpolation (`"pose is {x}"`), booleans, and null.
- Capability catalog orientation
  - Patterns for motion, manipulation, perception, HRI/UI, smart‑home/IoT, assistance, hospitality/retail, industrial/logistics, household/cleaning, education/demonstration, and safety/compliance.

These features reflect the language’s goal/place/moment triad: say _what_ to achieve, _where_ to act, and _when_ to respond.

### Syntax highlighting and grammar

TextMate grammar now provides comprehensive tokenization for authoring `.roop`:

- Block headers recognized as structural starts (colon‑terminated): `when`, `on`, `at`, `if`, `elseif`, `else`, `repeat`, `while`, `for`, `parallel`, `context`, `with timeout`, `every`, `sync when`, `detached run`, `await run`, `run`, `template task`, `start task`.
- String handling: double‑quoted strings with escapes and `{…}` interpolation segments that can contain variables, numbers, operators, and entity selectors.
- Numbers: integers and floating‑point forms.
- Durations: `ms`, `s`, `sec`, `m`, `min`, `h`, `hours`.
- Operators: logical (`and`, `or`, `not`), comparisons (`==`, `!=`, `<`, `<=`, `>`, `>=`), membership (`in`, `contains`), and relational prepositions (`is`, `near`, `before`, `after`, `between`, `within`, `as`, `to`, `from`, `by`, `with`, `over`, `under`, `around`, `across`, `through`, `onto`, `into`, `relative to`, `anchor on`).
- Declarations: `let` variable declarations and `use module` lines.
- Entity and spatial categories are highlighted to improve readability of action lines like `move Arm1 to pose "TrayPickup"` or `grasp with Gripper1`.
- Punctuation scopes for colons and other separators are tuned for consistent theming.

### Editor configuration

A refined `language-configuration.json` drives a predictable authoring experience:

- Line comments with `//`.
- Bracket pairs and quote pairs auto‑close; surrounding pairs enable quick wrap/unwrap.
- Colorized bracket pairs for `{}`, `[]`, `()`.
- Word pattern tuned for identifiers and numeric tokens to improve selection and navigation.
- Indentation rules:
  - Increase indent after block headers and `run`‑style headers that end with `:`.
  - Outdent on `end task` and perform indent‑outdent for `elseif:` and `else:` transitions.
  - Unindented lines for blank or comment‑only lines to prevent drift.
- On‑enter rules mirror indentation behavior for headers, branch changes, and closing lines.
- Folding:
  - Off‑side folding aligned with indentation.
  - Region markers supported via `// #region` … `// #endregion`.

### VS Code extension

Extension contribution points and runtime behavior in this release:

- Activation: on `roop` language, presence of `.roop` or `.roopmodule.json`, and on key commands.
- Grammar: `source.roop` TextMate grammar is bundled.
- Language configuration is registered for `.roop` files.
- Snippets: `snippets/roop.code-snippets`.
- JSON validation: `**/*.roopmodule.json` validated against the bundled schema.
- Commands:
  - `ROOP: Insert Task Block`
  - `ROOP: Create Example Project`
  - `ROOP: Open Language Reference`
  - `ROOP: Run Current Task`
  - `ROOP: Validate Current Document`
  - `ROOP: Scan and Register Modules`
  - `ROOP: Generate .roopmodule.json`
- Menus and keybindings: editor title/context entries and defaults for insert, docs, and validate actions.
- Views:
  - Activity Bar container “ROOP” with **Modules**, **Tasks**, and **World Model**.
  - Welcome content in **Modules** view when no modules are detected.
- Tasks and problem matcher:
  - `type: roop` with `command` in `{ compile | validate | format | run }`.
  - `$roop-lsp` problem matcher for diagnostic integration.
- Engine compatibility: VS Code `^1.84.0`.
- Dependencies and workspace support:
  - Depends on `redhat.vscode-yaml` for YAML experiences where applicable.
  - Untrusted workspaces supported; virtual workspaces disabled.

### Module schema

The bundled JSON Schema for `.roopmodule.json` enables IntelliSense and validation:

- Top‑level fields: `schemaVersion`, `module`, `interfaces`, `capabilities`, `events`, `telemetry`, `errors`, `safety`, `permissions`, `dependencies`, `profiles`, `testing`, `examples`, and `x-notes`.
- `module` metadata covers `id`, `name`, `version`, `vendor`, `description`, `category`, and optional `hardware`, `software`, `geometry`, `lifecycle`, `ui` descriptors.
- `interfaces` support ROS (topics, services, actions, namespace), REST (baseUrl, endpoints), gRPC (host, port, package), serial (port, baud, protocol), and MQTT (broker, topics).
- `capabilities` describe verbs, parameters (type, unit, ranges, defaults, enums), preconditions/effects, return types, QoS, resource constraints and concurrency, safety constraints, and examples.
- Events and telemetry model asynchronous messages and data streams.
- Profiles let you publish context‑specific defaults and limits (for example, “home” vs “factory”).
- Testing and examples are optional but encouraged for tooling and onboarding.

### Example modules

A complete 6‑DoF arm module is included as a worked example:

- Hardware and geometry descriptors with reach, payload, frames, and mounting.
- Interfaces include ROS topics, services, and actions; REST endpoints; optional gRPC, serial, and MQTT links.
- Capabilities:
  - `manipulation.move` with signature `move {arm} to {target}`; parameters for speed, acceleration, tolerance, frame; exclusive access and a queued concurrency policy.
  - `manipulation.grasp` with force and timeout parameters; success/failure events.
- Safety: e‑stop support, speed/force limits, hazard notes, and safe zones.
- Returns and QoS are modeled for predictable orchestration.
- Example ROOP snippets illustrate typical usage patterns.

### Diagnostics and tasks

- `$roop-lsp` problem matcher normalizes diagnostics as `file:line:column - (warning|error) message` to integrate with the Problems panel.
- Workspace tasks of `type: roop` route to the CLI or language server to compile, validate, format, or run the current document.

### Documentation

- “ROOP Language Reference” is included to specify lexical rules, statements, triggers, concurrency, selectors, testing constructs, and the capability catalog. It serves as the normative language description used by the extension.
- The README consolidates quick start, editor integration, capability‑oriented patterns, and packaging instructions for the extension.

### Security and permissions

- Untrusted workspace support is enabled; the extension restricts features appropriately.
- The module schema’s `permissions` list allows explicit declaration of resources required by a module (camera, mic, network).

### Breaking changes

- Colon‑terminated block headers are consistently required to enable correct indentation and folding behavior.
- Some older, ad‑hoc keywords are superseded by the standardized header set listed in this release. If your theme relied on legacy scopes, update customizations to the new scope names exposed by `source.roop`.

### Migration guide

1. Ensure every block header ends with a colon and that `end task` is used to close task scopes.
2. Replace any custom or alias keywords with the standardized set (see “Syntax highlighting and grammar”).
3. Validate your `.roopmodule.json` against the bundled schema; add missing required fields and move implementation details into `interfaces` and capability `x-impl` notes where appropriate.
4. Adopt workspace tasks with `type: roop` for compile/validate/format/run flows.
5. If you highlight custom entity categories, update tokenization to the current scope names.

---

## Earlier previews (≤ 0.3.x)

### Highlights

- Prototyping of tasks, triggers (`when`, `on`, `at`), and simple concurrency with `parallel` and `await run`.
- Initial grammar for strings, numbers, durations, and basic operators.
- Minimal editor configuration with line comments and paired brackets.
- Early `.roopmodule.json` schema drafts with `module`, `capabilities`, and `events` only.
- Preliminary example modules and snippets.

### Known gaps resolved since early previews

- Consolidated indentation and on‑enter rules for `elseif:` and `else:` branches.
- Added `detached run`, `with timeout`, `sync when`, and `context` to recognized headers.
- Introduced colorized bracket pairs, region folding markers, and a tuned word pattern.
- Expanded module schema with interfaces (ROS, REST, gRPC, serial, MQTT), telemetry, safety, permissions, dependencies, profiles, testing, and examples.
- Added `$roop-lsp` problem matcher and `type: roop` tasks.

---

## Acknowledgements

Loop Robotics team and early users who provided feedback on the language, the editor experience, and the module schema.
