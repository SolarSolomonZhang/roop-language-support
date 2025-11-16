# Contributing to ROOP Language Support

This guide explains how to develop, test, document, and release changes to the ROOP Language Support project. It covers language surface changes, VS Code extension wiring, JSON schema evolution, module examples, documentation, testing, security, and release management.

## Table of Contents

1. Scope and Principles
2. Ground Rules
3. Project Layout
4. Prerequisites and Tooling
5. Getting Started
6. Building and Running in VS Code
7. Coding Standards
8. Working on the Language
   8.1 Design first: update the Language Reference  
   8.2 TextMate grammar: tokens and block headers  
   8.3 Language configuration: indentation, comments, pairs  
   8.4 LSP diagnostics, completion, and formatting  
   8.5 Snippets and samples  
   8.6 JSON schema for `.roopmodule.json`  
   8.7 Module examples and profiles  
   8.8 Capability catalog and task patterns
9. Testing Strategy
   9.1 Smoke tests  
   9.2 Unit and integration tests  
   9.3 Grammar and indentation tests  
   9.4 JSON schema validation tests
10. Adding or Changing Features
    10.1 Add a new trigger keyword  
    10.2 Add a new verb/action token  
    10.3 Add a new indentation rule  
    10.4 Extend the module manifest schema  
    10.5 Add a new extension command or view
11. Documentation Standards
12. Versioning, Changelog, and Releases
13. Issue Triage and Pull Requests
14. Security and Responsible Disclosure
15. Licensing and Attribution
16. Maintainer Checklist

---

## 1. Scope and Principles

ROOP is a task‑oriented DSL for robotics and automation. Contributions should improve clarity, predictability, and task‑centric ergonomics while keeping the language small and composable. Prefer intent‑level primitives over device‑level APIs. Keep the learning curve low; favor consistent syntax and predictable editor behavior.

## 2. Ground Rules

- Follow the Code of Conduct (`CODE_OF_CONDUCT.md`).
- Keep all docs and in‑repo examples in English.
- Maintain backward compatibility when possible. If a breaking change is unavoidable, gate it behind a version flag and document migration steps.
- Prefer additive grammar changes over semantic redefinitions.
- Changes to public schemas require tests and version bumps.

## 3. Project Layout

- `src/extension.ts` – extension bootstrap and client wiring
- `src/server.ts` – language server (completion, hover, diagnostics, formatting)
- `syntaxes/roop.tmLanguage.json` – TextMate grammar
- `language-configuration.json` – editor indentation, comments, brackets, on‑enter rules
- `schemas/roopmodule.schema.json` – JSON Schema for `.roopmodule.json`
- `examples/` – sample `.roop` scripts and module manifests
- `docs/language-reference.md` – normative grammar and semantics
- `arm.roopmodule.json` – mechanical arm example manifest
- `smoke-test.js` – CLI smoke test for basic flows
- `package.json` – VS Code contribution points, commands, views, validation, and engine constraints

## 4. Prerequisites and Tooling

- Node.js LTS and npm.
- Visual Studio Code 1.84 or newer.
- Optional: `vsce` for packaging the extension.
- Recommended: ESLint and Prettier extensions for VS Code.

## 5. Getting Started

Clone the repository and install dependencies:

```bash
npm install
```

Compile the extension:

```bash
npm run compile
```

Launch the Extension Development Host:

1. Open the folder in VS Code.
2. Press F5 to start the Extension Development Host.
3. Open a `.roop` or `.roopmodule.json` file to activate the extension.

## 6. Building and Running in VS Code

- Build: `npm run compile`
- Optional continuous build: `npm run watch` (if available)
- Run LSP server in dev host by pressing F5.
- Validate JSON manifests by opening any `*.roopmodule.json` file; schema validation and completions should appear automatically.
- Run the smoke script: `node smoke-test.js`

## 7. Coding Standards

- TypeScript strict mode.
- Prefer pure functions for scanners, formatters, and validators.
- Keep TextMate regex rules specific and anchored.
- Avoid ambiguous token categories; choose one clear scope for each new token.
- Limit regex backtracking; benchmark grammar changes on large files.
- Keep JSON schemas conservative; prefer enums and ranges to free‑form strings unless necessary.

## 8. Working on the Language

### 8.1 Design first: update the Language Reference

Start by specifying changes in `docs/language-reference.md`. Update the overview, lexical structure, statements, concurrency, events, and examples to reflect your proposed syntax or semantics. Provide runnable `.roop` examples and corner cases.

### 8.2 TextMate grammar: tokens and block headers

Edit `syntaxes/roop.tmLanguage.json` when adding keywords, block headers, verbs, spatial selectors, operators, or literals. Keep related tokens grouped and documented in the `repository` section. Ensure new constructs appear in the `blockHeaders`, `control`, `triggers`, `actions`, and `spatial` groups as appropriate.

Example addition for a new trigger keyword `whenever`:

```json
{
  "name": "meta.block.header.roop",
  "begin": "^(\\s*)(?:(whenever|when|on|at|if|elseif|else|repeat|while|for|parallel|context|with\\s+timeout|every|sync\\s+when|detached\\s+run|await\\s+run|run|template\\s+task|start\\s+task))\\b(.*?)(:)\\s*$",
  "beginCaptures": {
    "2": { "name": "keyword.control.header.roop" },
    "3": { "name": "meta.block.header.args.roop" },
    "4": { "name": "punctuation.separator.colon.roop" }
  },
  "end": "(?=^\\s*(?:whenever|when|on|at|if|elseif|else|repeat|while|for|parallel|template\\s+task|start\\s+task|end\\s+task)\\b|\\Z)",
  "patterns": [{ "include": "#strings" }, { "include": "#numbers" }]
}
```

### 8.3 Language configuration: indentation, comments, pairs

Update `language-configuration.json` to keep indentation and on‑enter behavior aligned with grammar changes.

Checklist:

- Add new block headers to `increaseIndentPattern` and `onEnterRules.beforeText`.
- Ensure `end task` outdents correctly.
- Keep `//` line comments, brackets, surrounding pairs, and auto‑closing pairs in sync with syntax usage.
- Keep `wordPattern` aligned with identifiers and numeric literals used by the language.

### 8.4 LSP diagnostics, completion, and formatting

When the language surface changes, align the language server:

- Diagnostics: unknown keywords, malformed blocks, missing colons, unterminated tasks.
- Completion: block headers, verbs, selectors, operators, unit suffixes, common triggers.
- Formatting: stable indentation, spacing around operators, consistent quote style.
- Symbols: tasks and template tasks should appear in the Outline.
- Code actions: quick fixes for missing colons, block closures, and refactors such as “Extract task”.

### 8.5 Snippets and samples

Update `snippets/roop.code-snippets` to include new canonical patterns: tasks, triggers, concurrency, events, error handling, and testing constructs. Keep examples minimal but runnable.

### 8.6 JSON schema for `.roopmodule.json`

Carefully evolve `schemas/roopmodule.schema.json`:

- Use `"schemaVersion"` to coordinate breaking changes.
- Describe capability verbs, parameters (type, unit, ranges, default), events, telemetry, errors, safety limits, permissions, dependencies, profiles, testing, and examples.
- Avoid removing or renaming fields without a major version bump.
- Provide enums and numeric constraints where possible.
- Keep descriptions human‑readable; these drive editor hovers and completions.

### 8.7 Module examples and profiles

Update or add example module manifests such as `arm.roopmodule.json`. Demonstrate capabilities like `move`, `grasp`, resources and concurrency policies, safety constraints, ROS/REST interfaces, and profiles for “home” and “factory” with different defaults and limits.

### 8.8 Capability catalog and task patterns

Keep the capability catalog in the Language Reference current. Provide examples for motion/navigation, manipulation, perception, HRI/UI, smart‑home, healthcare, hospitality, industrial/logistics, household/cleaning, education/demos, and safety/compliance. Prefer task‑oriented examples that match real workflows.

## 9. Testing Strategy

### 9.1 Smoke tests

Add or update `smoke-test.js` to open sample files, run formatting and validation, and assert basic success/failure cases. Keep it runnable via `node smoke-test.js`.

### 9.2 Unit and integration tests

- Unit tests for scanners, parsers, formatters, and validators.
- Integration tests for the LSP server: completion, hover, diagnostics, formatting.
- Example‑driven tests that run example `.roop` files and validate expected diagnostics or outline symbols.

### 9.3 Grammar and indentation tests

- Snapshot tests for TextMate scopes on representative samples.
- Indentation tests that simulate pressing Enter at block boundaries.
- Ensure new headers indent and outdent deterministically.

### 9.4 JSON schema validation tests

- Validate example manifests against `schemas/roopmodule.schema.json`.
- Test positive and negative cases for required fields, enums, ranges, and nested objects.
- Keep example manifests synced with schema defaults.

## 10. Adding or Changing Features

### 10.1 Add a new trigger keyword

1. Update the Language Reference with syntax, semantics, and examples.
2. Add the keyword to the TextMate `blockHeaders` rule.
3. Add it to `increaseIndentPattern` and `onEnterRules` in `language-configuration.json`.
4. Extend LSP completion and diagnostics for the new header.
5. Add snippets and tests.

### 10.2 Add a new verb/action token

1. Define the verb in the Language Reference and add examples.
2. Add it under the `actions` token group in the TextMate grammar.
3. Extend completion lists in the LSP server.
4. If the verb maps to module capabilities, add examples to the module manifest examples and tests.

### 10.3 Add a new indentation rule

1. Extend `increaseIndentPattern` and, if needed, `decreaseIndentPattern`.
2. Update `onEnterRules` for Enter‑key behavior.
3. Add editor tests to ensure stable behavior.
4. Document the change in the Language Reference style rules.

### 10.4 Extend the module manifest schema

1. Propose the field with rationale, type, and examples.
2. Add to `schemas/roopmodule.schema.json` with `description`, constraints, and `$defs` reuse.
3. Update validation rules and completions.
4. Provide examples in example manifests.
5. Update docs and tests.
6. Bump schema or extension version per SemVer and note in `CHANGELOG.md`.

### 10.5 Add a new extension command or view

1. Declare the command in `package.json` under `contributes.commands`.
2. Add an activation event if the command should be available on startup or under conditions.
3. Wire the command in `src/extension.ts`.
4. Optionally, add menu placements and keybindings.
5. Document the command and add tests or smoke coverage.

## 11. Documentation Standards

- Keep `docs/language-reference.md` as the normative source.
- Provide runnable, minimal `.roop` examples for each construct.
- Keep screenshots or diagrams under `docs/` if needed.
- Update README and the Welcome/Walkthrough content referenced by the extension if user‑facing behavior changes.

## 12. Versioning, Changelog, and Releases

- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Update `CHANGELOG.md` with user‑facing changes grouped by Added, Changed, Fixed, Deprecated, Removed, Security.
- Bump `version` in `package.json`.
- Package with `npx vsce package` and distribute the `.vsix`.
- Consider pre‑release tags for breaking or experimental changes.
- Keep `engines.vscode` aligned with the tested VS Code version.

## 13. Issue Triage and Pull Requests

- Use clear titles and reproduction steps.
- Tag issues with `grammar`, `language-config`, `schema`, `lsp`, `docs`, `examples`, `release`, or `good-first-issue`.
- For PRs, include: problem statement, design notes, screenshots for grammar scope diffs if applicable, tests, and docs updates.
- Small, focused PRs merge faster.

## 14. Security and Responsible Disclosure

Do not file vulnerabilities publicly. Use the instructions in `SECURITY.md` to report issues privately. Maintainers will coordinate fixes and public advisories.

## 15. Licensing and Attribution

All contributions are under the project license (MIT) unless stated otherwise. Do not submit content you do not have the right to license.

## 16. Maintainer Checklist

- Language Reference updated.
- Grammar and language configuration updated and tested.
- LSP completion/diagnostics/formatting aligned.
- Snippets and examples updated.
- JSON schema and example manifests validated.
- Smoke tests pass; new tests added where needed.
- README, walkthroughs, and welcome content updated.
- Changelog and version bumped; release artifacts built.
