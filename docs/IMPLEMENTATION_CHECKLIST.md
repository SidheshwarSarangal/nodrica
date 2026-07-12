# Implementation Checklist

[Docs Home](README.md) | [Previous: Test Plan](TEST_PLAN.md)

Use this as the build order for the first working package.

## Phase 1: Package Setup

- [x] create `package.json`
- [x] add TypeScript
- [x] add Vitest
- [x] add strict `tsconfig.json`
- [x] expose package entry from `src/index.ts`

## Phase 2: Types

- [x] `FlowRequest`
- [x] `FlowNode`
- [x] `FlowEdge`
- [x] `FlowResult`
- [x] `NodeResult`
- [x] `NodeDefinition`
- [x] `NodeHandler`
- [x] `NodeContext`
- [x] `ExecutionState`
- [x] `ExecutionStatus`
- [x] `ConnectionResolver`

## Phase 3: Registry

- [x] create `NodeRegistry`
- [x] support `registerNode`
- [x] support `registerNodes`
- [x] support `getNode`
- [x] reject duplicate node types

## Phase 4: Validation

- [x] validate request shape
- [x] reject empty node list
- [x] reject duplicate node IDs
- [x] reject missing output node
- [x] reject edges with missing source node
- [x] reject edges with missing target node
- [x] reject unregistered node types
- [x] reject cycles
- [x] reject missing `input`, `nodes`, `edges`, or `output`
- [x] reject node missing `id`
- [x] reject node missing `type`
- [x] reject edge missing `from` or `to`
- [x] reject self-edges
- [x] reject multiple start nodes in v1
- [x] reject multiple outgoing edges in v1
- [x] reject multiple incoming edges in v1
- [x] reject disconnected nodes in v1

## Phase 5: Execution

- [x] find start node
- [x] run start node with initial input
- [x] pass node output to connected next node
- [x] run nodes in chain order
- [x] store every node result
- [x] return selected output node result
- [x] stop cleanly when a node fails
- [x] reject unreachable output node
- [x] allow `undefined` node output
- [x] allow `null` node output
- [x] pass `undefined` config when config is omitted
- [x] generate one `runId` per `run()` call

## Phase 6: Errors

- [x] create base `NodeFlowError`
- [x] create `ValidationError`
- [x] create `NodeExecutionError`
- [x] include node ID and node type in execution errors

## Phase 7: Tests

- [x] registry tests
- [x] validation tests
- [x] single-node flow test
- [x] linear flow test
- [x] async node test
- [x] failed node test
- [x] cycle rejection test
- [x] final output selection test
- [x] config passing test
- [x] context passing test
- [x] validation failure should run no nodes
- [x] invalid request shape test
- [x] missing node id/type tests
- [x] missing edge from/to tests
- [x] self-edge test
- [x] multiple start nodes test
- [x] multiple outgoing edges test
- [x] multiple incoming edges test
- [x] disconnected node test
- [x] undefined output test
- [x] null output test
- [x] runId consistency test

## Phase 8: Docs

- [ ] update README install section after publish
- [x] add API examples
- [x] add package usage example
- [x] add limitations section

## Verification

- [x] `npm install`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`
- [x] `npm audit --omit=dev`

See [V1 Validation Report](VALIDATION_REPORT.md).

## Publishing

- [x] `npm pack --dry-run`
- [x] `npm publish --access public`
- [x] `npm view nodrica`

See [Publishing Guide](PUBLISHING.md).

## Reference Docs

- [Project Reference](PROJECT_REFERENCE.md)
- [Algorithm Reference](ALGORITHM_REFERENCE.md)
- [API Design](API_DESIGN.md)
- [Logic Design](LOGIC_DESIGN.md)
- [Test Plan](TEST_PLAN.md)
- [V1 Validation Report](VALIDATION_REPORT.md)
- [Publishing Guide](PUBLISHING.md)
