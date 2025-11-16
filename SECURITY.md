# Security Policy for ROOP Language Support

This document describes the security, safety, and coordinated‑disclosure policy for the **ROOP Language Support** repository and its related artifacts (VS Code extension, language server, TextMate grammar, JSON schemas, sample modules, and documentation). It also provides guidance for ROOP script authors and module authors to reduce physical risk and protect users.

> Scope: source code in this repository, the packaged VS Code extension (`.vsix`), documentation, example `.roop` scripts, and example `.roopmodule.json` manifests. Runtime implementations of hardware modules and third‑party drivers are in scope only as they interact with ROOP artifacts via declared capabilities and interfaces.

---

## Table of Contents

1. [Supported Versions and Update Policy](#supported-versions-and-update-policy)
2. [How to Report a Vulnerability](#how-to-report-a-vulnerability)
3. [Coordinated Disclosure Process](#coordinated-disclosure-process)
4. [Triage and Severity Classification](#triage-and-severity-classification)
5. [Threat Model and Security Boundaries](#threat-model-and-security-boundaries)
6. [Robotics Safety: Physical‑World Risk Controls](#robotics-safety-physicalworld-risk-controls)
7. [Guidance for ROOP Script Authors](#guidance-for-roop-script-authors)
8. [Guidance for Module Authors (`.roopmodule.json`)](#guidance-for-module-authors-roopmodulejson)
9. [Secure Configuration for Users and Operators](#secure-configuration-for-users-and-operators)
10. [Secure Development and Release (Maintainers)](#secure-development-and-release-maintainers)
11. [Security Testing and Verification](#security-testing-and-verification)
12. [Data Protection and Privacy](#data-protection-and-privacy)
13. [Supply‑Chain Integrity](#supplychain-integrity)
14. [Out‑of‑Scope Reports](#out-of-scope-reports)
15. [Incident Response Playbooks](#incident-response-playbooks)
16. [Known Limitations](#known-limitations)
17. [Document History](#document-history)

---

## Supported Versions and Update Policy

- We support the latest published extension version and one prior minor version. Support includes receiving reports, triage, and fixes when feasible.
- End‑of‑life (EOL) versions stop receiving fixes, but we still accept reports to assess whether the issue affects supported versions.
- Compatibility targets follow the `engines.vscode` range declared by the extension (for example `^1.84.0`). When VS Code raises its minimum, older host versions may be EOL even if the extension version remains current.

Security fixes may be released as patch versions. When a fix has risk of breaking workflows, a configuration fallback or migration notes will be provided.

## How to Report a Vulnerability

- Please send a private report to **security@loop-robotics.example** with a clear description, reproduction steps, affected versions/commit IDs, and any suggested mitigations.
- Alternatively, open a private security advisory in the repository’s “Security” tab if your hosting platform supports it.
- Do not file public issues for exploitable vulnerabilities prior to coordinated disclosure.

We will acknowledge receipt within **3 business days**, provide a triage state within **7 business days**, and share an intended remediation timeline when confirmed.

## Coordinated Disclosure Process

1. **Receipt & Acknowledgement** — we confirm the report and begin triage.
2. **Triage** — we validate impact and assign a severity level.
3. **Fix Development** — we prepare patches and tests, and draft mitigations.
4. **Vendor/Partner Coordination** — when a vulnerability affects downstream module vendors or dependent packages, we notify them under embargo.
5. **Release** — we publish patched versions and security notes.
6. **Credit** — we credit reporters who request attribution.
7. **Embargo** — if early disclosure risks physical harm, we may apply an embargo of up to 90 days (extendable when a fix requires vendor firmware or hardware updates).

## Triage and Severity Classification

We map issues to CVSS v3.1 (or later) and also consider physical‑world safety impact. A practical rubric:

- **Critical** — leads to remote code execution in the extension/LSP, arbitrary command execution on operator host, or **unsafe physical behavior** (bypass of emergency stop, exceeding configured speed/force limits) without user consent.
- **High** — elevation of privilege, denial of service that disables safety monitoring, unauthorized module activation, or persistent corruption of module safety profiles.
- **Medium** — information exposure of sensitive configuration, spoofing of non‑safety telemetry, or denial of service limited to non‑critical features.
- **Low** — UI spoofing, minor misconfigurations, or documentation errors that could mislead but not directly compromise safety.

If an issue spans digital security and physical safety, the higher category prevails.

## Threat Model and Security Boundaries

- **VS Code Extension Host**: the client extension runs in the extension host. It contributes a language, grammar, snippets, commands, views, and JSON schema validation. It does not require elevated OS privileges.
- **Language Server (LSP)**: runs as a Node.js process. It parses `.roop` and module manifests and returns diagnostics, completion, and symbols. LSP must treat all workspace files as untrusted input.
- **TextMate Grammar and Language Configuration**: these affect syntax highlighting and editor behavior (indentation, pairing, folding). They **must not** perform code execution.
- **JSON Schemas**: validation only. Schema `$ref` resolution should be local to bundled schemas or trusted URLs.
- **Runtime and Hardware Modules**: executing tasks against real robots is outside the extension process. Risks arise through scripts and module policies. Safety controls must be enforced in the runtime and the module’s declared limits.
- **Third‑Party Dependencies**: Node modules used by the extension/LSP are part of the threat surface; keep them patched and pinned.

Attack surfaces include crafted `.roop` files, malformed `.roopmodule.json`, untrusted workspace content, malicious extension dependencies, and unsafe default module profiles.

## Robotics Safety: Physical‑World Risk Controls

When software touches actuators, safety trumps convenience. Apply these controls in tasks and modules:

- **Emergency Stop & Interlocks** — ensure an always‑available emergency stop path; tasks should listen for and respect emergency stop events.
- **Speed/Force Limits** — honor module limits and profiles (for example “home” vs “factory”). Lower limits in human‑presence contexts.
- **Collision Avoidance & Keep‑Out Zones** — enforce geofences and limit work envelopes for arms and mobile bases.
- **Timeouts & Deadlines** — all blocking actions should use explicit timeouts and provide failure branches.
- **Retries & Fallback** — define bounded retries and safe fallbacks; never loop indefinitely in motion commands.
- **Exclusive Resource Access** — serialize use of actuators where concurrency could cause conflicts.
- **Operator Consent** — require consent before potentially dangerous actions (e.g., sharp tools, hot surfaces).
- **Fail‑Safe Defaults** — on unknown states, stop motion, de‑energize actuators, and notify the user.

## Guidance for ROOP Script Authors

Write defensively to prevent unsafe behavior:

- Use `with timeout`, `on failure`, and `fallback` around any action that can block or fail.
- Guard concurrency: use `parallel` only when actions are independent. Prefer sequential execution when sharing hardware.
- Prefer `await run` for dependent subtasks. Use `detached run` only for monitors or non‑critical background work.
- Listen for safety events and abort quickly (`on deviation`, `on interruption`, emergency stop).
- Use selectors that reduce ambiguity (e.g., include color/label/area) and verify reachability before motion.
- Provide bounded loops and maximum retries.
- Structure tasks for clarity: a top‑level `start task`/`end task` with minimal nesting, and comments documenting assumptions.

Example safety wrapper:

```roop
with timeout 10 s:
  move Arm1 to pose "TrayPickup"
on failure:
  say "Motion failed, stopping."
  abort
```

## Guidance for Module Authors (`.roopmodule.json`)

Manifests define capability and safety boundaries. Recommended practices:

- **Declare Safety** — include speed and force limits, safe zones, and whether an emergency stop is available.
- **Permissions** — explicitly list required resources (camera, mic, network, serial). Do not request unused permissions.
- **Profiles** — provide context‑specific defaults (for example, “home” profile with slower speeds).
- **Events & Telemetry** — emit success/failure events and safety‑relevant telemetry (temperatures, torque, e‑stop).
- **Errors** — enumerate error types with machine‑readable codes and recovery hints.
- **Dependencies** — declare external drivers/services and version constraints.
- **Concurrency** — specify resource access mode (`exclusive`/`shared`) and any mutex groups to prevent conflicts.
- **Testing** — supply smoke tests and examples so that integrators can validate capabilities before use.

Minimal example:

```json
{
  "module": {
    "id": "example.arm",
    "name": "Generic Arm",
    "version": "1.0.0",
    "vendor": "Example"
  },
  "capabilities": [
    {
      "id": "manipulation.move",
      "verbs": ["move"],
      "parameters": [{ "name": "target", "type": "pose", "required": true }],
      "resources": [{ "name": "arm", "kind": "arm", "access": "exclusive" }]
    }
  ],
  "safety": { "emergencyStop": true, "speedLimit": 0.2, "forceLimit": 80 },
  "permissions": [{ "name": "serial" }],
  "profiles": [{ "name": "home", "defaults": {} }]
}
```

## Secure Configuration for Users and Operators

- Run the extension in a trusted workspace when actively editing automation that controls real hardware.
- Review module manifests before use and verify their `safety`, `permissions`, and `profiles`.
- In demos or public spaces, select the “home” or “safe” profile and reduce speeds.
- Segment networks for robots and disable internet access if not needed.
- Maintain physical emergency‑stop access and clear signage during operations.
- Keep firmware and drivers updated for connected modules.

## Secure Development and Release (Maintainers)

- Use branch protection, code reviews, and signed tags for releases.
- Pin dependencies and run automated dependency‑vulnerability scans.
- Build reproducible `.vsix` packages; publish checksums and signature artifacts.
- Never include secrets in the repository or package; use environment variables or CI secrets.
- Follow the principle of least privilege in extension activation events and contributed capabilities.
- Provide migration guides when changing schema fields that affect safety.

## Security Testing and Verification

- Add unit and integration tests for parsers, validators, and LSP handlers to reject malformed inputs.
- Provide smoke tests for example modules and ensure failure paths are exercised.
- Use behavioral tests for `.roop` scripts that simulate events and verify expected actions and timeouts.
- Fuzz JSON parsing of `.roopmodule.json` and LSP message handling.
- Execute static analysis on TypeScript and validate schemas using a strict JSON Schema validator.

## Data Protection and Privacy

- Minimize collection of personal data. If audio/video modules are present, obtain consent and provide clear indicators when recording.
- Store logs locally and redact sensitive values.
- Treat telemetry channels as untrusted input and sanitize before display.
- Document any data sharing with cloud services and provide opt‑out when feasible.

## Supply‑Chain Integrity

- Verify downloaded `.vsix` against known checksums.
- Prefer building from source for critical deployments and compare artifact digests.
- Record the toolchain versions (Node, TypeScript, VS Code engine) for each release.

## Out‑of‑Scope Reports

- Vulnerabilities that require privileged access to the operator’s machine beyond the extension process.
- Physical harm arising from misconfigured third‑party hardware that violates declared safety limits.
- Social‑engineering attacks or policy violations unrelated to technical controls.
- End‑of‑life versions beyond the supported window.

## Incident Response Playbooks

- **Unsafe Motion Detected**: stop motion, de‑energize actuators, notify operator, capture and preserve logs and telemetry, apply patch or reduce speed limits before resuming.
- **Compromised Manifest**: revoke the manifest, publish a fixed version, and document the unsafe fields.
- **Malicious Script in Workspace**: disable auto‑run features, quarantine the file, and run the LSP in diagnostic mode while the repository is audited.

## Known Limitations

- The extension and LSP cannot enforce physical‑layer safety; they rely on runtime enforcement and module policies.
- The grammar and language configuration influence editing only and cannot block unsafe runtime actions.
- Schema validation can confirm structure but not the real‑world safety of connected hardware.

## Document History

- 2025‑11‑02 — Initial comprehensive version of SECURITY.md for the ROOP Language Support project.
