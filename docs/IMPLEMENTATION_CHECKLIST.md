# Implementation Checklist

[Docs Home](README.md) | [Previous: Test Plan](TEST_PLAN.md)

Use this as the build order for the first working package.

## Phase 1: Package Setup

- create `package.json`
- add TypeScript
- add Vitest
- add strict `tsconfig.json`
- expose package entry from `src/index.ts`

## Phase 2: Types

- `FlowRequest`
- `FlowNode`
- `FlowEdge`
- `FlowResult`
- `NodeResult`
- `NodeDefinition`
- `NodeHandler`
- `NodeContext`
- `ExecutionState`
- `ExecutionStatus`

## Phase 3: Registry

- create `NodeRegistry`
- support `registerNode`
- support `registerNodes`
- support `getNode`
- reject duplicate node types

## Phase 4: Validation

- validate request shape
- reject empty node list
- reject duplicate node IDs
- reject missing output node
- reject edges with missing source node
- reject edges with missing target node
- reject unregistered node types
- reject cycles
- reject missing `input`, `nodes`, `edges`, or `output`
- reject node missing `id`
- reject node missing `type`
- reject edge missing `from` or `to`
- reject self-edges
- reject multiple start nodes in v1
- reject multiple outgoing edges in v1
- reject multiple incoming edges in v1
- reject disconnected nodes in v1

## Phase 5: Execution

- find start nodes
- run start nodes with initial input
- pass node output to connected next node
- run nodes in topological order
- store every node result
- return selected output node result
- stop cleanly when a node fails
- reject unreachable output node
- allow `undefined` node output
- allow `null` node output
- pass `undefined` config when config is omitted
- generate one `runId` per `run()` call

## Phase 6: Errors

- create base `NodeFlowError`
- create `ValidationError`
- create `NodeExecutionError`
- include node ID and node type in execution errors

## Phase 7: Tests

- registry tests
- validation tests
- single-node flow test
- linear flow test
- async node test
- failed node test
- cycle rejection test
- final output selection test
- config passing test
- context passing test
- validation failure should run no nodes
- invalid request shape test
- missing node id/type tests
- missing edge from/to tests
- self-edge test
- multiple start nodes test
- multiple outgoing edges test
- multiple incoming edges test
- disconnected node test
- undefined output test
- null output test
- runId consistency test

## Phase 8: Docs

- update README install section
- add API examples
- add package usage example
- add limitations section

## Reference Docs

- [Project Reference](PROJECT_REFERENCE.md)
- [Algorithm Reference](ALGORITHM_REFERENCE.md)
- [API Design](API_DESIGN.md)
- [Logic Design](LOGIC_DESIGN.md)
- [Test Plan](TEST_PLAN.md)
