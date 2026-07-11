# Test Plan

[Docs Home](README.md) | [Previous: API Design](API_DESIGN.md) | [Next: Implementation Checklist](IMPLEMENTATION_CHECKLIST.md)

This is the minimum test plan for the first working implementation.

## 1. Registry Tests

### registers a node

Expected:

- node can be registered by `type`
- node can be fetched by `type`

### rejects duplicate node type

Expected:

- registering the same `type` twice throws `ValidationError`

### rejects unknown node type

Expected:

- validation fails when a flow uses an unregistered node type
- no node runs

## 2. Validation Tests

### rejects empty node list

Input:

```ts
{ input: {}, nodes: [], edges: [], output: "n1" }
```

Expected:

- validation fails
- no node runs

### rejects duplicate node IDs

Expected:

- validation fails before execution

### rejects missing output node

Expected:

- `output` must match one node ID

### rejects edge with missing source

Expected:

- validation fails if `edge.from` does not exist

### rejects edge with missing target

Expected:

- validation fails if `edge.to` does not exist

### rejects unregistered node type

Expected:

- validation fails if any node `type` is not registered

### rejects cycle

Flow:

```text
n1 -> n2 -> n1
```

Expected:

- validation fails
- no node runs

### rejects invalid request shape

Expected:

- missing `input`, `nodes`, `edges`, or `output` fails validation

### rejects node missing id

Expected:

- validation fails before execution

### rejects node missing type

Expected:

- validation fails before execution

### rejects edge missing from or to

Expected:

- validation fails before execution

### rejects self-edge

Flow:

```text
n1 -> n1
```

Expected:

- validation fails before execution

### rejects multiple start nodes in v1

Flow:

```text
n1
n2
```

Expected:

- validation fails because v1 supports one chain only

### rejects multiple outgoing edges in v1

Flow:

```text
n1 -> n2
n1 -> n3
```

Expected:

- validation fails because branching is future work

### rejects multiple incoming edges in v1

Flow:

```text
n1 -> n3
n2 -> n3
```

Expected:

- validation fails because merging is future work

### rejects disconnected node in v1

Flow:

```text
n1 -> n2
n3
```

Expected:

- validation fails because all nodes should belong to one chain in v1

## 3. Execution Tests

### runs a single-node flow

Flow:

```text
input -> n1 -> output
```

Expected:

- `n1` receives initial input
- final output equals `n1` output

### runs a linear flow

Flow:

```text
n1 -> n2 -> n3
```

Expected:

- `n1` receives initial input
- `n2` receives `n1` output
- `n3` receives `n2` output
- final output equals `n3` output

### supports async node handlers

Expected:

- async node result is awaited
- next node receives resolved output

### stores node results

Expected:

- every completed node has stored input, output, status, and timing if implemented

### returns selected output node

Flow:

```text
n1 -> n2
output = n2
```

Expected:

- flow can return `n2` output
- result output must be from `n2`

### allows output node before end of chain

Flow:

```text
n1 -> n2 -> n3
output = n2
```

Expected:

- result output is from `n2`
- execution may still continue through the full valid chain in v1

### allows undefined node output

Expected:

- node may return `undefined`
- next node receives `undefined`

### allows null node output

Expected:

- node may return `null`
- next node receives `null`

## 4. Failure Tests

### node throws error

Expected:

- flow result has `success: false`
- error includes node ID and type
- downstream nodes do not run

### node returns rejected promise

Expected:

- same behavior as thrown error

### validation failure runs no nodes

Expected:

- registered handlers are not called
- result has `success: false`

## 5. Edge Cases

### single node with empty edges

Expected:

- valid
- node receives initial input

### node config is passed to handler

Expected:

- handler receives the `config` from the flow node

### missing node config passes undefined

Expected:

- handler receives `undefined` config when config is omitted

### context is passed to handler

Expected:

- handler receives `runId`, `nodeId`, and `nodeType`

### runId is shared across nodes in one run

Expected:

- every node in one flow receives the same `runId`

### runId changes between runs

Expected:

- separate `run()` calls get separate `runId` values

### disconnected output node

Decision for v1:

- reject if output node is unreachable from any start node

## Done Criteria

The first version is ready when:

- all registry tests pass
- all validation tests pass
- strict v1 edge-case tests pass
- single-node flow works
- linear flow works
- async nodes work
- failure behavior is predictable
- final output selection works

## Related Docs

- [Logic Design](LOGIC_DESIGN.md)
- [API Design](API_DESIGN.md)
- [Implementation Checklist](IMPLEMENTATION_CHECKLIST.md)
