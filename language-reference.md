# ROOP Language Reference

Version: 0.3  
Status: Draft normative specification for the ROOP language as implemented by the VS Code extension.

This document specifies the ROOP (Robot‑Oriented Operational Programming) language. It defines the lexical rules, block structure, statements, expressions, events, error handling, concurrency, entity selectors, scheduling, testing constructs, and a capability catalog that maps common real‑world tasks to language patterns and module capabilities.

For introductory material and tutorials, see the Getting Started guide. For LSP details, see the LSP Design document. This reference is language‑level and runtime‑agnostic; concrete hardware behaviors are provided by modules declared through `.roopmodule` capability files and bound at runtime by the platform.

## Table of Contents

1. Overview and Design Goals  
   1.1 Purpose  
   1.2 First‑principles rationale  
   1.3 The Goal–Place–Moment mapping  
   1.4 Execution model  
   1.5 Design goals
   1.6 Quick examples
   1.7 Relationship to the stack
2. Notation and Conventions  
   2.1 Files and extensions  
   2.2 Indentation and block headers
   2.3 Comments  
   2.4 Identifiers and naming
   2.5 Literals
   2.6 Action line shape
   2.7 Triggers and guards
   2.8 Concurrency and asynchrony
3. Lexical Structure  
   3.1 Tokens and categories
   3.2 Whitespace
   3.3 Strings and numbers
   3.4 Comments
   3.5 Identifiers  
   3.6 Reserved words
   3.7 Blocks and delimiters
   3.8 Examples that show goal, place, and moment
4. Program Structure  
   4.1 Tasks  
   4.2 Directives: import, include, pragma  
   4.3 Using Modules  
   4.4 Template Tasks
5. Statements  
   5.1 Action Statements  
   5.2 Variable Declaration and Assignment  
   5.3 Control Flow: if, elseif, else  
   5.4 Iteration: repeat, while, for  
   5.5 Event Triggers: when, on, at  
   5.6 Exception Handling: on failure, on timeout, on deviation, on interruption, retry, fallback, abort, skip, max retries  
   5.7 Concurrency and Async: parallel, await run, detached run, synchronize, exclusive access  
   5.8 Subtask and Template Invocation: run, call
6. Expressions and Selectors  
   6.1 Primitive Expressions  
   6.2 Semantic Selectors: object, area, surface, zone, label, pose, reference  
   6.3 Relations and Predicates: exists, near, on, in, reachable, clear, probably, confidently  
   6.4 Comparisons and Logical Operators  
   6.5 String Interpolation
7. Entities and the World Model
8. Time and Scheduling
9. Perception and Detection Verbs
10. Dialogue and User Interaction
11. Multi‑Robot Coordination
12. Capability Catalog (task‑oriented patterns)  
    12.1 Motion and Navigation  
    12.2 Manipulation and Tool Use  
    12.3 Vision and Perception  
    12.4 Speech, Audio, and Display  
    12.5 Smart‑Home and IoT  
    12.6 Healthcare and Assistive Operations  
    12.7 Hospitality, Retail, and Service  
    12.8 Industrial and Warehouse Operations  
    12.9 Household and Domestic Tasks  
    12.10 Education and Research Patterns  
    12.11 Safety and Compliance Patterns
13. Directives Reference
14. System Variables and Context
15. Diagnostics, Results, and Error Semantics
16. Testing Constructs
17. Formatting and Style Rules
18. Grammar Summary (EBNF)
19. Examples
20. Appendix A: .roopmodule Capability Files
21. Appendix B: Reserved Keywords and Built‑ins

## 1. Overview and Design Goals

### 1.1 Purpose

ROOP (Robot‑Oriented Operational Programming) is a task‑centric language for describing robot behavior as readable scripts. A script expresses intention using a human‑legible triad:

• What to accomplish: the goal stated as actions such as move, grasp, release, say, turn on.  
• Where to act: the target objects, areas, surfaces, or poses in the environment.  
• When to respond: the temporal or event conditions that start or modify actions.

Under the hood, the runtime compiles each script into a behavior graph, binds semantic selectors to perception, and dispatches capabilities to modules. Authors never call device APIs directly; instead they state intentions like “move Arm1 to cup”, “when a human appears: say ‘hello’”, or “at time 07:00: turn on CoffeeMachine”. The scheduler respects the written order unless an explicit control structure changes it, which keeps code order aligned with human action order.

### 1.2 First‑principles rationale

1. Intent before mechanism. The script names goals and context; the system chooses algorithms and device calls.
2. Space is a first‑class concept. Objects, areas, and relations (on, near, in) appear directly in code.
3. Time and events drive behavior. Triggers such as when, at, on, and if attach conditions to actions.
4. Safety and recoverability. Failures and timeouts are expressed structurally and have default fallback behavior.
5. Human factors. The language is minimal and predictable: line‑by‑line execution, small vocabulary, consistent colons on block headers, and indentation that mirrors logical nesting.

### 1.3 The Goal–Place–Moment mapping

ROOP maps the triad to runtime responsibilities:

• Goal → capability dispatch. Verbs such as move, grasp, release, say, display, notify route to modules that advertise the ability to perform them.  
• Place → semantic binding. Selectors such as object "mug", area "Countertop", surface "Table" are bound to live perception and spatial state.  
• Moment → reactive scheduling. when attaches event listeners, at installs timers, on attaches feedback branches, if forms conditional guards.

This mapping determines which mechanical components and software modules are required for each step. For example, “when red mug appears: grasp with Gripper1” selects a vision pipeline to detect the mug and a gripper device to execute the action; the event determines the need and timing for the hardware, not the other way around.

### 1.4 Execution model

1. Parse and normalize the script.
2. Build a behavior graph with nodes for actions, guards, triggers, and feedback paths.
3. Resolve semantic selectors to perception queries.
4. Allocate module capabilities and plan motions or other device‑level operations.
5. Run the graph with a scheduler that preserves written order unless parallel or await/detached is used.
6. Emit structured feedback states such as success, failure, timeout, interrupted.

### 1.5 Design goals

Readability. Scripts read like task lists.  
Determinism where possible. Order is explicit and concurrency is opt‑in.  
Modularity. Capabilities are declared by modules and invoked by verb phrases.  
Portability. The same script can run on different robots if capabilities are present.  
Inspectability and testability. Behavior graphs and feedback are designed for tooling and unit tests.  
Resilience. Failure branches, retry, and fallback are part of the language.  
Human‑centered interaction. say, display, notify, ask, expect are built‑in so the robot can work with people rather than around them.

### 1.6 Quick examples

Temporal trigger:

```roop
at time "07:00":
  say "Good morning"
  turn on "CoffeeMachine"
```

Perception trigger with location binding:

```roop
when object "mug" with color "red" appears on "Table":
  move Arm1 to "mug"
  grasp with Gripper1
  move Arm1 to "Tray"
  release with Gripper1
```

Failure handling and retry:

```roop
grasp with Gripper1
on failure:
  say "I couldn't grab it yet."
  retry after 2 seconds
```

### 1.7 Relationship to the stack

ROOP lives above device drivers and below user interfaces. Scripts are compiled into behavior graphs and executed by a scheduler that binds semantic queries to perception and module abilities. This lets authors describe cooperative behavior without writing perception or motion code.

## 2. Notation and Conventions

### 2.1 Files and extensions

Source files use the .roop extension and UTF‑8 encoding. Line endings may be LF or CRLF.

### 2.2 Indentation and block headers

Indentation is significant for readability. A block header ends with a colon and increases indentation for the lines that follow. Close the outer scope explicitly with end task for tasks. The following headers start a block: start task, when, on, at, if, elseif, else, repeat, while, for, parallel, and template task.

Preferred indentation is two spaces. Editor tooling auto‑indents after recognized headers and outdents on end task or when changing branches with elseif and else.

### 2.3 Comments

Use // for single‑line comments. There are no block comments.

### 2.4 Identifiers and naming

Identifiers begin with a letter or underscore and may include letters, digits, underscores, and hyphens. They are case‑sensitive. Recommended style: PascalCase for task names, camelCase for variables, short descriptive nouns for modules and areas.

### 2.5 Literals

Strings use double quotes and support escape sequences like \\ and \". Numbers may be integers or decimals. Booleans are true and false. Arrays are bracketed, for example ["Table", "Shelf", "Floor"].

### 2.6 Action line shape

Most action lines follow a simple readable pattern that reinforces the core principle:

verb [module/actor] preposition target

Examples:

```roop
move Arm1 to "DishRack"
grasp with Gripper1
release with Gripper1
say "Welcome"
turn on "Lamp"
display "Task in progress…" on "Panel1"
```

### 2.7 Triggers and guards

Use when to react to perception, at to schedule a time, on to branch on feedback, and if/elseif/else to guard execution. Triggers attach to blocks and do not reorder earlier statements unless explicitly awaited or run in parallel.

```roop
when human appears:
  if time is after "20:00":
    say "Welcome back"
```

### 2.8 Concurrency and asynchrony

Use parallel to run independent tasks concurrently. Use await to wait for a task’s completion or detached to start a long‑running monitor in the background. Resource contention is managed by the scheduler; exclusive access can be declared at task boundaries where supported.

## 3. Lexical Structure

### 3.1 Tokens and categories

Keywords fall into several categories.

Triggers and guards: when, on, at, if, elseif, else.  
Control flow: repeat, while, for, parallel, await, detached, break, continue, exit, abort, retry, fallback.  
Task and module scaffolding: start task, end task, use module, template task.  
Built‑in actions: say, move, grasp, release, turn on, display, notify, ask, expect, plan, track, observe, assign, dispatch, synchronize, navigate, define, call.  
Entity introducers: object, area, surface, label, module, task, zone, pose, reference.

### 3.2 Whitespace

Whitespace separates tokens. Indentation is significant only at the start of a line and after block headers. Inside a line, single spaces are conventional and multiple spaces do not change meaning.

### 3.3 Strings and numbers

A string literal begins with " and ends with ". Escape sequences use a leading backslash. A number literal is a sequence of digits, optionally with a decimal point.

### 3.4 Comments

A comment begins with // and runs to the end of the line.

### 3.5 Identifiers

Identifiers start with a letter or underscore and may contain letters, digits, underscores, and hyphens. Identifiers are case‑sensitive.

### 3.6 Reserved words

All listed keywords are reserved and cannot be used as identifiers: triggers and guards, control flow keywords, task scaffolding terms, built‑in action verbs, and entity introducers.

### 3.7 Blocks and delimiters

A line that ends with a colon begins a block. The next line must be indented. Blocks end when indentation returns to the enclosing level. The task block is explicitly closed with end task.

### 3.8 Examples that show goal, place, and moment

Immediate action:

```roop
start task "ServeTea"
  use module "Arm1"
  use module "Gripper1"
  move Arm1 to object "cup" with label "tea"
  grasp with Gripper1
  move Arm1 to "Tray"
  release with Gripper1
end task
```

Perception‑driven reaction:

```roop
start task "GreetAtDoor"
  use module "Speaker"
  when object "human" appears near "Door":
    say "Hello, welcome"
end task
```

Time‑driven routine:

```roop
start task "MorningLights"
  use module "Light1"
  at time "07:00":
    turn on "Light1"
end task
```

These examples keep the human‑readable order: choose what happens, specify where it applies, and state when it should occur. This yields scripts that are easy to read, test, and operate.

## 4. Program Structure

### 4.1 Tasks

A task is the top‑level unit of behavior.

```
start task "TaskName"
  // statements
end task
```

A file may contain multiple tasks. Tasks do not nest. Tasks can be invoked by name from other tasks with `run` or `await run`.

### 4.2 Directives: import, include, pragma

Directives provide compile‑time controls and source inclusion.

```
import "std/io.roop"
include "./fragments/pour.roop"
pragma optimize on
```

`import` loads another script once per compilation unit. `include` inlines source text. `pragma` toggles language or runtime options supported by the platform. See the Directives Reference.

### 4.3 Using Modules

Modules are logical capabilities backed by devices or services. Declare modules before first use.

```
use module "Arm1"
use module "Gripper1"
use module "Camera1"
```

Capabilities come from `.roopmodule` files that map verbs to handlers. The runtime binds abstract actions to the available module graph. See Appendix A.

### 4.4 Template Tasks

Templates provide parameterized task bodies for reuse.

```
template task "PickAndPlace"(item, destination):
  move Arm1 to item
  grasp with Gripper1
  move Arm1 to destination
  release with Gripper1
```

Invoke a template with `call`:

```
call "PickAndPlace"(object "mug", "Tray")
```

## 5. Statements

### 5.1 Action Statements

An action statement is a verb phrase that requests a capability. Some verbs are built‑in for readability; most verbs are provided by modules.

Core built‑ins include: `say`, `move`, `grasp`, `release`, `turn on`, `display`, `notify`, `ask`, `expect`, `let`, `plan`, `track`, `observe`, `assign`, `dispatch`, `synchronize`, `navigate`, `define`, `template task`, `call`, `use module`, `start task`, `end task`.

Examples:

```
say "Welcome"
move Arm1 to "Kettle"
grasp with Gripper1
turn on "CoffeeMachine"
display "Task in progress…" on "Panel1"
```

### 5.2 Variable Declaration and Assignment

Use `let` to declare and assign. Variables are dynamically typed. Reassignment uses `=`.

```
let attemptCount = 0
let tray = "TrayArea"
let target = object "mug" with color "blue"

attemptCount = attemptCount + 1
```

### 5.3 Control Flow: if, elseif, else

Standard conditional blocks select statements based on expressions and semantic predicates.

```
if object "mug" is on "Table":
  move Arm1 to "Table"
  grasp with Gripper1
elseif surface "Countertop" is clear:
  say "No mug found, but the counter is clear."
else:
  say "No suitable condition met."
```

### 5.4 Iteration: repeat, while, for

Fixed iteration, condition‑driven loops, and list iteration are supported.

```
repeat 3 times:
  say "Reminder"

while object "trash" exists on "Floor":
  // clean one item
  move Arm1 to "trash"
  grasp with Gripper1
  move Arm1 to "Bin"
  release with Gripper1

let zones = ["Table", "Shelf", "Floor"]
for area in zones:
  scan area
```

`break`, `continue`, and `exit` control loop and task termination.

### 5.5 Event Triggers: when, on, at

Event blocks react to sensed changes, status, or time.

```
when red mug appears:
  move Arm1 to red mug
  grasp with Gripper1

on failure:
  say "Sorry, I couldn't reach it."

at time "08:00":
  say "Good morning"
```

### 5.6 Exception Handling

Attach exception handlers after actions or blocks.

```
move Arm1 to "Kettle"
grasp with Gripper1
on failure:
  retry after 2 seconds

wait for object "door" to open
on timeout:
  notify user "The door is taking too long."
```

Use `fallback:` to define alternative strategies, `abort` to terminate the task, `max retries` to limit retries, and `on deviation:` to handle motion deviations. Handlers can nest within loops and event blocks.

### 5.7 Concurrency and Async

Run blocks concurrently and coordinate results.

```
parallel:
  run "VacuumRoom"
  run "DisinfectSurfaces"

detached run "MonitorEnvironment"

let state = await run "CheckDoorState"
if state == "open":
  say "Door is open."

run "GraspObject" with exclusive access to "Arm1"
```

`synchronize` provides rendezvous points for multi‑task or multi‑robot flows.

### 5.8 Subtask and Template Invocation

Use `run "TaskName"` to start a task. Use `await run "TaskName"` to wait for its completion and capture a result. Use `call "Template"(args…)` to invoke a template.

## 6. Expressions and Selectors

### 6.1 Primitive Expressions

Numbers, strings, booleans, arrays, variables, and system variables such as `currentTime`, `currentRoom`, `taskName`, `userName` are expressions. String concatenation uses `+` and interpolation supports `{var}` in string literals.

### 6.2 Semantic Selectors

Selectors bind language terms to sensed entities at runtime.

```
object "mug" with color "red"
area "KitchenTable"
surface "Countertop"
zone "Entrance"
label "bottle"
pose "Home"
reference "Door"
```

Selectors can be stored in variables:

```
let target = object "cup" with color "blue"
move Arm1 to target
```

### 6.3 Relations and Predicates

Use relational predicates to reason about the world.

```
exists, near, on, in, reachable, clear
probably, confidently
```

Examples:

```
if object "toy" is near "Sofa":
  say "I will put the toy away."

if surface "CoffeeTable" is clear:
  place object on "CoffeeTable"

if object "glass" is probably on "Table":
  move Arm1 to "Table"
```

### 6.4 Comparisons and Logical Operators

Supported comparisons: `==`, `!=`, `>`, `<`, `>=`, `<=`. Logical operators: `and`, `or`, `not`. Parentheses establish precedence.

### 6.5 String Interpolation

Variables can be interpolated in double‑quoted strings: `say "Preparing {drink}."`

## 7. Entities and the World Model

ROOP scripts describe behavior over a world model of objects, areas, surfaces, zones, and references. Selectors resolve to dynamic bindings that update as perception changes. Modules are responsible for realizing these bindings through perception and tracking. Scripts should express intent with semantic terms rather than coordinates; the platform resolves coordinates during execution.

## 8. Time and Scheduling

Use `at time "HH:MM"` for scheduled actions and conditions involving `currentTime`. Durations appear in plain English such as `retry after 2 seconds`. Loops and detectors can implement periodic behaviors when needed.

## 9. Perception and Detection Verbs

Common perception verbs include `scan`, `detect`, `locate`, `track`, `observe`, and `expect`. These verbs create or update bindings and may accept parameters such as labels, attributes, and confidence thresholds.

```
let items = detect all object "plate" on "Table"
for plate in items:
  move Arm1 to plate
  grasp with Gripper1
  move Arm1 to "Sink"
  release with Gripper1
```

## 10. Dialogue and User Interaction

Use `say`, `display`, and `notify` to output information. Use `ask`, `wait for`, and `expect` to obtain input or wait on events.

```
ask "Would you like tea or coffee?" as drink
say "Preparing {drink}."
expect object "remote" on "Couch" within 10 seconds
on timeout:
  say "Still looking for the remote."
```

## 11. Multi‑Robot Coordination

Assign roles and dispatch tasks to specific robots. Synchronize at rendezvous points.

```
assign "BotA" as surveyor
assign "BotB" as carrier
parallel:
  dispatch task "ScanRoom" to BotA
  dispatch task "FetchObject" to BotB
synchronize at "Exit"
```

## 12. Capability Catalog (task‑oriented patterns)

This catalog organizes common real‑world actions into categories. Verbs map to module capabilities via `.roopmodule` files. The list is extensible; new modules can introduce additional verbs. Each item includes a typical calling pattern.

### 12.1 Motion and Navigation

- move: `move Arm1 to target` or `move base to "Kitchen"`
- navigate: `navigate to "ChargingDock"`
- rotate: `rotate head to "Door"`
- follow: `follow object "human"`
- avoid: `navigate around area "NoGoZone"`
- stop: `stop motion`
- dock: `dock at "ChargingDock"`
- undock: `undock`

### 12.2 Manipulation and Tool Use

- grasp, release: `grasp with Gripper1`, `release with Gripper1`
- pick, place: `pick object "mug"`, `place object on "Tray"`
- push, pull: `push object "drawer"`, `pull object "handle"`
- open, close: `open "FridgeDoor"`, `close "FridgeDoor"`
- pour: `pour from "Kettle" to "Cup"`
- scoop, stir, cut (tool modules): `stir "Bowl" with "Spoon"`
- insert, remove: `insert "Key" into "Lock"`
- press, toggle: `press "Button"`, `toggle "Switch"`
- align, fasten, loosen: `align "PartA" with "PartB"`, `fasten "Bolt"`, `loosen "Bolt"`

### 12.3 Vision and Perception

- scan: `scan area "Table"`
- detect: `detect object "bottle" with color "blue"`
- locate: `locate label "charger"`
- track: `track object "person"`
- measure: `measure distance to "Door"`
- read: `read text from "Label"`
- count: `count objects labeled "apple"`

### 12.4 Speech, Audio, and Display

- say: `say "Welcome"`
- ask: `ask "With sugar?" as withSugar`
- listen: `listen for "yes" within 5 seconds`
- display: `display "Task in progress…" on "Panel1"`
- notify: `notify user "Water tank is empty."`
- play, stop audio: `play "SleepMode"`, `stop audio`

### 12.5 Smart‑Home and IoT

- turn on, turn off: `turn on "Heater"`, `turn off "Lamp"`
- dim, set: `set "Light1" brightness 40`
- set temperature: `set "Thermostat" to 22`
- lock, unlock: `lock "FrontDoor"`, `unlock "FrontDoor"`
- open, close blinds: `open "Blinds"`, `close "Blinds"`

### 12.6 Healthcare and Assistive Operations

- remind: `say "Time for medication."`
- fetch: `run "FetchItem"(object "water bottle")`
- monitor: `detached run "MonitorBreathing"`
- alert: `notify caregiver "Abnormal reading"`
- assist transfer: `assist "Patient" from "Bed" to "Wheelchair"`

### 12.7 Hospitality, Retail, and Service

- greet: `say "Welcome"`
- seat: `guide "Guest" to "Table 3"`
- serve: `run "ServeDrink"`
- inventory: `count objects labeled "bottle" in "BarShelf"`
- checkout: `display "Total $12.50" on "Panel1"`

### 12.8 Industrial and Warehouse Operations

- pick and place: `call "PickAndPlace"(object "box", "Pallet")`
- palletize, depalletize: `palletize "Box" on "Pallet"`
- scan barcode: `read code from "Package"`
- move AGV: `navigate to "StationA"`
- verify torque: `measure torque on "Bolt"`
- quality inspect: `detect defect on "Part"`

### 12.9 Household and Domestic Tasks

- clean: `run "VacuumRoom"`
- wipe: `wipe surface "Countertop"`
- collect toys: `for toy in detect all object "toy": ...`
- make coffee: `turn on "CoffeeMachine"; pour ...`
- laundry: `open "Washer"; load "Clothes"; start "Cycle"`

### 12.10 Education and Research Patterns

- demonstrate: `say "Demonstrating grasp."`
- log: `log "Trial started"`
- randomize: `let angle = random between -10 and 10`
- reproduce: `call "RecordedTrajectory"(pose "Path1")`

### 12.11 Safety and Compliance Patterns

- wait for safe: `wait for area "Workcell" to be clear`
- emergency stop: `abort`
- slow mode: `set "Arm1" speed 0.1`
- confirm: `ask "Proceed?" as confirm` and branch accordingly

## 13. Directives Reference

- import "path": Load another script once.
- include "path": Inline source text at the point of inclusion.
- pragma option [on|off|value]: Enable or set platform‑specific options such as optimization or tracing.

## 14. System Variables and Context

The runtime exposes read‑only variables for convenience: `currentTime`, `currentRoom`, `taskName`, `userName`. Implementations may add more such as `batteryLevel` or `networkStatus`. Scripts can define context blocks for logical scoping of interactions:

```
context "WelcomeFlow":
  ask "May I take your coat?" as coatOffer
  if coatOffer == "yes":
    run "StoreCoat"
```

## 15. Diagnostics, Results, and Error Semantics

Every action yields a result state such as `success`, `failure`, `timeout`, `interrupted`, or `skipped`. Handlers attach to statements to react to these states. Scripts can record intermediate status in variables for later summarization. Use `on failure`, `on timeout`, and `on deviation` to direct recovery. Use `retry`, `retry after`, `fallback`, `skip`, and `abort` to control outcomes.

## 16. Testing Constructs

Tests validate task intent against simulated inputs and expected behaviors.

```
testcase "PickPlates" for task "CleanPlates"
  simulate object "plate" on "Table"
  run task "CleanPlates"
  expect move Arm1 to "Table"
  expect release with Gripper1 at "Sink"
```

Simulators provide perception inputs and environment states. Expectations assert that key behaviors occurred. A testing runner can collect pass/fail and coverage metrics.

## 17. Formatting and Style Rules

- Use two‑space indentation.
- Terminate block headers with a colon.
- Prefer descriptive names over `obj1`.
- Keep actions short and readable; extract subtasks with `template task` or `run` when needed.
- Comment intent, not mechanics.
- Keep human‑facing text concise and actionable.

## 18. Grammar Summary (EBNF)

This grammar summarizes the surface syntax. Terminals are in quotes, `…*` means zero or more, `…+` one or more, `?` optional.

```
program        ::= (task | directive | template)*

directive      ::= "import" string
                 | "include" string
                 | "pragma" identifier (identifier | string)?

task           ::= "start" "task" string NEWLINE block "end" "task"

template       ::= "template" "task" string "(" paramList? ")" ":" NEWLINE block

paramList      ::= identifier ("," identifier)*

block          ::= statement*

statement      ::= action
                 | assignment
                 | ifBlock
                 | loop
                 | eventBlock
                 | parallelBlock
                 | handlerBlock
                 | subtask
                 | templateCall
                 | "exit"

action         ::= verbPhrase NEWLINE

verbPhrase     ::= builtInVerb restOfVerb*
restOfVerb     ::= identifier | string | number | selector | preposition | withClause | toClause | onClause

builtInVerb    ::= "say" | "move" | "grasp" | "release" | "turn" "on"
                 | "display" | "notify" | "ask" | "expect" | "plan" | "track"
                 | "observe" | "assign" | "dispatch" | "synchronize" | "navigate"
                 | "define" | "use" "module" | "call"

selector       ::= "object" string selectorTail*
                 | "area" string
                 | "surface" string
                 | "zone" string
                 | "label" string
                 | "pose" string
                 | "reference" string

selectorTail   ::= "with" identifier string
                 | "near" selector
                 | "on" selector
                 | "in" selector

assignment     ::= "let" identifier "=" expression NEWLINE
                 | identifier "=" expression NEWLINE

expression     ::= literal
                 | identifier
                 | selector
                 | array
                 | expression binOp expression
                 | "(" expression ")"
                 | systemVar

binOp          ::= "==" | "!=" | ">" | "<" | ">=" | "<=" | "and" | "or" | "+" | "-" | "*" | "/"

ifBlock        ::= "if" condition ":" NEWLINE block
                   ("elseif" condition ":" NEWLINE block)*
                   ("else" ":" NEWLINE block)?

loop           ::= "repeat" number "times" ":" NEWLINE block
                 | "while" condition ":" NEWLINE block
                 | "for" identifier "in" expression ":" NEWLINE block

eventBlock     ::= "when" condition ":" NEWLINE block
                 | "at" "time" string ":" NEWLINE block

parallelBlock  ::= "parallel" ":" NEWLINE (subtask | action | block)*

handlerBlock   ::= "on" identifier ":" NEWLINE block
                 | "fallback" ":" NEWLINE block
                 | "retry" ("after" number "seconds")? NEWLINE
                 | "abort" NEWLINE
                 | "break" NEWLINE
                 | "continue" NEWLINE

subtask        ::= ("run" | "await" "run" | "detached" "run") string handlerSuffix? NEWLINE
templateCall   ::= "call" string "(" argList? ")" NEWLINE

handlerSuffix  ::= ("with" "exclusive" "access" "to" string)?

argList        ::= expression ("," expression)*

condition      ::= expression
systemVar      ::= "currentTime" | "currentRoom" | "taskName" | "userName"

literal        ::= string | number | boolean
array          ::= "[" (expression ("," expression)*)? "]"

string         ::= '"' (ESC | ~["])* '"'
number         ::= [0-9]+ ('.' [0-9]+)?
boolean        ::= "true" | "false"
```

## 19. Examples

### 19.1 Morning Routine

```
start task "MorningRoutine"
  use module "Camera1"
  use module "Arm1"
  use module "Gripper1"
  use module "Speaker"

  at time "07:00":
    say "Good morning"
    move Arm1 to "Kettle"
    grasp with Gripper1
    move Arm1 to "Stove"
    release with Gripper1

  when red mug appears:
    move Arm1 to red mug
    grasp with Gripper1
    move Arm1 to "Tray"
    release with Gripper1

  on failure:
    say "I'm having trouble with this task."
end task
```

### 19.2 Clean Plates

```
start task "CleanPlates"
  use module "Arm1"
  use module "Gripper1"

  let plates = detect all object "plate" on "Table"
  let attempt = 0

  for plate in plates:
    move Arm1 to plate
    grasp with Gripper1
    if grasp failed:
      attempt = attempt + 1
      if attempt > 2:
        say "Too many failures, aborting."
        break
      else:
        continue
    move Arm1 to "Sink"
    release with Gripper1
end task
```

### 19.3 Adaptive Lighting

```
start task "AdaptiveLighting"
  use module "Light1"
  use module "Camera1"

  if time is after "19:00" and currentRoom == "LivingRoom":
    if surface "CoffeeTable" is clear:
      turn on "Light1" at brightness 40
    else:
      say "Table is cluttered. Should I help you clean?"
  elseif time is before "07:00":
    turn on "Light1" at brightness 10
    say "Gentle wake-up light activated."
end task
```

### 19.4 Dual Operation

```
start task "DualOperation"
  use module "Arm1"
  use module "Arm2"
  use module "Camera"

  parallel:
    run "PickUpTrayWithArm1"
    detached run "WatchForVisitors"

  await run "MoveTrayToCounter"
  say "Tray delivered."
end task
```

## 20. Appendix A: .roopmodule Capability Files

Modules declare capabilities in a machine‑readable file that the runtime loads at startup or on discovery. Typical fields include `name`, `version`, `provides` (verbs), `requires` (resources), `binds` (protocol bindings), optional `parameters`, and optional I/O endpoints. A module’s `provides` section maps language verbs and parameters to the module’s control interface. The platform uses these declarations to build a semantic capability graph and route actions accordingly.

Minimal JSON schema excerpt for module files:

```
{
  "name": "Gripper_LX2F",
  "version": "1.0",
  "provides": ["grasp", "release"],
  "requires": ["power", "UART@ttyUSB0"],
  "binds": { "protocol": "ModbusRTU", "grasp": "0x01 0x10 [force]" },
  "parameters": { "force": 50 },
  "endpoints": { "publish": [], "subscribe": [] }
}
```

Implementations may also support YAML. Advanced module files can define composite actions, parameter ranges, and cross‑platform compatibility labels. The platform can discover devices, match and bind modules, and register capabilities dynamically.

## 21. Appendix B: Reserved Keywords and Built‑ins

Keywords that introduce structure or control:  
`start`, `task`, `end`, `template`, `if`, `elseif`, `else`, `repeat`, `while`, `for`, `parallel`, `on`, `when`, `at`, `with`, `await`, `detached`, `abort`, `retry`, `fallback`, `break`, `continue`, `exit`, `import`, `include`, `pragma`, `use`, `module`, `call`, `run`.

Entity selectors and nouns:  
`object`, `area`, `surface`, `label`, `zone`, `pose`, `reference`.

Common built‑in verbs:  
`say`, `move`, `grasp`, `release`, `turn on`, `display`, `notify`, `ask`, `expect`, `plan`, `track`, `observe`, `assign`, `dispatch`, `synchronize`, `navigate`, `define`, `call`, `use module`, `start task`, `end task`.

Many additional verbs may be provided by modules. Scripts can use any verb that a loaded module declares in its capability set.
