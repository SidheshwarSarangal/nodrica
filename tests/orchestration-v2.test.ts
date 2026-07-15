import { describe, expect, it, vi } from "vitest";
import { NodeFlowEngine, NodeFlowError, type ExecutionEvent, type FailureInput } from "../src";

describe("v2 orchestration", () => {
  it("selects a conditional branch and supports a deterministic merge", async () => {
    const engine = new NodeFlowEngine().registerNodes([
      { type: "decide", run: (input) => input },
      { type: "approved", run: () => ({ route: "approved" }) },
      { type: "denied", run: () => ({ route: "denied" }) },
      { type: "finish", run: (input) => input }
    ]);

    const result = await engine.run({
      input: { approved: true },
      nodes: [
        { id: "decide", type: "decide" },
        { id: "yes", type: "approved" },
        { id: "no", type: "denied" },
        { id: "finish", type: "finish" }
      ],
      edges: [
        { from: "decide", to: "yes", condition: { path: "approved", operator: "equals", value: true } },
        { from: "decide", to: "no" },
        { from: "yes", to: "finish" },
        { from: "no", to: "finish" }
      ],
      output: "finish"
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ route: "approved" });
    expect(result.nodeResults.no).toBeUndefined();
  });

  it("routes a failed node into a fallback with structured failure input", async () => {
    const engine = new NodeFlowEngine().registerNodes([
      { type: "fail", run: () => { throw new NodeFlowError("expired", { code: "TOKEN_EXPIRED" }); } },
      { type: "recover", run: (input) => ({ recovered: (input as FailureInput).error.code }) }
    ]);

    const result = await engine.run({
      input: { accountId: "a1" },
      nodes: [{ id: "validate", type: "fail" }, { id: "refresh", type: "recover" }],
      edges: [{ from: "validate", to: "refresh", on: "failure" }],
      output: "refresh"
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ recovered: "TOKEN_EXPIRED" });
    expect(result.nodeResults.validate?.status).toBe("failed");
    expect(result.nodeResults.refresh?.status).toBe("success");
  });

  it("retries only when a node explicitly opts in", async () => {
    let attempts = 0;
    const engine = new NodeFlowEngine().registerNode({
      type: "flaky",
      run() {
        attempts += 1;
        if (attempts < 3) throw new NodeFlowError("temporary", { code: "TRANSIENT" });
        return "ok";
      }
    });

    const result = await engine.run({
      input: {},
      nodes: [{ id: "work", type: "flaky", retry: { maxAttempts: 3, retryOn: ["TRANSIENT"] } }],
      edges: [],
      output: "work"
    });

    expect(result.success).toBe(true);
    expect(result.nodeResults.work?.attempts).toBe(3);
  });

  it("fails a node at its timeout even when the handler does not cooperate", async () => {
    const engine = new NodeFlowEngine().registerNode({
      type: "slow",
      run: () => new Promise((resolve) => setTimeout(() => resolve("late"), 100))
    });
    const result = await engine.run({
      input: {}, nodes: [{ id: "slow", type: "slow", timeoutMs: 10 }], edges: [], output: "slow"
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NODE_TIMEOUT");
  });

  it("propagates cancellation through the node context signal", async () => {
    const controller = new AbortController();
    const observed = vi.fn();
    const engine = new NodeFlowEngine().registerNode({
      type: "waiting",
      run(_input, _config, context) {
        context.signal.addEventListener("abort", observed);
        return new Promise(() => undefined);
      }
    });
    const running = engine.run({ input: {}, nodes: [{ id: "wait", type: "waiting" }], edges: [], output: "wait" }, { signal: controller.signal });
    controller.abort();
    const result = await running;
    expect(result.error?.code).toBe("NODE_ABORTED");
    expect(observed).toHaveBeenCalledOnce();
  });

  it("emits progress events and ignores observer failures", async () => {
    const events: ExecutionEvent[] = [];
    const engine = new NodeFlowEngine().registerNode({ type: "echo", run: (input) => input });
    const result = await engine.run(
      { input: "ok", nodes: [{ id: "echo", type: "echo" }], edges: [], output: "echo" },
      { onEvent(event) { events.push(event); if (event.type === "nodeStarted") throw new Error("observer failure"); } }
    );
    expect(result.success).toBe(true);
    expect(events.map((event) => event.type)).toEqual(["runStarted", "nodeStarted", "nodeSucceeded", "runSucceeded"]);
  });

  it("rejects unsafe retry and ambiguous graph configurations", async () => {
    const engine = new NodeFlowEngine().registerNode({ type: "echo", run: (input) => input });
    const invalidRetry = await engine.run({
      input: {}, nodes: [{ id: "a", type: "echo", retry: { maxAttempts: 0 } }], edges: [], output: "a"
    });
    const ambiguous = await engine.run({
      input: {},
      nodes: [{ id: "a", type: "echo" }, { id: "b", type: "echo" }, { id: "c", type: "echo" }],
      edges: [{ from: "a", to: "b" }, { from: "a", to: "c" }],
      output: "b"
    });
    expect(invalidRetry.error?.code).toBe("VALIDATION_ERROR");
    expect(ambiguous.error?.code).toBe("VALIDATION_ERROR");
  });
});
