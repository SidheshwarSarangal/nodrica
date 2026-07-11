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
};
```

## Node Context

```ts
type NodeContext = {
  runId: string;
  nodeId: string;
  nodeType: string;
};
```

## V1 Input Passing Rule

```text
start node receives flow input
next node receives previous node output
selected output node becomes final output
```

## First Version Limits

The first version should support:

- single-node flow
- linear flow
- graph validation
- async node handlers
- final output selection
- clean validation errors
- clean execution errors

The first version does not need:

- visual editor
- persistence
- retries
- timeout
- distributed execution
- built-in nodes

## Documentation

- [Project Reference](PROJECT_REFERENCE.md)
- [Algorithm Reference](ALGORITHM_REFERENCE.md)
- [Logic Design](LOGIC_DESIGN.md)
- [Test Plan](TEST_PLAN.md)
- [Implementation Checklist](IMPLEMENTATION_CHECKLIST.md)
