# Contributing to ROOP Language Support

This document explains how to build, test, lint, extend, and release the Visual Studio Code extension and the language assets that power the ROOP DSL. It is designed to be practical and exhaustive so that new and experienced contributors can confidently change any part of the project.

## Table of Contents

1. Core Principles
2. Repository Layout
3. Prerequisites and Local Setup
4. How to Build and Run (Extension Host)
5. Development Workflow
6. Coding Standards
7. Commit Convention and Pull Requests
8. Testing and Validation
9. Working on Language Assets
   9.1 Language Configuration (indentation, comments, brackets)  
   9.2 TextMate Grammar (syntax highlighting)  
   9.3 JSON Schemas for `.roopmodule.json`  
   9.4 Example Module Manifests
10. Working on the Client and Server
    10.1 VS Code client (extension)  
    10.2 Language Server (LSP)
11. Commands, Menus, Keybindings, Views
12. JSON Validation for Module Files
13. Project Tasks and Automation
14. Documentation and Examples
15. Versioning and Release
16. Security, Conduct, and Responsible Disclosure
17. Troubleshooting
18. Maintainers’ Checklist

---

## 1. Core Principles

ROOP is a task-oriented DSL. The extension aims to make authoring ROOP scripts productive by providing predictable formatting rules, strong syntax highlighting, completions, diagnostics, and schema-backed validation. Every contribution should improve one or more of the following: clarity, correctness, performance, stability, or user experience.

## 2. Repository Layout

Typical top-level structure (paths may vary by workspace):

- `src/extension.ts` — VS Code client: activation, commands, registrations, views.
- `src/server.ts` — Language Server (LSP): completion, hover, diagnostics, folding, formatting, quick fixes.
- `syntaxes/roop.tmLanguage.json` — TextMate grammar for `.roop`.
- `language-configuration.json` — editor behaviors (comments, brackets, on-enter, folding, word pattern).
- `schemas/roopmodule.schema.json` — JSON schema for `*.roopmodule.json`.
- `examples/` — sample `.roop` scripts and module manifests.
- `docs/` — documentation, guides, and walkthroughs.
- `package.json` — extension manifest: languages, grammars, snippets, JSON validation, commands, menus, keybindings, views.
- `tsconfig.json` — TypeScript compiler options.
- `CHANGELOG.md`, `README.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE` — project metadata and policies.

## 3. Prerequisites and Local Setup

- Visual Studio Code, version compatible with the extension’s `engines.vscode` (or newer).
- Node.js LTS (recommended) and npm.
- Git tooling.
- Optional: `vsce` for packaging and publishing.

Steps:

1. Clone the repository.
2. `npm install` to restore dependencies.
3. Open the folder in VS Code.
4. Press `F5` to launch the Extension Development Host (a second VS Code window).

## 4. How to Build and Run (Extension Host)

- Build once: `npm run compile`.
- Build and watch: `npm run watch` (if available).
- Start the extension host: Press `F5` or run the “Run Extension” launch configuration.
- Open any `.roop` file in the Extension Development Host to verify activation, syntax highlighting, indentation rules, and LSP features.

## 5. Development Workflow

1. Create a feature branch from the default branch.
2. Make focused changes with tests or samples when possible.
3. Run local validation (build, lint, schema checks).
4. Update documentation affected by your change.
5. Commit using the conventional commit convention.
6. Open a pull request with a clear description, screenshots or GIFs for UI changes, and references to issues.
7. Address review feedback and keep commits small and meaningful.

## 6. Coding Standards

- TypeScript in strict mode.
- Prefer pure functions and small modules for scanners, formatters, and analyzers.
- No unused dependencies; keep extension activation lightweight.
- Names are descriptive, stable, and match the language terminology.
- Formatting: use Prettier; lint with ESLint (`npm run lint`) if configured.
- Tests and examples should demonstrate real author scenarios and edge cases.

## 7. Commit Convention and Pull Requests

Use Conventional Commits to enable automated changelog and release notes.

- `feat:` new user-facing capability or language behavior
- `fix:` bug fix
- `docs:` documentation change only
- `chore:` tooling/build/infra changes
- `refactor:` code change without behavior change
- `perf:` performance improvement
- `test:` add or refactor tests

Pull Request checklist:

- All builds pass.
- Linting passes.
- New grammar or schema additions come with examples and comments.
- Any new commands appear in `package.json` and have user-facing titles and appropriate `when` conditions.
- README and docs updated to match new behavior.
- If the change affects end users, add an entry in `CHANGELOG.md` and bump `package.json` version accordingly (SemVer).

## 8. Testing and Validation

Recommended layers:

- Type-level checks via TypeScript.
- Unit tests for helpers, scanners, and formatters when applicable.
- End-to-end checks: open `.roop` files and verify highlighting, indentation, and folding.
- Schema validation: open `*.roopmodule.json` to verify squiggles and completions.
- Smoke tests: run quick scripts or scenarios that exercise activation, grammar loading, and validation.

Example manual smoke steps:

1. Launch Extension Host (`F5`).
2. Create a new file `demo.roop` and paste minimal task and event examples.
3. Verify block headers highlight; typing `:` after `when`, `if`, `parallel` increases indent; `end task` reduces indent.
4. Create `demo.roopmodule.json` and confirm JSON validation and completion suggestions.

## 9. Working on Language Assets

### 9.1 Language Configuration (indentation, comments, brackets)

`language-configuration.json` controls editor behavior. Typical elements you will see and may extend:

- Line comments: `//`
- Bracket and quote pairs: `{}`, `[]`, `()`, `" "`, `' '`
- Auto-closing and surrounding pairs for brackets and quotes
- Colorized bracket pairs for readability
- Word pattern to help selection and navigation
- Indentation and on-enter rules for block headers (e.g., `when`, `on`, `at`, `if`, `elseif`, `else`, `repeat`, `while`, `for`, `parallel`, `context`, `with timeout`, `every`, `sync when`, `detached run`, `await run`, `run`, `template task`, `start task`, `fallback`, `end task`)
- Folding markers for `// #region` and `// #endregion`

Guidelines:

- Add a new block keyword to both the increase-indent pattern and on-enter rules to keep typing behavior consistent.
- Keep patterns readable; test with tricky whitespace and comments.
- Document any non-obvious regular expressions inline with comments when possible.

### 9.2 TextMate Grammar (syntax highlighting)

`syntaxes/roop.tmLanguage.json` defines scopes for highlighting. Key areas to evolve:

- Comments and punctuation.
- Block headers: a `begin` pattern that captures the header keyword, arguments, and trailing colon.
- String literals with `{}` interpolation support.
- Numeric literals and durations (e.g., `200 ms`, `5 s`, `2 min`).
- Operators: logical (`and`, `or`, `not`), comparison (`==`, `!=`, `<=`, `>=`, `<`, `>`), membership (`in`, `contains`), relational prepositions (`is`, `near`, `before`, `after`, `between`, `within`, `as`, `to`, `from`, `by`, `with`, `over`, `under`, `around`, `across`, `through`, `onto`, `into`, `relative to`, `anchor on`).
- Action verbs, spatial selectors, entities, and variables repositories.
- Termination of header blocks and nesting behavior.

Guidelines:

- Scope names should be consistent and conventional (`keyword.control.header.roop`, `string.quoted.double.roop`, `meta.interpolation.roop`).
- Whenever you add a new keyword or construct, ensure it appears in the appropriate repository section and that header termination rules still hold.
- Validate with a representative set of `.roop` samples covering tasks, triggers, control flow, concurrency, and error paths.

### 9.3 JSON Schemas for `.roopmodule.json`

The schema governs module manifests. It must remain backward-compatible unless the major version changes. It typically includes:

- `module` metadata (id, name, version, vendor, description, category, optional hardware/software details, geometry, lifecycle, UI metadata).
- Integration interfaces (ROS topics/services/actions; REST endpoints; gRPC; serial; MQTT).
- `capabilities` with verbs, parameters (types, units, ranges, defaults), preconditions, effects, returns, QoS, resources, concurrency, safety, examples, and implementation hints.
- Optional: events, telemetry, errors, permissions, dependencies, profiles, testing, examples, and free-form notes.

Guidelines:

- Add new enum values or fields with clear descriptions and defaults where possible.
- Keep `additionalProperties` usage deliberate to avoid silent typos.
- Provide small, real examples for any new capability or interface.
- Update editor completions and docs when the schema evolves.

### 9.4 Example Module Manifests

Keep an up-to-date example (such as a 6‑DoF arm) that demonstrates best practices:

- Clear `module` metadata and geometry.
- Interfaces covering multiple transports (ROS, REST, gRPC, serial, MQTT) when applicable.
- Capabilities that show verbs, parameters with units and bounds, resources and concurrency, safety limits, and examples with ROOP snippets.
- Profiles for different operating contexts, plus testing notes and sample scenarios.

## 10. Working on the Client and Server

### 10.1 VS Code client (extension)

- Activation events: language presence, workspace patterns, and commands.
- Contributions: languages, grammars, snippets, JSON validation; menus for editor title and context; command palette entries; activity bar container and views.
- Keybindings should be discoverable and non-conflicting.
- Keep activation fast; lazy-load heavy features.

### 10.2 Language Server (LSP)

- Offer completion for block headers, verbs, selectors, and schema-backed properties.
- Provide diagnostics that are precise and actionable.
- Folding and document symbols should reflect block structure.
- Formatting rules should be conservative and predictable; always safe to run on save.
- Quick fixes and code actions should suggest common transformations and repairs.

## 11. Commands, Menus, Keybindings, Views

Typical commands surfaced by the extension include:

- Insert Task Block
- Create Example Project
- Open Language Reference
- Run Current Task
- Validate Current Document
- Scan and Register Modules
- Generate `.roopmodule.json`

Menus may appear in the editor title, editor context, and explorer context; views include Modules, Tasks, and World Model in a dedicated ROOP activity bar container. Default keybindings should be documented alongside menu placement.

## 12. JSON Validation for Module Files

Files matching `**/*.roopmodule.json` should validate against the bundled schema. Contributors adding schema keywords must also ensure:

- The `jsonValidation` contribution points to the correct schema path.
- New fields receive completion items and hover descriptions.
- Examples in `examples/` cover new fields, units, and types.

## 13. Project Tasks and Automation

Package scripts typically include builds, type checks, and formatter/linter tasks. When adding new scripts, prefer descriptive names and wire them into CI where available. Keep smoke tests fast and deterministic.

## 14. Documentation and Examples

- Update `README.md` when user-facing behavior changes.
- Keep examples small but meaningful, demonstrating tasks, triggers, control flow, concurrency, events, and error handling.
- Add walkthroughs or step-by-step guides for new major features.
- Cross-link docs from views and commands where it helps discovery.

## 15. Versioning and Release

- Follow SemVer for `package.json` version bumps.
- Maintain `CHANGELOG.md` with user-visible changes.
- Package with `vsce package` to produce a `.vsix`.
- Test the `.vsix` locally (`code --install-extension <file>.vsix`).
- Publish via `vsce publish` when ready and authorized.

## 16. Security, Conduct, and Responsible Disclosure

- Security issues should be reported privately per `SECURITY.md`.
- All participation is governed by the project’s Code of Conduct.
- Avoid committing secrets or private endpoints; prefer environment variables and sample values.

## 17. Troubleshooting

- Extension not activating: confirm a `.roop` file is open or the workspace contains the expected file patterns.
- Indentation or on-enter behavior looks off: review `language-configuration.json` patterns and test with minimal samples.
- Syntax highlighting glitches: check that new keywords are included in the correct grammar repository section and that block termination rules still match.
- JSON validation squiggles: use Problems view for the offending path; compare with schema examples.
- Commands not visible: confirm `when` clauses and menu placement; verify keybindings do not conflict.

## 18. Maintainers’ Checklist

- Keep the grammar and language configuration in sync with the language reference and examples.
- Ensure schema changes ship with examples and documentation updates.
- Verify commands, views, and validation contributions are consistent across the client and server.
- Maintain fast activation and a small bundle size where possible.
- Keep CI green; address flaky tests quickly.
- Prefer incremental, reviewable pull requests to large rewrites.

---

Thank you for contributing to ROOP Language Support. Thoughtful changes here directly help authors build safer, clearer, and more capable robot behaviors.
