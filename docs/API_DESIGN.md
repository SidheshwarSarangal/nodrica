# API Design

[Docs Home](README.md) | [Previous: Logic Design](LOGIC_DESIGN.md) | [Next: Test Plan](TEST_PLAN.md)

Target package name: `nodrica`

## Import

```ts
import { NodeFlowEngine } from "nodrica";
```

## Create Engine

```ts
const engine = new NodeFlowEngine();
```

## Register Node

```ts
engine.registerNode({
  type: "append",
  async run(input, config) {
    const current = input as { text: string };
    const options = config as { value: string };

    return {
      text: current.text + options.value
    };
  }
});
```

## Register Many Nodes

```ts
engine.registerNodes([
  uppercaseNode,
  appendNode,
  returnNode
]);
```

## Run Flow

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
```

## Result

```ts
type FlowResult = {
  success: boolean;
  output?: unknown;
  nodeResults: Record<string, NodeResult>;
  error?: NodeFlowError;
  runId: string;
};
```

## Node Result

```ts
type NodeResult = {
  nodeId: string;
  nodeType: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  input?: unknown;
  output?: unknown;
  error?: NodeFlowError;
  attempts: number;
  durationMs: number;
};
```

## Node Context

```ts
type NodeContext = {
  runId: string;
  nodeId: string;
  nodeType: string;
  attempt: number;
  maxAttempts: number;
  signal: AbortSignal;
};
```

## Input Passing Rule

```text
start node receives flow input
next node receives previous node output
failure node receives structured FailureInput
selected output node becomes final output
```

## V2 Orchestration

Version 2 adds:

- declarative conditional edges
- explicit failure edges
- deterministic branch merging
- opt-in retry policies
- per-node timeouts
- cancellation and execution events through `run` options

Still deferred:

- visual editor
- automatic checkpoint resume
- parallel branches
- distributed execution
- built-in nodes

See [V2 Reliable Orchestration](V2_ORCHESTRATION.md) for exact routing,
retry, cancellation, and safety semantics.

## Documentation

- [Project Reference](PROJECT_REFERENCE.md)
- [Algorithm Reference](ALGORITHM_REFERENCE.md)
- [Logic Design](LOGIC_DESIGN.md)
- [Test Plan](TEST_PLAN.md)
- [Implementation Checklist](IMPLEMENTATION_CHECKLIST.md)
- [V2 Reliable Orchestration](V2_ORCHESTRATION.md)
