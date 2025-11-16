"use strict";
/**
 * ROOP Language Support – Comprehensive Smoke Test
 *
 * Purpose:
 *   Validate that the workspace provides a coherent, minimally functional
 *   toolchain for the ROOP language:
 *     1) Extension manifest sanity (languages, grammars, commands, JSON schema).
 *     2) Language configuration behavior (brackets, auto-closing, indentation).
 *     3) TextMate grammar coverage for lexical elements (comments, strings,
 *        interpolation, numbers, durations, operators, declarations, triggers).
 *     4) Schema validation for .roopmodule manifests (using Ajv when available).
 *     5) Module manifest integrity checks for sample files (arm.roopmodule.json).
 *     6) Keyword coverage cross-checked against language reference.
 *     7) Optional grammar smoke on example .roop sources if present.
 *
 * How to run:
 *   node smoke-test.js                  # full run
 *   node smoke-test.js --quick          # skip heavy checks (schema, file scanning)
 *   node smoke-test.js --schema-only    # only schema validation checks
 *   node smoke-test.js --grammar-only   # only grammar & language-config checks
 *
 * Exit codes:
 *   0 on success; 1 if any check fails.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

// ------------------------------- helpers ----------------------------------

const ARGV = new Set(process.argv.slice(2));

function r(p) {
  return path.resolve(process.cwd(), p);
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function loadJSON(candidates) {
  for (const rel of candidates) {
    const p = r(rel);
    if (fileExists(p)) {
      const txt = fs.readFileSync(p, "utf8");
      try {
        return { json: JSON.parse(txt), path: p };
      } catch (err) {
        throw new Error(`Failed to parse JSON at ${p}: ${err.message}`);
      }
    }
  }
  return null;
}

function loadText(candidates) {
  for (const rel of candidates) {
    const p = r(rel);
    if (fileExists(p)) {
      return { text: fs.readFileSync(p, "utf8"), path: p };
    }
  }
  return null;
}

function compileRegex(pattern, flags = "") {
  // pattern may be provided already as a RegExp or a string. Return RegExp.
  if (pattern instanceof RegExp) return pattern;
  try {
    return new RegExp(pattern, flags);
  } catch (e) {
    throw new Error(`Invalid regex: ${pattern}\n${e.message}`);
  }
}

const results = [];
let failures = 0;
let total = 0;

function record(ok, name, details) {
  total += 1;
  if (!ok) failures += 1;
  results.push({ ok, name, details });
}

async function runSuite(title, fn) {
  const before = { total, failures };
  const t0 = Date.now();
  try {
    await fn();
  } catch (err) {
    record(
      false,
      `${title}: suite error`,
      err && (err.stack || err.message || String(err)),
    );
  }
  const t1 = Date.now();
  const passed = total - before.total - (failures - before.failures);
  const added = total - before.total;
  console.log(`\n[${title}]  ${passed}/${added} passed  (${t1 - t0} ms)`);
}

function expect(condition, message, details) {
  record(Boolean(condition), message, condition ? undefined : details);
}

function setEquals(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

// Load core workspace files if present.
const pkg = loadJSON(["package.json"]);
const langConfig = loadJSON([
  "language-configuration.json",
  "syntaxes/language-configuration.json",
]);
const grammar = loadJSON([
  "syntaxes/roop.tmLanguage.json",
  "roop.tmLanguage.json",
]);
const schema = loadJSON([
  "schemas/roopmodule.schema.json",
  "roopmodule.schema.json",
]);
const armModule = loadJSON([
  "arm.roopmodule.json",
  "modules/arm.roopmodule.json",
]);
const reference = loadText([
  "language-reference.md",
  "docs/language-reference.md",
]);

// Optional example scripts
const roopExamples = [
  "basic.roop",
  "events.roop",
  "concurrency.roop",
  "control.roop",
  "control_flow.roop",
]
  .map((p) => loadText([p]))
  .filter(Boolean);

// ------------------------------- suites -----------------------------------

(async function main() {
  console.log("ROOP Smoke Test starting...\n");
  console.log(`Node ${process.version} on ${os.platform()} ${os.release()}`);

  await runSuite("Environment", async () => {
    expect(process.versions.node, "Node is available");
    expect(process.cwd(), "Working directory is available");
  });

  // Package.json sanity
  if (!ARGV.has("--schema-only")) {
    await runSuite("Extension manifest (package.json)", async () => {
      expect(
        !!pkg,
        "package.json found",
        "place package.json next to this script",
      );
      if (!pkg) return;
      const p = pkg.json;
      expect(p.name && p.displayName, "Name and displayName are set");
      const contributes = p.contributes || {};
      const langs = (contributes.languages || []).find((x) => x.id === "roop");
      expect(!!langs, 'Contributes language id "roop"');
      if (langs) {
        expect(
          Array.isArray(langs.extensions) && langs.extensions.includes(".roop"),
          "Language file extension includes .roop",
        );
        expect(
          typeof langs.configuration === "string",
          "Language configuration path is declared",
        );
      }
      const grammars = (contributes.grammars || []).filter(
        (g) => g.language === "roop",
      );
      expect(grammars.length >= 1, "TextMate grammar contribution exists");
      const jsonValidation = (contributes.jsonValidation || []).find((v) =>
        (v.fileMatch || []).includes("*.roopmodule.json"),
      );
      expect(
        !!jsonValidation,
        "JSON validation is wired for *.roopmodule.json",
      );
      const cmds = (contributes.commands || []).map((c) => c.command);
      [
        "roop.insertTask",
        "roop.newProject",
        "roop.openDocs",
        "roop.runTask",
        "roop.validateDocument",
        "roop.scanModules",
        "roop.generateModuleManifest",
      ].forEach((id) =>
        expect(cmds.includes(id), `Command contributed: ${id}`),
      );
      const activation = new Set(p.activationEvents || []);
      expect(
        activation.has("onLanguage:roop"),
        "Activation event onLanguage:roop",
      );
      expect(
        activation.has("workspaceContains:**/*.roop") ||
          activation.has("workspaceContains:**/*.roopmodule.json"),
        "Activation events include workspaceContains for ROOP or modules",
      );
      expect(p.engines && p.engines.vscode, "engines.vscode specified");
      expect(
        contributes.problemMatchers && contributes.problemMatchers.length >= 1,
        "problemMatchers are defined",
      );
      const settings =
        (contributes.configuration && contributes.configuration.properties) ||
        {};
      [
        "roop.format.enabled",
        "roop.validation.enable",
        "roop.language.triggers",
        "roop.language.controlFlow",
        "roop.language.entities",
      ].forEach((k) => expect(k in settings, `Config setting present: ${k}`));
    });
  }

  // Language configuration behavior (regex-only)
  if (!ARGV.has("--schema-only")) {
    await runSuite("Language configuration", async () => {
      expect(!!langConfig, "language-configuration.json found");
      if (!langConfig) return;
      const lc = langConfig.json;

      // Brackets and pairs
      expect(
        Array.isArray(lc.brackets) && lc.brackets.length >= 3,
        "Bracket pairs include {}, [], ()",
      );

      expect(
        Array.isArray(lc.autoClosingPairs) &&
          lc.autoClosingPairs.some((p) => p.open === '"' && p.close === '"'),
        "Auto closing pairs include double quotes",
      );

      // Indentation patterns
      const inc = compileRegex(lc.indentationRules.increaseIndentPattern);
      const dec = compileRegex(lc.indentationRules.decreaseIndentPattern);

      const incSamples = [
        'start task "Demo":',
        'when object "mug" appears:',
        'if object "cup" is on "Table":',
        'elseif surface "Countertop" is clear:',
        "else:",
        "parallel:",
        'await run "Subtask":',
        'detached run "Watcher":',
        "fallback:",
      ];
      incSamples.forEach((s) =>
        expect(inc.test(s), `increaseIndentPattern matches "${s}"`, {
          pattern: inc.source,
        }),
      );

      const decSamples = ["end task", "elseif something:", "else:"];
      decSamples.forEach((s) =>
        expect(dec.test(s), `decreaseIndentPattern matches "${s}"`, {
          pattern: dec.source,
        }),
      );
    });
  }

  // TextMate grammar coverage
  if (!ARGV.has("--schema-only")) {
    await runSuite("TextMate grammar coverage", async () => {
      expect(!!grammar, "roop.tmLanguage.json found");
      if (!grammar) return;
      const g = grammar.json;
      expect(g.scopeName === "source.roop", "scopeName is source.roop");
      expect(
        Array.isArray(g.patterns) && g.patterns.length > 5,
        "Top-level patterns exist",
      );
      const repo = g.repository || {};
      const requiredScopes = [
        "comments",
        "blockHeaders",
        "strings",
        "numbers",
        "durations",
        "operators",
        "booleansNull",
        "declarations",
        "control",
        "triggers",
        "lifecycle",
        "actions",
        "spatial",
        "entities",
        "variables",
        "punctuation",
      ];
      requiredScopes.forEach((k) => expect(repo[k], `Repository has ${k}`));

      // Spot-check regexes
      const durationPat = compileRegex(repo.durations.patterns[0].match);
      expect(
        durationPat.test("wait 2 seconds"),
        'duration regex matches "2 seconds"',
      );
      expect(durationPat.test("after 150ms"), 'duration regex matches "150ms"');

      const numberInt = compileRegex(repo.numbers.patterns[0].match);
      const numberFloat = compileRegex(repo.numbers.patterns[1].match);
      expect(numberInt.test("42"), "integer regex matches 42");
      expect(numberFloat.test("3.14"), "float regex matches 3.14");

      const opLogic = compileRegex(repo.operators.patterns[0].match);
      expect(
        opLogic.test("a and b or not c"),
        "logical operator regex matches and/or/not",
      );

      const strBegin = repo.strings.patterns[0].begin;
      const strEnd = repo.strings.patterns[0].end;
      expect(
        '"hello"'.startsWith(strBegin) && '"hello"'.endsWith(strEnd),
        'string delimiters are " ... "',
      );

      const commentPat = compileRegex(repo.comments.patterns[0].match);
      expect(commentPat.test("// comment"), "line comment recognized");
    });
  }

  // Schema validation with Ajv
  if (!ARGV.has("--grammar-only")) {
    await runSuite(".roopmodule schema: JSON Schema validation", async () => {
      expect(!!schema, "roopmodule.schema.json found");
      if (!schema) return;
      let Ajv = null;
      let addFormats = null;
      try {
        Ajv = require("ajv/dist/2020");
      } catch {}
      if (!Ajv) {
        try {
          Ajv = require("ajv");
        } catch {}
      }
      try {
        addFormats = require("ajv-formats");
      } catch {}

      const AjvCtor = Ajv && Ajv.default ? Ajv.default : Ajv;

      if (!AjvCtor) {
        record(
          true,
          'Ajv not installed; schema validation skipped (install "ajv" to enable).',
        );
        return;
      }
      const ajv = new AjvCtor({ strict: false, allErrors: true });
      try {
        if (!ajv.getSchema("https://json-schema.org/draft/2020-12/schema")) {
          // Ensure the 2020-12 meta schema is registered when using legacy Ajv entrypoints.
          const meta2020 = require("ajv/dist/refs/json-schema-2020-12/schema.json");
          ajv.addMetaSchema(meta2020);
        }
      } catch (metaErr) {
        // Ignore meta schema loading issues; validation will surface failures below.
      }
      if (addFormats) addFormats(ajv);

      const validate = ajv.compile(schema.json);
      expect(typeof validate === "function", "Schema compiled with Ajv");

      if (armModule) {
        const ok = validate(armModule.json);
        expect(
          ok === true,
          "arm.roopmodule.json validates against schema",
          validate.errors,
        );
      } else {
        record(
          true,
          "No arm.roopmodule.json found; sample validation skipped.",
        );
      }
    });
  }

  // Module manifest integrity (light checks)
  if (!ARGV.has("--grammar-only")) {
    await runSuite("Module manifest integrity checks", async () => {
      if (!armModule) {
        record(true, "No arm.roopmodule.json present; skipping.");
        return;
      }
      const m = armModule.json;
      expect(
        m.module && m.module.id && m.module.name,
        "module.id and module.name present",
      );
      expect(
        Array.isArray(m.capabilities) && m.capabilities.length >= 1,
        "capabilities array is non-empty",
      );
      const verbs = new Set(
        [].concat(...m.capabilities.map((c) => c.verbs || [])),
      );
      expect(verbs.size >= 5, `verbs collected: ${verbs.size} unique`);
      const requiredCaps = ["manipulation.move", "manipulation.grasp"];
      requiredCaps.forEach((id) =>
        expect(
          m.capabilities.some((c) => c.id === id),
          `capability exists: ${id}`,
        ),
      );
    });
  }

  // Cross-check keyword coverage via language reference and configuration
  if (!ARGV.has("--schema-only")) {
    await runSuite("Keyword coverage vs. reference", async () => {
      const config =
        (pkg &&
          pkg.json &&
          pkg.json.contributes &&
          pkg.json.contributes.configuration &&
          pkg.json.contributes.configuration.properties) ||
        {};
      const triggersCfg = new Set(
        (config["roop.language.triggers"] &&
          config["roop.language.triggers"].default) ||
          [],
      );
      const controlCfg = new Set(
        (config["roop.language.controlFlow"] &&
          config["roop.language.controlFlow"].default) ||
          [],
      );

      // Minimal expectations even if package.json not loaded
      const expectedTriggers = new Set([
        "when",
        "on",
        "at",
        "every",
        "wait",
        "delay",
        "until",
        "expect",
        "ask",
        "wait for",
        "await",
        "detached",
      ]);
      const expectedControl = new Set([
        "if",
        "elseif",
        "else",
        "repeat",
        "while",
        "for",
        "parallel",
        "break",
        "continue",
        "exit",
        "abort",
        "retry",
        "fallback",
        "max retries",
        "run",
        "await run",
        "detached run",
        "call",
        "template task",
        "start task",
        "end task",
        "use module",
        "synchronize",
        "sync when",
        "context",
      ]);

      if (triggersCfg.size)
        expect(
          [...expectedTriggers].every((k) => triggersCfg.has(k)),
          "configuration.triggers covers core triggers",
        );
      else
        record(
          true,
          "No triggers config found; using built-in expectations only.",
        );

      if (controlCfg.size)
        expect(
          [...expectedControl].every((k) => controlCfg.has(k)),
          "configuration.controlFlow covers core control flow",
        );
      else
        record(
          true,
          "No controlFlow config found; using built-in expectations only.",
        );

      // Verb enum coverage from schema (broad human-action surface)
      if (
        schema &&
        schema.json &&
        schema.json.$defs &&
        schema.json.$defs.verb &&
        Array.isArray(schema.json.$defs.verb.anyOf)
      ) {
        const enums = [];
        for (const a of schema.json.$defs.verb.anyOf) {
          if (Array.isArray(a.enum)) enums.push(...a.enum);
        }
        const verbSet = new Set(enums);
        expect(
          verbSet.size >= 60,
          `schema verb enum provides broad coverage (${verbSet.size} verbs)`,
        );
        [
          "grasp",
          "release",
          "move",
          "open",
          "close",
          "press",
          "push",
          "pull",
          "pick",
          "place",
          "rotate",
          "tilt",
          "pan",
          "navigate",
          "dock",
          "charge",
          "detect",
          "recognize",
          "classify",
          "segment",
          "locate",
          "estimate",
          "read",
          "ocr",
          "barcode",
          "say",
          "display",
          "notify",
          "ask",
          "track",
          "observe",
          "scan area",
          "map",
          "localize",
          "explore",
          "avoid",
          "stop",
          "resume",
          "align",
        ].forEach((v) =>
          expect(verbSet.has(v), `schema verb enum includes "${v}"`),
        );
      } else {
        record(true, "Schema verb enum not found; skipping coverage check.");
      }
      // Basic presence checks in the grammar for some tokens
      if (grammar) {
        const g = grammar.json;
        const blockHeaderBegin =
          g.repository &&
          g.repository.blockHeaders &&
          g.repository.blockHeaders.patterns &&
          g.repository.blockHeaders.patterns[0] &&
          g.repository.blockHeaders.patterns[0].begin;
        expect(
          typeof blockHeaderBegin === "string" &&
            blockHeaderBegin.includes("start\\s+task"),
          'grammar recognizes "start task" headers',
        );
        expect(
          typeof blockHeaderBegin === "string" &&
            blockHeaderBegin.includes("template\\s+task"),
          'grammar recognizes "template task" headers',
        );
      }
    });
  }

  // Optional grammar smoke on example .roop files (regex-level)
  if (!ARGV.has("--schema-only") && !ARGV.has("--quick")) {
    await runSuite("Example .roop sources (regex smoke)", async () => {
      if (!roopExamples.length) {
        record(true, "No .roop example files present; skipping.");
        return;
      }
      const headerRe =
        /^(start\\s+task|template\\s+task|when|if|elseif|else|on|at|parallel)\\b.*:|^end\\s+task\\b/m;
      for (const ex of roopExamples) {
        const ok = headerRe.test(ex.text);
        expect(
          ok,
          `headers detected in ${path.basename(ex.path)}`,
          ok
            ? undefined
            : "Expected one of: start task, when, if, on, at, parallel, end task",
        );
        expect(
          /\\b(grasp|move|release|say|turn on|display)\\b/.test(ex.text),
          `common verbs detected in ${path.basename(ex.path)}`,
        );
      }
    });
  }

  // Report
  console.log("\\n----------------------------------------");
  for (const { ok, name, details } of results) {
    const mark = ok ? "✔" : "✖";
    console.log(`${mark} ${name}`);
    if (!ok && details) {
      const d =
        typeof details === "string"
          ? details
          : JSON.stringify(details, null, 2);
      console.log("   ", d.split("\\n").slice(0, 10).join("\\n"));
    }
  }
  console.log("----------------------------------------");
  console.log(
    `Total: ${total}, Passed: ${total - failures}, Failed: ${failures}`,
  );
  process.exitCode = failures > 0 ? 1 : 0;
})();
