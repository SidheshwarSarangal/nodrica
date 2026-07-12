import { describe, expect, it, vi } from "vitest";
import { NodeFlowEngine } from "../src";
import { createTextEngine } from "./helpers";

describe("failure behavior", () => {
  it("stops cleanly when a node throws", async () => {
    const result = await createTextEngine().run({
      input: { text: "hello" },
      nodes: [
        { id: "n1", type: "uppercase" },
        { id: "n2", type: "fail" },
        { id: "n3", type: "return" }
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" }
      ],
      output: "n3"
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NODE_EXECUTION_ERROR");
    expect(result.error?.nodeId).toBe("n2");
    expect(result.nodeResults.n1?.status).toBe("success");
    expect(result.nodeResults.n2?.status).toBe("failed");
    expect(result.nodeResults.n3).toBeUndefined();
  });

  it("stops cleanly when a node rejects", async () => {
    const result = await createTextEngine().run({
      input: { text: "hello" },
      nodes: [{ id: "n1", type: "reject" }],
      edges: [],
      output: "n1"
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NODE_EXECUTION_ERROR");
    expect(result.error?.nodeId).toBe("n1");
  });

  it("does not run nodes when validation fails", async () => {
    const engine = new NodeFlowEngine();
    const handler = vi.fn((input: unknown) => input);

    engine.registerNode({
      type: "tracked",
      run: handler
    });

    const result = await engine.run({
      input: {},
      nodes: [
        { id: "n1", type: "tracked" },
        { id: "n1", type: "tracked" }
      ],
      edges: [],
      output: "n1"
    });

    expect(result.success).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});
