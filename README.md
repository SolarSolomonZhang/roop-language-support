# ROOP Language Support — Complete Guide

Version: 0.4.0

This repository provides a complete authoring experience for the ROOP language in Visual Studio Code: grammar-based syntax highlighting, editor behaviors, snippets, a language server (completion, hover, diagnostics, folding, formatting), JSON schemas for module manifests, commands, custom views, tasks, and a getting-started walkthrough.

---

## Table of Contents

1. Overview
2. Install and Requirements
3. Quick Start
4. Language Basics
   4.1 Files and encoding  
   4.2 Comments and whitespace  
   4.3 Literals (numbers, strings, durations)  
   4.4 Variables and expressions  
   4.5 Entity selectors (object, area, surface, label, pose, zone)
5. Blocks, Control Flow, and Concurrency
   5.1 Tasks and templates  
   5.2 Conditionals  
   5.3 Loops  
   5.4 Triggers and time  
   5.5 Concurrency primitives  
   5.6 Timeouts, failure, retry, fallback
6. Events and World Interaction
7. Capability Catalog (task‑oriented patterns)
   7.1 Motion and navigation  
   7.2 Manipulation (grasp, release, pick, place)  
   7.3 Perception (detect, recognize, measure, scan)  
   7.4 Dialogue and UI (say, display, ask, notify)  
   7.5 Smart‑home and environment control  
   7.6 Healthcare and assistance  
   7.7 Hospitality and retail  
   7.8 Industrial and logistics  
   7.9 Household and cleaning  
   7.10 Education and demonstration  
   7.11 Safety and compliance patterns
8. Modules and the `.roopmodule.json` Manifest
   8.1 Schema overview  
   8.2 Capabilities, events, telemetry  
   8.3 Safety, permissions, dependencies, profiles  
   8.4 Example: 6‑DoF arm module
9. Editor and Tooling (VS Code)
   9.1 Syntax highlighting (TextMate)  
   9.2 Language configuration (indentation, comments, brackets)  
   9.3 Commands and keybindings  
   9.4 Custom views (Modules, Tasks, World Model)  
   9.5 Tasks and problem matcher  
   9.6 JSON validation for module files  
   9.7 Walkthroughs and welcome
10. Project Layout, Development, and Debugging
11. Build, Package, and Publish
12. Troubleshooting
13. Contributing
14. License

---

## 1. Overview

ROOP is a task‑oriented DSL for robots and automation. Scripts state what should happen using human‑legible verbs and semantic selectors, while the runtime binds those intentions to concrete hardware and services provided by modules. The extension ships:

- TextMate grammar for `.roop` syntax.
- Editor behaviors for indentation, on‑enter rules, comments, and bracket pairs.
- Snippets for common blocks and idioms.
- An LSP client/server that powers completion, hover, diagnostics, folding, formatting, quick fixes, and document symbols.
- JSON schema validation for `*.roopmodule.json`.
- Commands, custom views, tasks, a problem matcher, and a guided walkthrough.

## 2. Install and Requirements

- Visual Studio Code 1.84.0 or later.
- Install the packaged `.vsix` or the marketplace entry “ROOP Language Support”.
- Open a workspace containing `.roop` files. The extension activates automatically.
- For module manifests, files matching `**/*.roopmodule.json` are validated against the bundled schema.

## 3. Quick Start

Create a minimal script:

```roop
start task "HelloWorld"
  say "Hello, world."
end task
```

Attach time and event triggers:

```roop
at time "07:00":
  say "Good morning"
  turn on "CoffeeMachine"

when object "mug" with color "red" appears on "Table":
  move Arm1 to "mug"
  grasp with Gripper1
  move Arm1 to "Tray"
  release with Gripper1
```

Handle failures, timeouts, and retries:

```roop
grasp with Gripper1
on failure:
  say "Retrying the grasp."
  retry after 2 s
```

## 4. Language Basics

### 4.1 Files and encoding

- Source files: `.roop` (UTF‑8).
- Module manifests: `.roopmodule.json`.

### 4.2 Comments and whitespace

- Line comments use `//`.
- Indentation is significant for readability, with blocks introduced by headers ending in `:`.

### 4.3 Literals (numbers, strings, durations)

- Integers and floating‑point numbers.
- Strings use double quotes and support escape sequences and interpolation inside `{ ... }` where permitted.
- Durations: `200 ms`, `5 s`, `2 min`, `1 h`.

### 4.4 Variables and expressions

```roop
let count = 0
while count < 3:
  say "Attempt " + count
  count = count + 1
```

### 4.5 Entity selectors

Selectors bind to semantic elements of the world model: `object`, `area`, `surface`, `label`, `pose`, `zone`, with relations such as `on`, `near`, `in`, `before`, `after`, `between`, and `within`.

## 5. Blocks, Control Flow, and Concurrency

### 5.1 Tasks and templates

- Define tasks with `start task "Name"` … `end task`.
- Reusable templates capture parameterized procedures.

```roop
template task "PickAndPlaceTemplate"(item, fromPose, toPose):
  move Arm to fromPose
  grasp with Gripper
  move Arm to toPose
  release with Gripper
end task
```

### 5.2 Conditionals

```roop
if sensor "Door" == "open":
  say "Door is open."
elseif time is after "20:00":
  say "It is late."
else:
  say "Proceed."
```

### 5.3 Loops

- `repeat N times:`
- `while condition:`
- `for x in collection:`

### 5.4 Triggers and time

- Event triggers: `when`, named events via `on <eventName>:`
- Time triggers: `at "HH:MM"`, periodic `every 5 min:`
- Synchronized triggers: `sync when <condition>:`

### 5.5 Concurrency primitives

- `parallel:` to run independent branches concurrently.
- `run`, `await run`, and `detached run` to start and coordinate subtasks.

```roop
parallel:
  run "ScanConveyor"
  detached run "WatchEmergencyStop"
await run "MovePalletToDock"
```

### 5.6 Timeouts, failure, retry, fallback

Use structured handlers like `on failure:`, `on timeout:`, `retry`, `fallback`, `abort`, and `skip` to express recovery logic.

## 6. Events and World Interaction

Tasks subscribe to module‑emitted events (`on "objectDetected": …`) and external signals (buttons, network messages, sensors). Event payloads can populate variables used by subsequent actions.

## 7. Capability Catalog (task‑oriented patterns)

Verbs are implemented by modules. Common patterns include:

### 7.1 Motion and navigation

- `navigate to pose "KitchenIsland"`, `plan path to "BinA"`, `follow line`, `dock`.

### 7.2 Manipulation

- `grasp object "mug"`, `release`, `pick object "bolt" from area "TrayA"`, `place to pose "Fixture1"`.
- Tool actions: `tighten screw`, `open door`, `press button`.

### 7.3 Perception

- `detect object "box"`, `recognize label "QR"`, `measure distance to object "part"`, `scan barcode`.

### 7.4 Dialogue and UI

- `say "message"`, `display "message" on "Panel"`, `ask "question" -> answer`.

### 7.5 Smart‑home and environment control

- `turn on "Light1"`, `set "Light1" brightness 40`, `open "Curtain"`, `set thermostat 22`.

### 7.6 Healthcare and assistance

- `remind "Take medicine"`, `fetch object "water bottle"`, `notify caregiver`.

### 7.7 Hospitality and retail

- `serve table 3`, `carry tray`, `scan item`, `print receipt`.

### 7.8 Industrial and logistics

- `pick from "BinA"`, `place to "Pallet1"`, `scan QR`, `weigh package`, `label item`.

### 7.9 Household and cleaning

- `vacuum area "LivingRoom"`, `wipe surface "Counter"`, `sort laundry`.

### 7.10 Education and demonstration

- `show pose "Home"`, `explain step "Assemble motor"`, `highlight object`.

### 7.11 Safety and compliance patterns

- `on emergencyStop: abort`, geofences, speed/torque limits, interlocks.

## 8. Modules and the `.roopmodule.json` Manifest

### 8.1 Schema overview

A module declares metadata (`id`, `name`, `version`, `vendor`, optional `category`), interfaces (ROS, REST, gRPC, serial, MQTT), exported capabilities (verbs with parameters and returns), events, telemetry, errors, safety policies, permissions, dependencies, profiles (context‑specific defaults and limits), testing hooks, and examples.

### 8.2 Capabilities, events, telemetry

Each capability defines its verbs and parameters (type, unit, ranges, defaults), preconditions/effects, return schema, QoS, resource access, concurrency strategy, safety constraints, and examples. Events and telemetry describe asynchronous streams consumed by `when/on` blocks or dashboards.

### 8.3 Safety, permissions, dependencies, profiles

- Safety: speed/force limits, reachable volumes, interlocks, emergency stop behavior.
- Permissions: camera, microphone, network, and other required resources.
- Dependencies: other modules, services, or device drivers.
- Profiles: named bundles for environments like home, factory, or demo.

### 8.4 Example: 6‑DoF arm module

```json
{
  "module": {
    "id": "loop.arm.v1",
    "name": "6-DoF Robotic Arm",
    "version": "1.0.0",
    "vendor": "Loop Robotics",
    "category": "manipulation"
  },
  "interfaces": {
    "ros": {
      "topics": [
        {
          "name": "/arm/joint_states",
          "type": "sensor_msgs/JointState",
          "qos": "reliable"
        },
        {
          "name": "/arm/ee_pose",
          "type": "geometry_msgs/PoseStamped",
          "qos": "reliable"
        }
      ],
      "actions": [
        {
          "name": "/arm/follow_joint_trajectory",
          "type": "control_msgs/FollowJointTrajectory"
        }
      ],
      "namespace": "/arm"
    },
    "serial": {
      "port": "/dev/ttyUSB0",
      "baud": 115200,
      "protocol": "CustomBinaryV1"
    }
  },
  "capabilities": [
    {
      "id": "manipulation.move",
      "verbs": ["move", "approach", "align"],
      "parameters": [
        { "name": "target", "type": "pose", "required": true },
        {
          "name": "linearSpeed",
          "type": "speed",
          "unit": "m/s",
          "default": 0.2
        }
      ],
      "returns": {
        "type": "object",
        "successEvent": "arm.motion.completed",
        "failureEvent": "arm.motion.failed"
      },
      "resources": [{ "name": "arm", "kind": "arm", "access": "exclusive" }],
      "concurrency": {
        "strategy": "queue",
        "maxParallel": 1,
        "mutexGroup": "arm"
      },
      "safety": { "emergencyStop": true, "speedLimit": 0.2 }
    },
    {
      "id": "manipulation.grasp",
      "verbs": ["grasp", "release"],
      "parameters": [
        { "name": "gripper", "type": "string", "required": true },
        { "name": "force", "type": "number", "unit": "N", "default": 30 }
      ]
    }
  ],
  "profiles": [
    {
      "name": "home",
      "defaults": { "linearSpeed": 0.15 },
      "limits": { "speedLimit": 0.25 }
    },
    {
      "name": "factory",
      "defaults": { "linearSpeed": 0.4 },
      "limits": { "speedLimit": 0.6 }
    }
  ],
  "testing": {
    "smoke": "Move to Home, then to TrayPickup, grasp and release."
  },
  "examples": [
    {
      "name": "Pick and place",
      "roop": "pick object \"mug\" from area \"TrayA\" then place to pose \"Tray\""
    }
  ]
}
```

## 9. Editor and Tooling (VS Code)

### 9.1 Syntax highlighting (TextMate)

The grammar recognizes block headers such as `when`, `on`, `at`, `if`, `elseif`, `else`, `repeat`, `while`, `for`, `parallel`, `context`, `with timeout`, `every`, `sync when`, `detached run`, `await run`, `run`, `template task`, `start task`, with a trailing colon to open a block. It also highlights strings (with interpolation inside `{}`), numbers, durations (`ms`, `s`, `min`, `h`), logical and comparison operators, boolean/null literals, declarations (`let`, `use module`, `template task`, `start task`), common actions and spatial relations, and punctuation.

### 9.2 Language configuration (indentation, comments, brackets)

- Single‑line comments: `//`.
- Brackets and quotes: `()`, `[]`, `{}`, `""`, `''` with auto‑closing and surrounding pairs.
- Colorized bracket pairs for `()`, `[]`, `{}`.
- Indentation increases after block headers and `run` lines that end in `:`.
- Indentation decreases on `end task`, and branches realign at `elseif:` or `else:` using indent‑outdent.
- On‑enter rules mirror these behaviors.
- Folding: `// #region` and `// #endregion` markers; off‑side folding is enabled.

### 9.3 Commands and keybindings

- Insert Task Block (`roop.insertTask`) — Ctrl+I (Cmd+I on macOS).
- Create Example Project (`roop.newProject`).
- Open Language Reference (`roop.openDocs`) — Ctrl+Shift+H (Cmd+Shift+H on macOS).
- Run Current Task (`roop.runTask`).
- Validate Current Document (`roop.validateDocument`) — Ctrl+Alt+L (Cmd+Alt+L on macOS).
- Scan and Register Modules (`roop.scanModules`).
- Generate `.roopmodule.json` (`roop.generateModuleManifest`).

### 9.4 Custom views (Modules, Tasks, World Model)

The Activity Bar provides a ROOP container with three views: Modules, Tasks, and World Model. The Modules view includes a welcome panel with shortcuts to create an example project and open the language reference.

### 9.5 Tasks and problem matcher

A workspace task type `roop` supports commands: `compile`, `validate`, `format`, and `run`. Diagnostics from the language server use the `$roop-lsp` problem matcher pattern `file:line:column - severity message`.

### 9.6 JSON validation for module files

Files matching `*.roopmodule.json` are validated against the bundled schema; completions include categories, parameter types and units, and structured sections such as `module`, `interfaces`, `capabilities`, `events`, and `safety`.

### 9.7 Walkthroughs and welcome

The Getting Started walkthrough introduces the language reference and encourages creating an example project to experiment with syntax, triggers, actions, and patterns.

## 10. Project Layout, Development, and Debugging

- Press F5 to launch an Extension Development Host and open a `.roop` file to exercise highlighting, indentation, and LSP features.
- Edit the language server in `server.ts`, then run `npm run compile` to rebuild.
- Enable the ROOP formatter in settings and ensure it is the active formatter for `.roop` files.

## 11. Build, Package, and Publish

```sh
npm install
npm run compile
npx vsce package                 # produce a .vsix
code --install-extension *.vsix  # local install
# Publish (requires a Marketplace publisher and a PAT)
npx vsce publish
```

## 12. Troubleshooting

- Highlighting appears wrong: confirm the file extension is `.roop`.
- Manifest shows validation errors: expand diagnostics to locate the field violating the schema (type/unit/enums/ranges).
- Formatter does not run: enable ROOP formatter and confirm no conflicting formatter is configured.
- Completions are missing: ensure the language server is active and that your workspace contains `.roop` or `.roopmodule.json` files.

## 13. Contributing

Fork the project, create a feature branch, and submit a pull request with focused changes. Include tests or smoke scripts when altering the grammar or schema. Keep documentation and examples in sync with language changes.

## 14. License

MIT
