# Getting Started with ROOP Language Support

This guide takes you from a clean editor to a working ROOP project, explains the language basics you will actually type, and shows how the VS Code extension helps you write, validate, and run tasks.

## Table of Contents

1. What you get in this extension
2. Requirements and installation
3. Create a workspace and open the extension host
4. Your first ROOP files
   4.1 Hello task  
   4.2 Event-driven reaction  
   4.3 Control flow and retries  
   4.4 Concurrency and background work
5. Editor experience
   5.1 Comments, words, and pairs  
   5.2 Indentation and on-enter rules  
   5.3 Folding regions  
   5.4 Snippets and completions
6. Grammar you can type right now
   6.1 Block headers and colons  
   6.2 Numbers, durations, operators  
   6.3 Booleans, strings, interpolation
7. Using modules and manifests
   7.1 Why modules matter  
   7.2 Validate .roopmodule.json with the bundled schema  
   7.3 Example: 6‑DoF arm manifest essentials  
   7.4 Mapping verbs to capabilities
8. Core language patterns to solve tasks
   8.1 Triggers (time, perception, custom events)  
   8.2 Selection of entities and spaces  
   8.3 Control blocks and loops  
   8.4 Error handling, timeouts, and fallback  
   8.5 Parallel work, awaiting, and detached tasks
9. Commands, keybindings, and views
10. Linting, validation, and typical diagnostics
11. Project tasks and common workflows
12. Troubleshooting and FAQ
13. Next steps

---

## 1. What you get in this extension

The ROOP Language Support extension brings language registration, TextMate grammar, snippets, JSON schema validation for module manifests, basic commands, keybindings, and explorer views (Modules, Tasks, World Model). This is enough to write syntax‑highlighted `.roop` scripts, get correct indentation, validate `*.roopmodule.json` files, and run extension commands directly from VS Code.

## 2. Requirements and installation

- Visual Studio Code 1.84.0 or newer.
- Install the packaged `.vsix` for ROOP Language Support, or fetch it from your internal marketplace entry.
- Open a folder that contains `.roop` scripts or `*.roopmodule.json`; activation is automatic.

Tip: keep your workspace under version control so that generated examples and manifests are tracked.

## 3. Create a workspace and open the extension host

1. Clone or create an empty folder.
2. Install dependencies and compile the extension if you are developing it locally:

```bash
npm install
npm run compile
```

3. Press F5 in VS Code to launch the Extension Development Host.
4. Create a new file with the `.roop` extension to activate language features.

## 4. Your first ROOP files

### 4.1 Hello task

Create `hello.roop` with a single task that speaks:

```roop
start task "HelloWorld"
  say "Hello, world."
end task
```

### 4.2 Event-driven reaction

Attach behavior to an environmental trigger:

```roop
when object "mug" with color "red" appears on "Table":
  say "I see a red mug."
```

### 4.3 Control flow and retries

Combine guards, failure handling, and retry:

```roop
move Arm1 to pose "Pickup"
grasp with Gripper1
on failure:
  say "Grasp failed. Trying again."
  retry after 2 s
```

### 4.4 Concurrency and background work

Run work in parallel, await what matters, and keep a watcher detached:

```roop
parallel:
  run "PrepareTray"
  detached run "WatchEmergencyStop"
await run "PlaceTrayOnCounter"
say "Tray delivered."
```

## 5. Editor experience

### 5.1 Comments, words, and pairs

- Line comments use `//`.
- Paired brackets `() [] {}` and quotes `"` `'` auto‑close and can be used for selections.
- Word navigation follows a pattern that treats identifiers and numbers as words.

### 5.2 Indentation and on-enter rules

- Indent after block headers like `when`, `if`, `repeat`, `for`, `parallel`, `context`, `with timeout`, `every`, `sync when`, and after header‑style `run` lines that end with a colon.
- `elseif:` and `else:` reduce and then re‑indent to align properly.
- `end task` outdents to close the task.

### 5.3 Folding regions

Use `// #region` and `// #endregion` markers to create explicit fold ranges in long scripts.

### 5.4 Snippets and completions

Start typing common headers (for example `start task`) to get snippet proposals. Completions are also available inside headers for durations, operators, and entity selectors based on the grammar.

## 6. Grammar you can type right now

### 6.1 Block headers and colons

The grammar recognizes headers including `when`, `on`, `at`, `if`, `elseif`, `else`, `repeat`, `while`, `for`, `parallel`, `context`, `with timeout`, `every`, `sync when`, `detached run`, `await run`, `run`, `template task`, `start task`, and the closing `end task`. Place a colon at the end of header lines that introduce a block.

### 6.2 Numbers, durations, operators

- Integers and floats are recognized.
- Durations such as `200 ms`, `5 s`, `2 min`, `1 h` are valid.
- Operators include logical `and/or/not`, comparisons `== != <= >= < >`, membership `in/contains`, and relational keywords such as `is`, `near`, `before`, `after`, `between`, `within`, `as`, `to`, `from`, `by`, `with`, `over`, `under`, `around`, `across`, `through`, `onto`, `into`, `relative to`, `anchor on`.

### 6.3 Booleans, strings, interpolation

- `true`, `false`, and `null` are literals.
- Strings are double‑quoted; use `{…}` inside a string to interpolate variables or simple expressions.

```roop
let drink = "tea"
say "Preparing {drink}."
```

## 7. Using modules and manifests

### 7.1 Why modules matter

ROOP scripts call abstract verbs such as `move`, `grasp`, `release`, `say`, or `turn on`. At runtime those verbs are routed to active modules that declare capabilities via `.roopmodule.json` manifests. You focus on intention; modules provide the concrete implementation.

### 7.2 Validate .roopmodule.json with the bundled schema

Create `examples/lights.roopmodule.json`:

```json
{
  "schemaVersion": "1.0",
  "module": {
    "id": "example.light.v1",
    "name": "Smart Light",
    "version": "1.0.0",
    "vendor": "Example Inc.",
    "category": "environment"
  },
  "capabilities": [
    {
      "id": "environment.lighting",
      "title": "Lighting control",
      "category": "environment",
      "verbs": ["turn on", "turn off", "set"],
      "parameters": [
        {
          "name": "brightness",
          "type": "percentage",
          "minimum": 0,
          "maximum": 100,
          "default": 50
        }
      ]
    }
  ]
}
```

Open the file; you will get schema‑backed validation and completions for fields like `module`, `capabilities`, `events`, `telemetry`, `profiles`, and limits.

### 7.3 Example: 6‑DoF arm manifest essentials

A typical arm module describes hardware meta, ROS or REST interfaces, motion constraints, and verbs such as `move`, `align`, `grasp`, `release`. It also provides safety limits (speed/force), resources (exclusive access to the arm), and QoS hints. This lets scripts call high‑level actions like `move Arm1 to pose "TrayPickup"` and rely on the module to execute them safely.

### 7.4 Mapping verbs to capabilities

In a manifest, each capability lists verbs, their parameters (types, units, ranges, defaults), preconditions, effects, return values, and example ROOP lines. When you type those verbs in a `.roop` script, the runtime binds them to available modules with the matching capabilities.

## 8. Core language patterns to solve tasks

### 8.1 Triggers (time, perception, custom events)

- Time: `at time "07:00":` and `every 5 min:`
- Perception: `when object "mug" with color "red" appears on "Table":`
- Custom events: `on "arm.motion.completed":` blocks or module‑specific events

### 8.2 Selection of entities and spaces

Use selectors such as `object`, `area`, `surface`, `zone`, `pose`, and `label` to bind actions to the real world:

```roop
let target = object "cup" near area "Sink"
move Arm1 to target
```

### 8.3 Control blocks and loops

- Conditionals: `if / elseif / else`
- Loops: `repeat N times`, `while condition:`, `for item in list:`

### 8.4 Error handling, timeouts, and fallback

Attach recovery paths right after actions:

```roop
grasp with Gripper1
on failure:
  retry after 2 s
on timeout:
  say "Taking too long."
fallback:
  say "Switching to backup plan."
```

### 8.5 Parallel work, awaiting, and detached tasks

- Start several tasks in `parallel:`
- Use `await run` to wait for a specific subtask to finish
- Use `detached run` to start long‑running watchers in the background

## 9. Commands, keybindings, and views

Commands contributed by the extension include:

- ROOP: Insert Task Block (`Ctrl+I` on Windows/Linux, `Cmd+I` on macOS)
- ROOP: Create Example Project
- ROOP: Open Language Reference (`Ctrl+Shift+H` / `Cmd+Shift+H`)
- ROOP: Run Current Task
- ROOP: Validate Current Document (`Ctrl+Alt+L` / `Cmd+Alt+L`)
- ROOP: Scan and Register Modules
- ROOP: Generate .roopmodule.json

Explorer views:

- Modules
- Tasks
- World Model

A welcome panel in Modules provides quick links when no modules are detected.

## 10. Linting, validation, and typical diagnostics

You will see diagnostics if a header is missing its trailing colon, if block structure is not indented as expected, or if a manifest field violates the schema. Open the Problems panel to navigate to each issue. For manifests, keep an eye on required fields like `module` and `capabilities`, and check enums such as `category` and units for parameters.

## 11. Project tasks and common workflows

- Validate and format `.roop` files as you write them.
- Create or import module manifests and keep them in `schemas/` or a dedicated `modules/` directory.
- Use the example project command to scaffold a starter project, then adapt the tasks and manifests to your hardware.
- For iterative testing, keep a short task such as `HelloWorld` and a longer task that exercises concurrency, error handling, and selectors.

## 12. Troubleshooting and FAQ

- Highlighting looks wrong: ensure the file extension is `.roop`.
- No validation in manifests: check the file suffix is `.roopmodule.json` and that the schema is referenced by the extension.
- Indentation is off: verify that header lines end with `:` and that `end task` appears on its own line.
- Commands not found: ensure the extension is activated by opening a `.roop` file or a manifest.
- Where are my explorer views: check the ROOP view container in the Activity Bar.

## 13. Next steps

- Read the Language Reference to learn every statement, selector, and pattern.
- Explore the arm module example and adapt it to your hardware.
- Create templates for recurring tasks and share them across your team.
