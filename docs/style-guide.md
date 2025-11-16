# ROOP Style Guide

Version: 1.0  
Audience: Authors of `.roop` scripts, template authors, and module providers.

This guide codifies the canonical style for ROOP (Robot‑Oriented Operational Programming). It aligns with the language configuration, TextMate grammar, JSON schemas, and the language reference used by the VS Code extension. It focuses on readability, predictability, and task‑centric clarity so that a script reads like a plan a person could follow.

## Table of Contents

1. Goals and Scope  
   1.1 Why a style guide  
   1.2 Design principles
2. File Basics and Editor Behavior  
   2.1 File names and encoding  
   2.2 Comments and regions  
   2.3 Indentation and block headers  
   2.4 Strings, numbers, booleans, durations
3. Formatting Rules (Authoritative)  
   3.1 Two‑space indentation (configurable)  
   3.2 Trailing colon on block headers  
   3.3 Double‑quoted strings and interpolation  
   3.4 Spacing and line length  
   3.5 Blank lines and trailing whitespace
4. Naming Conventions  
   4.1 Tasks  
   4.2 Modules and capabilities  
   4.3 Templates and subtasks  
   4.4 Variables and constants  
   4.5 Entity and selector names
5. Action Line Shape and Patterns  
   5.1 Verb → actor → preposition → target  
   5.2 Place and moment alongside goal  
   5.3 One action per line
6. Blocks and Control Flow  
   6.1 if / elseif / else  
   6.2 repeat / while / for  
   6.3 when / on / at  
   6.4 parallel / await run / detached run / synchronize  
   6.5 Handlers: on failure / on timeout / on deviation / fallback / retry / abort / max retries
7. Variables and Expressions  
   7.1 let and assignment  
   7.2 Operators and precedence  
   7.3 Membership and relational prepositions  
   7.4 String interpolation and formatting
8. Selectors and World Model Style  
   8.1 Semantic selectors (object, area, surface, zone, label, pose, reference)  
   8.2 Qualifiers (with color/state/owner/size, near/in/on, relative to, anchor on)  
   8.3 Confidence phrasing (probably, confidently)
9. Spatial and Motion Style  
   9.1 Poses, frames, offsets  
   9.2 Prepositions: to, from, in, on, near, through…  
   9.3 Reachability and clarity checks
10. Time and Scheduling Style  
    10.1 at time "HH:MM"  
    10.2 every / wait / delay / countdown / until / expect / wait for / with timeout  
    10.3 Durations and units
11. Dialogue and UI Style  
    11.1 say / display / notify  
    11.2 ask / expect / listen  
    11.3 Text guidelines for human‑facing strings
12. Concurrency and Multi‑Robot Coordination  
    12.1 parallel blocks and lifetimes  
    12.2 await run vs detached run  
    12.3 Resource exclusivity and synchronization  
    12.4 assign / dispatch / synchronize / sync when
13. Error Handling and Recovery Patterns  
    13.1 Attaching handlers correctly  
    13.2 Retry and backoff patterns  
    13.3 Fallback strategies and graceful degradation  
    13.4 Abort, exit, break, continue
14. Modules and Capability Mapping Style  
    14.1 use module placement and naming  
    14.2 Capability verbs, parameters, and signatures  
    14.3 Safety/limits and profiles in modules  
    14.4 Events, telemetry, and errors from modules
15. Diagnostics and Lint Expectations  
    15.1 Missing colon and unbalanced task checks  
    15.2 Validation, schema checks, and max problems  
    15.3 Logging and reporting conventions
16. Authoring Examples (Canonical)  
    16.1 Pick and place (manipulation)  
    16.2 Navigation and docking  
    16.3 Time‑driven routines  
    16.4 Perception‑driven reactions  
    16.5 Dialogue‑centric flows  
    16.6 Safety and recovery
17. Verb Catalog and Usage Patterns (Task‑oriented)  
    17.1 Manipulation and Tool Use  
    17.2 Motion and Navigation  
    17.3 Vision and Perception  
    17.4 Speech, Audio, and Display  
    17.5 Smart‑Home and IoT  
    17.6 Healthcare and Assistive  
    17.7 Hospitality, Retail, and Service  
    17.8 Industrial and Warehouse  
    17.9 Household and Domestic  
    17.10 Multi‑agent and System Utilities
18. Reserved Keywords and Block Headers (Reference)
19. Editor and Tooling Integration  
    19.1 Commands and keybindings overview  
    19.2 Recommended settings
20. Appendix A: Units, Durations, and Types in Modules
21. Appendix B: Mini Grammar Cheatsheet

---

## 1. Goals and Scope

### 1.1 Why a style guide

ROOP is designed to read like a task plan that a human can follow. Style rules keep scripts predictable for authors, reviewers, and tools, and ensure that modules can map verbs and selectors to capabilities consistently.

### 1.2 Design principles

Intent before mechanism; space and time as first‑class concepts; safety and recoverability; and human‑centered readability. State goals, places, and moments explicitly so order in code matches order of operations.

## 2. File Basics and Editor Behavior

### 2.1 File names and encoding

Use the `.roop` extension and UTF‑8 encoding. One task per file is preferred for small flows; multiple tasks may share a file when they are tightly related.

### 2.2 Comments and regions

Single‑line comments start with `//`. To create collapsible regions, use `// #region` and `// #endregion` on their own lines. Editors recognize these markers for folding.

### 2.3 Indentation and block headers

Indentation is significant for readability. Any header line that ends with a colon starts a block and increases indentation for following lines. The `end task` line closes a task block and outdents to the enclosing level.

### 2.4 Strings, numbers, booleans, durations

Strings use double quotes and support `"` and `\`. Numbers may be integer or decimal. Booleans are `true` and `false`. Durations accept units such as `ms`, `s`/`sec`/`seconds`, `min`/`minutes`, and `h`/`hours`.

## 3. Formatting Rules (Authoritative)

### 3.1 Two‑space indentation (configurable)

Indent blocks with two spaces. Configure with the workspace setting `roop.format.indentSize` if your team standard differs.

### 3.2 Trailing colon on block headers

The following headers require a trailing colon and start a new block: `when`, `on`, `at`, `if`, `elseif`, `else`, `repeat`, `while`, `for`, `parallel`, `context`, `with timeout`, `every`, `sync when`, `detached run`, `await run`, `run`, `template task`, `start task`, and `fallback`. Always include the colon on the header line.

### 3.3 Double‑quoted strings and interpolation

Always use double quotes for string literals. Interpolate with `{}` inside strings when needed, for example: `say "Hello, {userName}."`. Prefer interpolation over string concatenation for human‑facing text.

### 3.4 Spacing and line length

Prefer a single space around binary operators and after commas. Keep lines under 100–120 characters; break long argument lists across multiple lines by introducing variables or templates.

### 3.5 Blank lines and trailing whitespace

Group logically related statements with a single blank line. Avoid trailing whitespace. Ensure the file ends with a newline.

## 4. Naming Conventions

### 4.1 Tasks

Use imperative, descriptive names that read like an operator’s intent. Examples: `start task "Pick Red Mug"`, `start task "Greet Visitor"`. Prefer Title Case for task titles.

### 4.2 Modules and capabilities

Name modules after physical devices or service roles, such as `"Arm1"`, `"Gripper1"`, `"CameraFront"`, `"LightKitchen"`. Keep names stable across scripts.

### 4.3 Templates and subtasks

Template names are verbs with objects or outcomes: `"PickAndPlace"`, `"OpenDoor"`, `"CleanSurface"`. Subtasks called with `run` should mirror the task title they invoke.

### 4.4 Variables and constants

Use `camelCase` for variables (`targetMug`, `attemptCount`) and `SNAKE_CASE` only for fixed configuration constants if needed. Avoid abbreviations that hide meaning.

### 4.5 Entity and selector names

Use human‑recognizable labels: `object "mug" with color "red"`, `area "KitchenIsland"`, `surface "CoffeeTable"`, `label "charger"`. Prefer nouns a person would say out loud.

## 5. Action Line Shape and Patterns

### 5.1 Verb → actor → preposition → target

Write actions as a readable phrase: `verb [actor] [preposition] target`.

Examples:

```
move Arm1 to "DishRack"
grasp with Gripper1
release with Gripper1
turn on "CoffeeMachine"
display "Task in progress" on "Panel1"
```

### 5.2 Place and moment alongside goal

Combine goal (verb), place (selector or area), and moment (trigger) where appropriate:

```
when object "mug" with color "red" appears on "Table":
  move Arm1 to "mug"
  grasp with Gripper1
  move Arm1 to "Tray"
  release with Gripper1
```

### 5.3 One action per line

Prefer one action per line. For multi‑step operations, extract a `template task` or `run` a subtask to keep blocks short.

## 6. Blocks and Control Flow

### 6.1 if / elseif / else

Test the most likely or simplest condition first. Keep guard expressions short and use semantic predicates (`in`, `on`, `near`, `exists`) for clarity.

```
if object "mug" is on "Table":
  move Arm1 to "Table"
  grasp with Gripper1
elseif surface "Countertop" is clear:
  say "No mug found; counter is clear."
else:
  say "No suitable condition met."
```

### 6.2 repeat / while / for

Use `repeat N times` for fixed loops, `while` for conditionals, and `for` for collections.

```
repeat 3 times:
  say "Reminder"

while object "trash" exists on "Floor":
  move Arm1 to "trash"
  grasp with Gripper1
  move Arm1 to "Bin"
  release with Gripper1

let zones = ["Table", "Shelf", "Floor"]
for area in zones:
  scan area
```

### 6.3 when / on / at

Attach event and time triggers as blocks; they do not reorder previously written statements unless awaited.

```
at time "07:00":
  say "Good morning"

when human appears near "Door":
  say "Hello, welcome"

on failure:
  say "I encountered a problem."
```

### 6.4 parallel / await run / detached run / synchronize

Use `parallel` to run independent tasks concurrently. Use `await run` when subsequent logic depends on the result. Use `detached run` for watchers or long‑running monitors. Use `synchronize` or `sync when` to establish rendezvous points.

### 6.5 Handlers: on failure / on timeout / on deviation / fallback / retry / abort / max retries

Attach handlers immediately after the statement or block they guard. Keep each handler focused on a single recovery strategy. Use `retry after <duration>` for backoff, `fallback:` for alternates, and `abort` to terminate safely.

## 7. Variables and Expressions

### 7.1 let and assignment

Declare with `let` and assign with `=`:

```
let attemptCount = 0
let tray = "TrayArea"
let target = object "mug" with color "blue"
attemptCount = attemptCount + 1
```

### 7.2 Operators and precedence

Use comparison operators `== != < > <= >=` and logical `and or not`. Parenthesize for clarity when mixing operators.

### 7.3 Membership and relational prepositions

Prefer `in`, `contains`, and relational prepositions like `is`, `near`, `before`, `after`, `between`, `within`, `as`, `to`, `from`, `by`, `with`, `over`, `under`, `around`, `across`, `through`, `onto`, `into`, `relative to`, `anchor on` to express spatial or semantic relations.

### 7.4 String interpolation and formatting

Use `{var}` inside double‑quoted strings. Avoid excessive concatenation; build phrases that read naturally.

## 8. Selectors and World Model Style

### 8.1 Semantic selectors

Use selectors to bind language terms to sensed entities:

```
object "mug" with color "red"
area "KitchenTable"
surface "Countertop"
zone "Entrance"
label "charger"
pose "Home"
reference "Door"
```

Store and reuse selectors via variables to avoid duplication.

### 8.2 Qualifiers and relations

Qualify selectors with attributes and relations:

```
object "cup" with color "blue" near "Sofa"
object "plate" on "Table"
object "bottle" in "Fridge"
pose "PickPose" relative to "Table" with offset "{x:0.1, y:0, z:0.05}"
```

### 8.3 Confidence phrasing

Use adverbs when appropriate: `probably`, `confidently`. Example: `if object "glass" is probably on "Table": …`

## 9. Spatial and Motion Style

### 9.1 Poses, frames, offsets

Prefer semantic frames (`reference`, `pose`, `anchor`) over raw coordinates. Express offsets and anchors explicitly to make intent clear.

### 9.2 Prepositions

Use the smallest set of prepositions that conveys the geometry: `to`, `from`, `in`, `on`, `near`, `through`, `around`, `between`, `within`, `onto`, `into`.

### 9.3 Reachability and clarity

Check for clear surfaces or reachable objects before commanding motion:

```
if surface "Countertop" is clear and object "mug" is reachable:
  move Arm1 to "mug"
```

## 10. Time and Scheduling Style

### 10.1 at time "HH:MM"

Schedule by local time strings: `at time "07:00": …`

### 10.2 Periodic and waiting constructs

Use `every`, `wait`, `delay`, `countdown`, `until`, `expect`, `ask`, `wait for`, and `with timeout` to express timing and expectations. Attach `on timeout` handlers when waiting on external events.

### 10.3 Durations and units

Write human‑readable durations (`200 ms`, `5 s`, `2 min`, `1 h`). Keep units close to the number and avoid ambiguous abbreviations.

## 11. Dialogue and UI Style

### 11.1 Output

Use `say`, `display`, `notify`, `log`, `report` for voice, screen, notifications, and logs. Keep user‑facing strings brief and actionable.

### 11.2 Input and expectations

Use `ask "Question?" as answer` for explicit input; use `expect`/`wait for` for event‑like input. Always attach timeouts for robustness.

### 11.3 Text guidelines

Write in clear, respectful language. Prefer full sentences and include context when asking the user to act: `say "Please move the mug closer so I can reach it."`

## 12. Concurrency and Multi‑Robot Coordination

### 12.1 parallel lifetimes

`parallel:` runs child blocks concurrently and completes when all children complete unless a handler aborts.

### 12.2 await vs detached

Use `await run` when later logic depends on a subtask’s completion; use `detached run` for background monitors (e.g., environmental sensing).

### 12.3 Resource exclusivity and synchronization

If a subtask must hold an exclusive device (`Arm1`, `Gripper1`), launch it with explicit exclusivity if supported. Use `synchronize` or `sync when` to coordinate multiple tasks or robots.

### 12.4 assign / dispatch

Assign roles and dispatch tasks to specific robots:

```
assign "BotA" as surveyor
assign "BotB" as carrier
parallel:
  dispatch task "ScanRoom" to BotA
  dispatch task "FetchObject" to BotB
synchronize at "Exit"
```

## 13. Error Handling and Recovery Patterns

### 13.1 Attaching handlers

Place `on failure`, `on timeout`, `on deviation`, and `on interruption` immediately after the action or block they protect.

### 13.2 Retry and backoff

Use `retry` or `retry after <duration>` for transient issues. Keep retry counts bounded with `max retries` and escalate via `fallback:` after exhaustion.

### 13.3 Fallback strategies

Provide a simpler alternative when primary actions fail (e.g., switch from vision‑guided to fixed pose). Communicate with the user using `say` or `notify`.

### 13.4 Abort, exit, break, continue

Use `abort` to terminate safely, `exit` to end a task, `break` to leave a loop, and `continue` to skip to the next iteration.

## 14. Modules and Capability Mapping Style

### 14.1 Declaring modules

Declare modules before first use near the top of a task:

```
use module "Arm1"
use module "Gripper1"
use module "CameraFront"
```

### 14.2 Capability verbs and parameters

Verbs route to module capabilities. Prefer signatures that read naturally, e.g., `grasp with {gripper} at {pose}`. Bind parameters by name when the module defines them.

### 14.3 Safety and profiles

Honor module safety limits (speed, force, zones) and choose appropriate profiles (home, factory, demo) if provided by the module manifest.

### 14.4 Events, telemetry, errors

Subscribe or react to module events via `when`/`on`, monitor telemetry as needed, and handle enumerated error codes with appropriate recovery.

## 15. Diagnostics and Lint Expectations

### 15.1 Missing colon and unbalanced tasks

Expect diagnostics when a block header lacks a trailing colon or when `start task`/`end task` are unbalanced.

### 15.2 Validation and max problems

Keep the validator enabled and the maximum reported problems reasonable to avoid noise fatigue during editing.

### 15.3 Logging and reporting

Use `log` for internal notes and `report` for structured summaries when supported. Avoid excessive chatter in user‑facing channels.

## 16. Authoring Examples (Canonical)

### 16.1 Pick and place

```
start task "PickRedMugToTray"
  use module "Arm1"
  use module "Gripper1"

  when object "mug" with color "red" appears on "Table":
    move Arm1 to "mug"
    grasp with Gripper1
    move Arm1 to "Tray"
    release with Gripper1
on failure:
  say "I could not complete the pick and place."
end task
```

### 16.2 Navigation and docking

```
start task "DeliverToKitchen"
  use module "Base"
  navigate to "Kitchen"
  dock at "ChargingDock"
end task
```

### 16.3 Time‑driven routines

```
start task "MorningLights"
  at time "07:00":
    turn on "LightKitchen"
end task
```

### 16.4 Perception‑driven reactions

```
start task "GreetAtDoor"
  when human appears near "Door":
    say "Hello, welcome"
end task
```

### 16.5 Dialogue‑centric flows

```
start task "DrinkChoice"
  ask "Tea or coffee?" as drink
  say "Preparing {drink}."
end task
```

### 16.6 Safety and recovery

```
start task "OpenFridgeCarefully"
  open "FridgeDoor"
  on deviation:
    abort
  on failure:
    fallback:
      say "Please open the door slightly, then I will try again."
end task
```

## 17. Verb Catalog and Usage Patterns (Task‑oriented)

The following verbs are recognized by the language tooling out of the box; modules may add more. Group similar actions and use the simplest verb that matches intent.

### 17.1 Manipulation and Tool Use

grasp, release, place, pick, pick up, put, drop, push, pull, slide, lift, lower, carry, insert, remove, pour, scoop, stir, cut, slice, chop, peel, crack, mix, fold, knead, spread, wipe, scrub, brush, sweep, vacuum, mop, squeegee, open, close, twist, screw, unscrew, tighten, loosen, connect, disconnect, plug, unplug, attach, detach, lock, unlock, latch, unlatch, press, tap, hold, handover, receive, present.

Usage:

```
grasp with Gripper1
place object "mug" on "Tray"
twist "Knob" to "Left"
press "ButtonStart"
```

### 17.2 Motion and Navigation

move, navigate, go, approach, retreat, follow, lead, dock, undock, rotate, tilt, pan, look, track, observe, scan area, map, localize, explore, avoid, stop, pause, resume, align, climb, descend, traverse, cross, dock to, charge, navigate to.

Usage:

```
move Arm1 to "HomePose"
navigate to "ChargingDock"
follow object "person"
avoid area "NoGoZone"
```

### 17.3 Vision and Perception

detect, recognize, classify, segment, locate, estimate, read, ocr, barcode, qr, monitor, count, reidentify, measure temperature, measure humidity, measure air quality, detect human, detect face, detect gesture, estimate emotion, track object, scan, observe, track.

Usage:

```
scan area "Table"
detect object "bottle" with color "blue"
count objects labeled "apple"
read text from "Label"
```

### 17.4 Speech, Audio, and Display

say, display, notify, log, ask, confirm, translate, transcribe, play, record, stream, call, message, show, listen.

Usage:

```
say "Welcome"
display "Task in progress" on "Panel1"
ask "Proceed?" as consent
```

### 17.5 Smart‑Home and IoT

turn on, turn off, toggle, set, adjust, increase, decrease, dim, brighten, heat, cool, fan on, fan off, open door, close door, open window, close window, open blinds, close blinds, open curtains, close curtains.

Usage:

```
turn on "Heater"
set "Thermostat" to 22
dim "LightLiving" to 30
```

### 17.6 Healthcare and Assistive

water plants, feed pet, refill, dispense, sanitize, sterilize, disinfect, measure heart rate, measure spo2, measure blood pressure, measure respiration, alert, alarm, guard, patrol.

Usage:

```
notify caregiver "Abnormal reading"
dispense "MedicationA"
measure heart rate for "Patient"
```

### 17.7 Hospitality, Retail, and Service

present, serve, inventory (via count), scan barcode, show, checkout (via display/call).

Usage:

```
say "Welcome"
display "Total $12.50" on "Kiosk"
read code from "Package"
```

### 17.8 Industrial and Warehouse

pick and place, palletize, depalletize, move AGV (navigate), verify torque (measure), quality inspect (detect/segment/recognize).

Usage:

```
call "PickAndPlace"(object "box", "Pallet")
navigate to "StationA"
measure torque on "Bolt"
```

### 17.9 Household and Domestic

clean (wipe/sweep/vacuum/mop), collect toys (detect + loop), make coffee (turn on + pour), laundry (open/close/start cycle).

Usage:

```
wipe surface "Countertop"
for toy in detect all object "toy":
  move Arm1 to toy
  grasp with Gripper1
  place toy in "Bin"
```

### 17.10 Multi‑agent and System Utilities

lock door, unlock door, assign, dispatch, synchronize, broadcast, negotiate, yield, request, share map, use module, configure, calibrate, reset, restart, shutdown, sleep, wake, ping, diagnose, update firmware, plan.

Usage:

```
assign "BotA" as scout
dispatch task "Survey" to BotA
synchronize at "HomeBase"
update firmware on "ArmController"
```

## 18. Reserved Keywords and Block Headers (Reference)

Structure and control: start, task, end, template, if, elseif, else, repeat, while, for, parallel, on, when, at, with, await, detached, abort, retry, fallback, break, continue, exit, import, include, pragma, use, module, call, run, context, every, with timeout, sync when, detached run, await run.

Entity and selector introducers: object, objects, human, user, pet, robot, module, task, door, cup, mug, bottle, plate, tray, sofa, table, desk, shelf, bin, lamp, light, camera, gripper, arm, base, speaker, screen, oven, microwave, elevator, stairs, label, color, material, state, owner, size, confidence.

Operators: and, or, not, ==, !=, <=, >=, <, >, in, contains, is, near, before, after, between, within, as, to, from, by, with, over, under, around, across, through, onto, into, relative to, anchor on.

## 19. Editor and Tooling Integration

### 19.1 Commands and keybindings

Common commands: Insert Task Block, Create Example Project, Open Language Reference, Run Current Task, Validate Current Document, Scan and Register Modules, Generate `.roopmodule.json`. Default keybindings include shortcuts for inserting a task, opening docs, and validating documents.

### 19.2 Recommended settings

Enable the built‑in formatter and semantic highlighting. Keep validation on and set a reasonable `roop.validation.maxProblems`. Add custom keywords to completion via `roop.completion.extraKeywords` when your team standardizes on new verbs.

Example settings snippet:

```
{
  "roop.format.enabled": true,
  "roop.format.indentSize": 2,
  "roop.validation.enable": true,
  "roop.validation.maxProblems": 200
}
```

## 20. Appendix A: Units, Durations, and Types in Modules

Module parameters often include typed values with units such as distance (m, cm, mm, in, ft), angle (rad, deg), time (s, ms, min, h), mass (kg, g, lb), and others like %, ppm, Pa, lux. Prefer SI units unless the device or environment dictates otherwise. Use ranges and defaults defined by the module manifest when available.

Common parameter types: string, number, integer, boolean, array, object, pose, vector3, quaternion, duration, datetime, color, percentage, speed, acceleration, temperature, pressure, distance, angle, image, audio, video, file, enum.

## 21. Appendix B: Mini Grammar Cheatsheet

Headers that start blocks (must end with a colon):
when, on, at, if, elseif, else, repeat, while, for, parallel, context, with timeout, every, sync when, detached run, await run, run, template task, start task, fallback.

End task line:
end task

String and interpolation:
Double‑quoted strings; use `{}` to interpolate variables inside strings.

Duration literals:
`200 ms`, `5 s`, `2 min`, `1 h`.

Example header + block:

```
if object "mug" is on "Table":
  move Arm1 to "Table"
  grasp with Gripper1
else:
  say "No mug on the table."
```
