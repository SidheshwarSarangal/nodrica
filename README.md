# Nodrica

A lightweight TypeScript package for running custom node-based flows inside any app.

```text
Define nodes. Connect them. Run the flow. Return the result.
```

```mermaid
flowchart LR
    A[Input] --> B[Node 1]
    B --> C[Node 2]
    C --> D[Node 3]
    D --> E[Final Result]
```

## What It Is

Nodrica is a generic node orchestration package.

It does not know what your nodes do. It only manages:

- node registration
- flow validation
- execution order
- input/output passing
- state tracking
- final result building

Read more: [Project Reference](docs/PROJECT_REFERENCE.md)

## Core Idea

```mermaid
flowchart TD
    A[Host App] --> B[Nodrica]
    B --> C[Node Registry]
    B --> D[Flow Validator]
    B --> E[Flow Executor]
    E --> F[Custom Node]
    F --> G[Node Output]
    G --> E
    E --> H[Flow Result]
```

The host app provides the real node behavior:

```text
DB node
API node
crawler node
AI node
file node
custom function node
```

Read more: [Algorithm Reference](docs/ALGORITHM_REFERENCE.md)

## V1 Scope

Nodrica v1 focuses on one connected chain:

```mermaid
flowchart LR
    A[Flow Input] --> B[n1]
    B --> C[n2]
    C --> D[n3]
    D --> E[Selected Output]
```

Included:

- single-node flow
- linear flow
- graph validation
- async node handlers
- selected output node
- clean validation/execution errors

Future:

- branching
- merging
- retries
- timeout
- persistence
- visual editor

Read more: [Logic Design](docs/LOGIC_DESIGN.md)

## Current Status

Implemented:

- TypeScript package skeleton
- core public `NodeFlowEngine`
- node registry
- flow validator
- linear chain executor
- node executor
- serializable errors
- v1 test suite
- typecheck/test/build validation

Pending:

- push latest code/docs to GitHub

Validation: [V1 Validation Report](docs/VALIDATION_REPORT.md)
Publishing: [Publishing Guide](docs/PUBLISHING.md)

## Example Flow

```ts
const result = await engine.run({
  input: { text: "hello" },
  nodes: [
    { id: "n1", type: "uppercase" },
    { id: "n2", type: "append", config: { value: " world" } }
  ],
  edges: [
    { from: "n1", to: "n2" }
  ],
  output: "n2"
});

console.log(result.output);
```

```mermaid
flowchart LR
    A["{ text: hello }"] --> B[uppercase]
    B --> C["{ text: HELLO }"]
    C --> D[append]
    D --> E["{ text: HELLO world }"]
```

Read more: [API Design](docs/API_DESIGN.md)

## Common Use Cases

```mermaid
flowchart TD
    A[Nodrica Flow] --> B[Data Transform]
    A --> C[API / Tool Chain]
    A --> D[Crawler / Parser]
    A --> E[Database Flow]
    A --> F[AI Step]
    A --> G[File Processing]
```

Examples:

```text
form input -> validate -> save to DB -> send email -> return result
file upload -> parse -> transform -> store -> notify
URL -> crawl -> extract text -> parse -> return data
prompt -> LLM call -> parse JSON -> validate -> final answer
```

Read more: [Algorithm Reference: Major Input Use Cases](docs/ALGORITHM_REFERENCE.md#7-major-input-use-cases)

## Planned Core API

```ts
import { NodeFlowEngine } from "nodrica";

const engine = new NodeFlowEngine();

engine.registerNode({
  type: "uppercase",
  async run(input) {
    const current = input as { text: string };
    return { text: current.text.toUpperCase() };
  }
});

const result = await engine.run(flowRequest);
```

Read more: [API Design](docs/API_DESIGN.md)

## Testing

The first implementation should prove:

- validation failures run no nodes
- single-node flows work
- linear flows pass output forward
- async nodes are awaited
- failed nodes stop the flow
- selected output node is returned
- strict v1 edge cases are rejected

Read more: [Test Plan](docs/TEST_PLAN.md)

## Implementation

Build order:

```mermaid
flowchart LR
    A[Setup] --> B[Types]
    B --> C[Registry]
    C --> D[Validation]
    D --> E[Execution]
    E --> F[Errors]
    F --> G[Tests]
```

Read more: [Implementation Checklist](docs/IMPLEMENTATION_CHECKLIST.md)

## Documentation

Start here: [Documentation Map](docs/README.md)

- [Project Reference](docs/PROJECT_REFERENCE.md)
- [Algorithm Reference](docs/ALGORITHM_REFERENCE.md)
- [Logic Design](docs/LOGIC_DESIGN.md)
- [API Design](docs/API_DESIGN.md)
- [Test Plan](docs/TEST_PLAN.md)
- [Implementation Checklist](docs/IMPLEMENTATION_CHECKLIST.md)
- [V1 Validation Report](docs/VALIDATION_REPORT.md)
- [Publishing Guide](docs/PUBLISHING.md)
