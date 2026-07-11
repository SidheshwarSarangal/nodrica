# Algorithm Reference

[Docs Home](README.md) | [Previous: Project Reference](PROJECT_REFERENCE.md) | [Next: Logic Design](LOGIC_DESIGN.md)

This document explains the v1 algorithms of Nodrica.

Focus:

```text
input -> node -> node -> node -> output
```

## 1. Main Algorithm

```mermaid
flowchart TD
    A[FlowRequest] --> B[Validate Request]
    B --> C{Valid?}
    C -->|No| D[Return Failed FlowResult]
    C -->|Yes| E[Build Chain]
    E --> F[Create Run State]
    F --> G[Run Start Node]
    G --> H[Store Node Result]
    H --> I{Next Node?}
    I -->|Yes| J[Pass Output Forward]
    J --> G
    I -->|No| K[Pick Output Node Result]
    K --> L[Return Success FlowResult]
```

## 2. Flow Input Shape

```ts
type FlowRequest = {
  input: unknown;
  nodes: FlowNode[];
  edges: FlowEdge[];
  output: string;
};
```

```mermaid
flowchart LR
    A[input] --> B[nodes]
    B --> C[edges]
    C --> D[output node id]
```

## 3. Validation Algorithm

Validation runs before any node handler.

```mermaid
flowchart TD
    A[Start Validation] --> B[Check Required Fields]
    B --> C[Check Node IDs]
    C --> D[Check Node Types]
    D --> E[Check Edges]
    E --> F[Check One Chain Shape]
    F --> G[Check Cycles]
    G --> H[Check Output Reachable]
    H --> I[Validation Passed]
```

### Validation Rejects

```mermaid
flowchart TD
    A[Invalid Flow] --> B[Missing input/nodes/edges/output]
    A --> C[Duplicate node ID]
    A --> D[Missing node id/type]
    A --> E[Unregistered node type]
    A --> F[Bad edge source/target]
    A --> G[Self edge]
    A --> H[Cycle]
    A --> I[Multiple starts]
    A --> J[Branching]
    A --> K[Merging]
    A --> L[Disconnected node]
```

## 4. Chain Building

V1 accepts one connected chain.

```mermaid
flowchart LR
    A[n1] --> B[n2]
    B --> C[n3]
    C --> D[n4]
```

V1 rejects branching:

```mermaid
flowchart TD
    A[n1] --> B[n2]
    A --> C[n3]
```

V1 rejects merging:

```mermaid
flowchart TD
    A[n1] --> C[n3]
    B[n2] --> C
```

V1 rejects disconnected nodes:

```mermaid
flowchart LR
    A[n1] --> B[n2]
    C[n3]
```

## 5. Execution Algorithm

Each node receives:

```text
previous output + node config + context
```

```mermaid
sequenceDiagram
    participant Engine
    participant N1 as Node 1
    participant N2 as Node 2
    participant N3 as Node 3

    Engine->>N1: run(flow.input, config, context)
    N1-->>Engine: output1
    Engine->>N2: run(output1, config, context)
    N2-->>Engine: output2
    Engine->>N3: run(output2, config, context)
    N3-->>Engine: output3
    Engine-->>Engine: return selected output
```

## 6. Input Passing Rules

### Single Node

```mermaid
flowchart LR
    A[Flow input] --> B[Node 1]
    B --> C[Final output]
```

```text
Node 1 input = FlowRequest.input
Final output = Node 1 output
```

### Linear Chain

```mermaid
flowchart LR
    A[Flow input] --> B[Node 1]
    B --> C[Node 2]
    C --> D[Node 3]
    D --> E[Final output]
```

```text
Node 1 input = FlowRequest.input
Node 2 input = Node 1 output
Node 3 input = Node 2 output
Final output = selected output node output
```

### Output Node Before End

```mermaid
flowchart LR
    A[Input] --> B[n1]
    B --> C[n2 selected output]
    C --> D[n3]
```

```text
Returned output = n2 output
```

## 7. Major Input Use Cases

### Data Transform

```mermaid
flowchart LR
    A["{ text: hello }"] --> B[uppercase]
    B --> C[append]
    C --> D["{ text: HELLO world }"]
```

Handled as:

```text
object -> object -> object
```

### API / Tool Chain

```mermaid
flowchart LR
    A["{ userId: 42 }"] --> B[fetchUser]
    B --> C[fetchOrders]
    C --> D[formatSummary]
    D --> E[summary]
```

Handled as:

```text
request input -> API result -> API result -> formatted output
```

### Crawler / Parser

```mermaid
flowchart LR
    A["{ url }"] --> B[crawl]
    B --> C[extractText]
    C --> D[parseData]
    D --> E[structured data]
```

Handled as:

```text
URL input -> HTML/text -> cleaned text -> structured output
```

### Database Flow

```mermaid
flowchart LR
    A["{ id }"] --> B[dbRead]
    B --> C[transform]
    C --> D[dbWrite]
    D --> E[write result]
```

Handled as:

```text
query input -> database row -> transformed row -> write result
```

### AI / Agent Step

```mermaid
flowchart LR
    A["{ prompt }"] --> B[llmCall]
    B --> C[parseJson]
    C --> D[validate]
    D --> E[final answer]
```

Handled as:

```text
prompt -> model response -> parsed object -> validated output
```

### File Processing

```mermaid
flowchart LR
    A["{ filePath }"] --> B[readFile]
    B --> C[parse]
    C --> D[saveResult]
    D --> E[result]
```

Handled as:

```text
file reference -> file content -> parsed data -> saved result
```

## 8. Special Input Values

```mermaid
flowchart TD
    A[Node Output] --> B{Value}
    B --> C[object allowed]
    B --> D[array allowed]
    B --> E[string allowed]
    B --> F[number allowed]
    B --> G[boolean allowed]
    B --> H[null allowed]
    B --> I[undefined allowed]
```

Rules:

- `null` is allowed and passed to the next node.
- `undefined` is allowed and passed to the next node.
- missing `config` becomes `undefined`.
- missing top-level flow `input` is a validation error.

## 9. Error Algorithm

```mermaid
flowchart TD
    A[Run Node] --> B{Success?}
    B -->|Yes| C[Store Success Result]
    C --> D[Continue]
    B -->|No| E[Store Failed Result]
    E --> F[Stop Flow]
    F --> G[Return Failed FlowResult]
```

Failure result:

```ts
{
  success: false,
  output: undefined,
  nodeResults,
  error
}
```

## 10. State Tracking

```mermaid
flowchart LR
    A[pending] --> B[running]
    B --> C[success]
    B --> D[failed]
```

Each node result stores:

```text
nodeId
nodeType
status
input
output
error
```

## 11. Algorithm Done For V1

```mermaid
flowchart TD
    A[V1 Ready] --> B[Validation]
    A --> C[Chain Building]
    A --> D[Input Passing]
    A --> E[Execution]
    A --> F[State Tracking]
    A --> G[Error Handling]
    A --> H[Major Test Cases]
```

## 12. Future Algorithms

Not part of v1:

```mermaid
flowchart TD
    A[Future] --> B[Branching]
    A --> C[Merging]
    A --> D[Retries]
    A --> E[Timeouts]
    A --> F[Events]
    A --> G[Persistence]
    A --> H[Visual Editor]
```

## Related Docs

- [Project Reference](PROJECT_REFERENCE.md)
- [Logic Design](LOGIC_DESIGN.md)
- [API Design](API_DESIGN.md)
- [Test Plan](TEST_PLAN.md)
