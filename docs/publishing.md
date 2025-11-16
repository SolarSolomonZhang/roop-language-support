# Publishing and Release Guide for ROOP Language Support

Date: 2025-11-02

This document describes how to prepare, validate, package, sign, test, and publish the ROOP Language Support extension to public galleries. It also defines quality gates for all language assets (grammar, language configuration, snippets, JSON schemas, commands, views, tasks, and LSP client/server) so that the published build is reliable for end‑users and downstream automation.

## Table of Contents

1. Scope and Audience
2. Prerequisites and Accounts
3. Manifest Readiness Checklist
4. Versioning and Release Notes
5. Building and Validating Artifacts
6. Packaging a VSIX
7. Local Installation and Smoke Tests
8. Marketplace Publishing (VS Code Marketplace)
9. Open VSX Publishing (Optional)
10. Continuous Delivery (CI/CD) Pipeline
11. Asset and Metadata Quality Gates for the ROOP Language
12. Security, Privacy, and Legal
13. Post‑release Monitoring and Rollback
14. Appendix A — Example CI YAML (GitHub Actions)
15. Appendix B — Release Checklist (One‑page)

---

## 1. Scope and Audience

This guide targets maintainers of the ROOP Language Support VS Code extension. It explains end‑to‑end publishing, from manifest hygiene to automated release pipelines, and it enumerates hard checks for language/tooling assets so that the published extension enables the full ROOP authoring workflow.

The extension contributes a language id, TextMate grammar, language configuration, snippets, JSON schema validation, commands, keybindings, and custom views through its manifest. See the existing manifest for the definitive list of contributions. fileciteturn1file40

## 2. Prerequisites and Accounts

- Install Node.js (LTS) and npm.
- Install Visual Studio Code (Stable and/or Insiders).
- Install the VS Code Extension Manager CLI:
  ```bash
  npm i -g @vscode/vsce
  # or use npx without global install
  npx vsce --version
  ```
- Create a Publisher and a Personal Access Token (PAT) for the VS Code Marketplace. Store the token securely as an environment secret (e.g., VSCE_PAT) in CI.
- For Open VSX (optional): create an Open VSX account and obtain an OVSX token (OVSX_TOKEN).

## 3. Manifest Readiness Checklist

Before any release, validate that the `package.json` manifest contains the required fields and correct pointers to all language assets and views.

- Identity and distribution:
  - `name`, `displayName`, `publisher`, `version`, `license`, `repository`, `homepage`, `bugs`, `icon`, `qna`, `galleryBanner`. fileciteturn1file40
- Engine compatibility:
  - `engines.vscode` reflects the minimum supported VS Code version. fileciteturn1file40
- Contributions for the ROOP language:
  - `contributes.languages[0].id = "roop"` and `configuration` points at `language-configuration.json`. fileciteturn1file40
  - `contributes.grammars[0].path = "./syntaxes/roop.tmLanguage.json"`. fileciteturn1file40
  - `contributes.snippets[0].path = "./snippets/roop.code-snippets"`. fileciteturn1file40
  - `contributes.jsonValidation` includes `*.roopmodule.json` bound to `./schemas/roopmodule.schema.json`. fileciteturn1file40
- Commands, menus, keybindings, and views are declared and scoped to `editorLangId == roop` where appropriate. fileciteturn1file40
- Optional: `extensionDependencies` include `redhat.vscode-yaml` to improve JSON/YAML authoring. fileciteturn1file40

Validate language assets referenced by the manifest:

- `language-configuration.json` defines `lineComment`, bracket pairs, auto‑closing/surrounding pairs, colorized bracket pairs, word pattern, indentation and on‑enter rules. fileciteturn1file39
- `roop.tmLanguage.json` declares the grammar repository for comments, block headers (`when`, `on`, `at`, `if`, `elseif`, `else`, `repeat`, `while`, `for`, `parallel`, `context`, `with timeout`, `every`, `sync when`, `detached run`, `await run`, `run`, `template task`, `start task`), strings, numbers, durations, operators, entities, and more. fileciteturn1file42
- `schemas/roopmodule.schema.json` formalizes `.roopmodule.json` capabilities, events, telemetry, safety, permissions, dependencies, and profiles; the editor uses this for validation and completion. fileciteturn1file298
- Example module: `arm.roopmodule.json` illustrates a 6‑DoF arm with ROS/REST/grpc interfaces, capability verbs like `move/align/tilt`, QoS and safety limits; keep this in the sample project bundled with the extension. fileciteturn1file301
- Language reference (`language-reference.md`) describes block structure, statements, events, concurrency, selectors, capability catalog; link it from the extension UI and from the README. fileciteturn1file300

Tip: run a local schema and grammar sanity check by opening the repo in VS Code; the extension’s own manifest already wires language, grammar, and schema contributions. fileciteturn1file40

## 4. Versioning and Release Notes

- Follow semantic versioning: `MAJOR.MINOR.PATCH`.
- Increment `version` in `package.json` for every public release. fileciteturn1file40
- Maintain a human‑readable `CHANGELOG.md` with sections for Added, Changed, Fixed, Deprecated, Removed, Security.
- Tag releases in git (`vX.Y.Z`) to align with Marketplace versions.
- Optional pre‑release: add a `preview` flag in the manifest if you want Marketplace to display a Preview badge, then publish a pre‑release build; later promote to stable.

## 5. Building and Validating Artifacts

Install dependencies and compile the TypeScript client/server:

```bash
npm ci
npm run compile   # or: npx tsc -b
```

Run local checks (examples):

```bash
# Extension manifest and package vet
npx vsce ls
npx vsce verify-pat "$VSCE_PAT"   # sanity check token if needed

# LSP smoke tests (adapt to your script structure)
node scripts/smoke-test.js || echo "Run basic grammar/format/diagnostic checks"
```

Validate language assets quickly inside VS Code:

- Open `*.roop` and confirm header‑based indentation and on‑enter behavior per configuration. fileciteturn1file39
- Confirm block headers and tokens are highlighted by the TextMate grammar. fileciteturn1file42
- Open `*.roopmodule.json` and verify schema‑based diagnostics and completions. fileciteturn1file298

## 6. Packaging a VSIX

Create a signed VSIX archive for distribution:

```bash
npx vsce package --out dist/roop-language-support-${npm_package_version}.vsix
# Optionally target specific platforms or skip dependencies if your build pipeline handles bundling.
```

Confirm the resulting archive contains:

- `extension.vsixmanifest`, `package.json`, compiled `out/` artifacts.
- `syntaxes/roop.tmLanguage.json`, `language-configuration.json`, `schemas/roopmodule.schema.json`, `snippets/roop.code-snippets`. fileciteturn1file40

## 7. Local Installation and Smoke Tests

Install the packaged extension locally and run quick tests:

```bash
code --install-extension dist/roop-language-support-$(node -p "require('./package.json').version").vsix
code --list-extensions | grep roop
# To uninstall:
# code --uninstall-extension loop-robotics.roop-language-support
```

Open a workspace with `*.roop` and `*.roopmodule.json` files, verify:

- Language id `roop` is detected; grammar scopes are applied. fileciteturn1file40 fileciteturn1file42
- Indentation and on‑enter actions match the configuration. fileciteturn1file39
- JSON schema validation for module manifests is active. fileciteturn1file298
- Commands exist in the Command Palette: Insert Task Block, Create Example Project, Open Language Reference, Run Current Document Validation, Scan and Register Modules, Generate .roopmodule.json. fileciteturn1file40

## 8. Marketplace Publishing (VS Code Marketplace)

Manual publish from a clean, tagged main branch:

```bash
# One‑time login (stores token locally)
npx vsce login <publisher>

# Bump version in package.json, commit, tag:
npm version patch   # or minor / major
git push --follow-tags

# Publish
npx vsce publish    # or: npx vsce publish patch|minor|major
```

Ensure the manifest has a valid `publisher` and `icon`, and that `engines.vscode` matches your intended support window. fileciteturn1file40

Common validation errors to resolve before publishing:

- Missing or invalid `publisher` field.
- Engine range too low or too high for Marketplace policies. fileciteturn1file40
- Broken contribution paths (`language-configuration.json`, `syntaxes/roop.tmLanguage.json`, `schemas/roopmodule.schema.json`, snippets). fileciteturn1file40

## 9. Open VSX Publishing (Optional)

Provide an open‑source build for Eclipse Theia and compatible IDEs:

```bash
npm ci && npm run compile
npx ovsx publish -p "$OVSX_TOKEN" --packagePath dist/roop-language-support-$(node -p "require('./package.json').version").vsix
```

Keep Marketplace and Open VSX versions aligned for consistency; both builds should include identical language assets.

## 10. Continuous Delivery (CI/CD) Pipeline

Automate packaging and publishing to reduce manual error. A minimal GitHub Actions workflow is provided in Appendix A. It demonstrates:

- Node matrix setup and dependency caching.
- TypeScript compilation and artifact upload.
- VSIX packaging with `vsce`.
- Conditional publishing to Marketplace with `VSCE_PAT`.
- Optional Open VSX publish with `OVSX_TOKEN`.

The workflow should also run a simple grammar/format/diagnostic smoke test before publishing (for example, invoking your `scripts/smoke-test.js`).

## 11. Asset and Metadata Quality Gates for the ROOP Language

These gates ensure the language part enables the full set of task‑oriented actions described by the ROOP Language Reference.

11.1 Grammar coverage

- Block headers recognized: `when`, `on`, `at`, `if`, `elseif`, `else`, `repeat`, `while`, `for`, `parallel`, `context`, `with timeout`, `every`, `sync when`, `detached run`, `await run`, `run`, `template task`, `start task`, `end task`. Verify scopes via the TextMate grammar. fileciteturn1file42
- Operators and relations: logical (`and`, `or`, `not`), comparisons (`==`, `!=`, `<=`, `>=`, `<`, `>`), spatial relations (`is`, `near`, `before`, `after`, `between`, `within`, `to/from/with`, `relative to`). fileciteturn1file42

  11.2 Language configuration behavior

- Single‑line comments (`//`) and balanced brackets/quotes auto‑close.
- Indentation increases after block headers; outdent on `end task`, `else`, `elseif`. fileciteturn1file39

  11.3 Schema validation for `.roopmodule.json`

- Capabilities, verbs, events, telemetry, errors, safety, permissions, dependencies, profiles, testing, and examples are defined per schema. fileciteturn1file298
- Example arm module aligns with schema; use it in integration tests to ensure completions and diagnostics behave as expected. fileciteturn1file301

  11.4 Language semantics reference

- Ship `language-reference.md` and surface it via the command “Open Language Reference”; ensure all constructs (statements, events, concurrency, selectors, testing) in the reference are highlighted and formatted correctly by the extension runtime and grammar. fileciteturn1file300 fileciteturn1file40

  11.5 Commands, menus, and views

- Commands and keybindings are present and correctly scoped to `roop` documents.
- Explorer views: Modules, Tasks, World Model are registered in the ROOP activity bar container. fileciteturn1file40

  11.6 End‑to‑end authoring scenario (sanity)

- Create `hello.roop` with a `start task / end task` block and a `say` action; confirm indentation, grammar highlighting, and diagnostics behave as per the reference. fileciteturn1file300 fileciteturn1file39 fileciteturn1file42

## 12. Security, Privacy, and Legal

- Security policy: include a `SECURITY.md` with a clear, private disclosure channel.
- Privacy and telemetry: if the extension collects telemetry, document what is collected and how to disable it.
- Licensing: ensure `license` in `package.json` matches the repository’s LICENSE and that bundled third‑party assets are accounted for. fileciteturn1file40

## 13. Post‑release Monitoring and Rollback

- Monitor Marketplace install counts, ratings, and user feedback.
- Track issues via the `bugs.url` configured in the manifest. fileciteturn1file40
- For critical regressions:
  - Unpublish or roll back if needed.
  - Publish a hotfix (PATCH bump) after a focused CI run.
  - Document in the changelog and reference the fix commit/tag.

## 14. Appendix A — Example CI YAML (GitHub Actions)

```yaml
name: release
on:
  push:
    tags:
      - "v*.*.*"

jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run compile
      - run: npx vsce package --out dist/roop-language-support-${{ github.ref_name }}.vsix
      - name: Publish to VS Code Marketplace
        if: ${{ secrets.VSCE_PAT != '' }}
        run: npx vsce publish --packagePath dist/roop-language-support-${{ github.ref_name }}.vsix -p ${{ secrets.VSCE_PAT }}
      - name: Publish to Open VSX (optional)
        if: ${{ secrets.OVSX_TOKEN != '' }}
        run: npx ovsx publish -p ${{ secrets.OVSX_TOKEN }} --packagePath dist/roop-language-support-${{ github.ref_name }}.vsix
```

## 15. Appendix B — Release Checklist (One‑page)

1. Bump `version` in `package.json` and update `CHANGELOG.md`.
2. Verify manifest keys: publisher, engines.vscode, categories, keywords, license, repository, homepage, bugs, icon, qna, galleryBanner. fileciteturn1file40
3. Confirm language assets exist and load:
   - language‑configuration.json (comments, brackets, indentation, on‑enter) fileciteturn1file39
   - syntaxes/roop.tmLanguage.json (block headers, tokens) fileciteturn1file42
   - schemas/roopmodule.schema.json (validation) fileciteturn1file298
4. Build: `npm ci && npm run compile`.
5. Package: `npx vsce package`.
6. Local install and smoke test in VS Code and Insiders.
7. Publish: `npx vsce publish` (or CI pipeline).
8. Optional: publish to Open VSX.
9. Verify listing, screenshots, description, README links, and reference docs.
10. Monitor, triage issues, and prepare hotfix if needed.

---

This guide is compiled against the current repository state and its manifest and language assets. Revisit the checklists whenever the language grammar, configuration, schema, commands, or views change to keep published builds aligned with the ROOP Language Reference and module schema. fileciteturn1file40 fileciteturn1file300 fileciteturn1file298
