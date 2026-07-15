# V2 Reliable Orchestration

Nodrica v2 remains a domain-neutral, in-process workflow engine. Host applications
register Gmail, authentication, database, AI, or other behavior as nodes; the
core never imports those services.

## Compatibility

Every valid v1 single-node or linear flow remains valid. New behavior is opt-in
through edge conditions, failure edges, node retry policies, node timeouts, and
`run` options.

## Deterministic graph model

- A flow is a connected directed acyclic graph with exactly one start node.
- Multiple incoming edges are allowed, enabling mutually exclusive branches to merge.
- Multiple outgoing edges are allowed when each outcome has at most one unconditional fallback.
- Conditional edges are evaluated in declaration order; the unconditional edge is used only when no condition matches.
- Only one path executes. Parallel fan-out is not part of v2.
- A node executes at most once per run.

```ts
const flow = {
  input: { status: "expired" },
  nodes: [
    { id: "validate", type: "auth.validate" },
    { id: "use", type: "gmail.search" },
    { id: "refresh", type: "auth.refresh" }
  ],
  edges: [
    {
      from: "validate",
      to: "use",
      condition: { path: "status", operator: "equals", value: "valid" }
    },
    { from: "validate", to: "refresh" },
    { from: "refresh", to: "use" }
  ],
  output: "use"
};
```

Supported condition operators are `equals`, `notEquals`, `exists`, `truthy`, and
`falsy`. Dot-separated paths read nested output fields. Conditions are data, not
functions, so flow definitions remain serializable.

## Failure paths

An edge with `on: "failure"` is followed only after its source node exhausts its
attempts. The fallback receives:

```ts
type FailureInput = {
  failedNodeId: string;
  failedNodeType: string;
  input: unknown;
  error: SerializableError;
  attempts: number;
};
```

Without a matching failure edge, the run fails immediately. A recovered run is
successful only when its selected output node completes successfully.

## Retry safety

Retries are disabled by default. A node opts in explicitly:

```ts
{
  id: "read-mail",
  type: "gmail.search",
  retry: {
    maxAttempts: 3,
    delayMs: 250,
    backoffMultiplier: 2,
    retryOn: ["NETWORK_ERROR", "GMAIL_RATE_LIMIT"]
  }
}
```

Attempts are capped at 10 and each computed delay at 60 seconds. When `retryOn`
is omitted, the explicit policy retries every node error. Hosts should always use
an allowlist for external operations. Never configure automatic retries for an
operation such as sending mail unless the node itself provides safe idempotency.

## Timeout and cancellation

`timeoutMs` bounds a node attempt. `engine.run(flow, { signal })` cancels the
active attempt and prevents retries. Each handler receives `context.signal` plus
`attempt` and `maxAttempts`.

Promise racing lets Nodrica return after a timeout even if a handler ignores the
signal, but JavaScript cannot forcibly terminate that handler. Resource-owning
nodes must honor `context.signal` and release their work promptly.

## Events and persistence boundary

`onEvent` receives run start/end, node start/retry, and complete `NodeResult`
events. Callback exceptions are ignored so observability cannot change execution.
The trusted host can persist these results for audit/progress purposes.

Nodrica does not claim automatic resume in v2. Reusing saved outputs safely needs
a flow identity, node-version identity, and side-effect/idempotency policy. Those
controls must be designed before checkpoint resume is enabled.
