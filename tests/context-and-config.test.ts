import { describe, expect, it } from "vitest";
import { NodeFlowEngine } from "../src";

describe("context and config", () => {
  it("passes node config to handlers", async () => {
    const engine = new NodeFlowEngine();

    engine.registerNode({
      type: "read-config",
      run(_input, config) {
        return config;
      }
    });

    const result = await engine.run({
      input: {},
      nodes: [{ id: "n1", type: "read-config", config: { mode: "test" } }],
      edges: [],
      output: "n1"
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ mode: "test" });
  });

  it("passes undefined config when config is omitted", async () => {
    const engine = new NodeFlowEngine();

    engine.registerNode({
      type: "read-config",
      run(_input, config) {
        return { config };
      }
    });

    const result = await engine.run({
      input: {},
      nodes: [{ id: "n1", type: "read-config" }],
      edges: [],
      output: "n1"
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ config: undefined });
  });

  it("passes context and shares runId across nodes", async () => {
    const engine = new NodeFlowEngine();

    engine.registerNode({
      type: "record-context",
      run(input, _config, context) {
        const previous = Array.isArray(input) ? input : [];
        return [...previous, context];
      }
    });

    const result = await engine.run({
      input: [],
      nodes: [
        { id: "n1", type: "record-context" },
        { id: "n2", type: "record-context" }
      ],
      edges: [{ from: "n1", to: "n2" }],
      output: "n2"
    });

    const output = result.output as Array<{ runId: string; nodeId: string; nodeType: string }>;

    expect(result.success).toBe(true);
    expect(output).toHaveLength(2);
    expect(output[0]?.runId).toBe(output[1]?.runId);
    expect(output[0]?.nodeId).toBe("n1");
    expect(output[1]?.nodeId).toBe("n2");
    expect(output[0]?.nodeType).toBe("record-context");
  });

  it("creates a new runId for separate runs", async () => {
    const engine = new NodeFlowEngine();

    engine.registerNode({
      type: "run-id",
      run(_input, _config, context) {
        return context.runId;
      }
    });

    const first = await engine.run({
      input: {},
      nodes: [{ id: "n1", type: "run-id" }],
      edges: [],
      output: "n1"
    });

    const second = await engine.run({
      input: {},
      nodes: [{ id: "n1", type: "run-id" }],
      edges: [],
      output: "n1"
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(first.output).not.toBe(second.output);
  });
});
