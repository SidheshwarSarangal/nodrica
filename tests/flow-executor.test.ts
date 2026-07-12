import { describe, expect, it } from "vitest";
import { NodeFlowEngine } from "../src";
import { createTextEngine } from "./helpers";

describe("flow execution", () => {
  it("runs a single-node flow", async () => {
    const result = await createTextEngine().run({
      input: { text: "hello" },
      nodes: [{ id: "n1", type: "uppercase" }],
      edges: [],
      output: "n1"
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ text: "HELLO" });
    expect(result.nodeResults.n1?.status).toBe("success");
  });

  it("runs a linear flow and passes output forward", async () => {
    const result = await createTextEngine().run({
      input: { text: "hello" },
      nodes: [
        { id: "n1", type: "uppercase" },
        { id: "n2", type: "append", config: { value: " world" } },
        { id: "n3", type: "return" }
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" }
      ],
      output: "n3"
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ text: "HELLO world" });
    expect(result.nodeResults.n2?.input).toEqual({ text: "HELLO" });
    expect(result.nodeResults.n3?.input).toEqual({ text: "HELLO world" });
  });

  it("supports async handlers", async () => {
    const engine = new NodeFlowEngine();
    engine.registerNode({
      type: "async-double",
      async run(input) {
        const current = input as { value: number };
        await Promise.resolve();
        return { value: current.value * 2 };
      }
    });

    const result = await engine.run({
      input: { value: 5 },
      nodes: [{ id: "n1", type: "async-double" }],
      edges: [],
      output: "n1"
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ value: 10 });
  });

  it("returns the selected output node", async () => {
    const result = await createTextEngine().run({
      input: { text: "hello" },
      nodes: [
        { id: "n1", type: "uppercase" },
        { id: "n2", type: "append", config: { value: " world" } },
        { id: "n3", type: "append", config: { value: "!" } }
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" }
      ],
      output: "n2"
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ text: "HELLO world" });
    expect(result.nodeResults.n3?.output).toEqual({ text: "HELLO world!" });
  });

  it("allows undefined and null outputs", async () => {
    const undefinedResult = await createTextEngine().run({
      input: { text: "hello" },
      nodes: [
        { id: "n1", type: "undefined-output" },
        { id: "n2", type: "return" }
      ],
      edges: [{ from: "n1", to: "n2" }],
      output: "n2"
    });

    const nullResult = await createTextEngine().run({
      input: { text: "hello" },
      nodes: [
        { id: "n1", type: "null-output" },
        { id: "n2", type: "return" }
      ],
      edges: [{ from: "n1", to: "n2" }],
      output: "n2"
    });

    expect(undefinedResult.success).toBe(true);
    expect(undefinedResult.output).toBeUndefined();
    expect(undefinedResult.nodeResults.n2?.input).toBeUndefined();

    expect(nullResult.success).toBe(true);
    expect(nullResult.output).toBeNull();
    expect(nullResult.nodeResults.n2?.input).toBeNull();
  });
});
