import { describe, expect, it } from "vitest";
import { createTextEngine } from "./helpers";

describe("flow validation", () => {
  it("rejects an invalid request shape", async () => {
    const result = await createTextEngine().run({ nodes: [], edges: [], output: "n1" } as never);

    expect(result.success).toBe(false);
    expect(result.nodeResults).toEqual({});
    expect(result.error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an empty node list", async () => {
    const result = await createTextEngine().run({
      input: {},
      nodes: [],
      edges: [],
      output: "n1"
    });

    expect(result.success).toBe(false);
    expect(result.nodeResults).toEqual({});
  });

  it("rejects duplicate node IDs", async () => {
    const result = await createTextEngine().run({
      input: {},
      nodes: [
        { id: "n1", type: "return" },
        { id: "n1", type: "return" }
      ],
      edges: [],
      output: "n1"
    });

    expect(result.success).toBe(false);
  });

  it("rejects nodes missing id or type", async () => {
    const missingId = await createTextEngine().run({
      input: {},
      nodes: [{ type: "return" } as never],
      edges: [],
      output: "n1"
    });

    const missingType = await createTextEngine().run({
      input: {},
      nodes: [{ id: "n1" } as never],
      edges: [],
      output: "n1"
    });

    expect(missingId.success).toBe(false);
    expect(missingType.success).toBe(false);
  });

  it("rejects unregistered node types", async () => {
    const result = await createTextEngine().run({
      input: {},
      nodes: [{ id: "n1", type: "missing" }],
      edges: [],
      output: "n1"
    });

    expect(result.success).toBe(false);
    expect(result.nodeResults).toEqual({});
  });

  it("rejects missing output nodes", async () => {
    const result = await createTextEngine().run({
      input: {},
      nodes: [{ id: "n1", type: "return" }],
      edges: [],
      output: "missing"
    });

    expect(result.success).toBe(false);
  });

  it("rejects edges with missing source or target", async () => {
    const missingSource = await createTextEngine().run({
      input: {},
      nodes: [{ id: "n1", type: "return" }],
      edges: [{ from: "missing", to: "n1" }],
      output: "n1"
    });

    const missingTarget = await createTextEngine().run({
      input: {},
      nodes: [{ id: "n1", type: "return" }],
      edges: [{ from: "n1", to: "missing" }],
      output: "n1"
    });

    expect(missingSource.success).toBe(false);
    expect(missingTarget.success).toBe(false);
  });

  it("rejects edges missing from or to", async () => {
    const result = await createTextEngine().run({
      input: {},
      nodes: [{ id: "n1", type: "return" }],
      edges: [{ from: "n1" } as never],
      output: "n1"
    });

    expect(result.success).toBe(false);
  });

  it("rejects self edges and cycles", async () => {
    const selfEdge = await createTextEngine().run({
      input: {},
      nodes: [{ id: "n1", type: "return" }],
      edges: [{ from: "n1", to: "n1" }],
      output: "n1"
    });

    const cycle = await createTextEngine().run({
      input: {},
      nodes: [
        { id: "n1", type: "return" },
        { id: "n2", type: "return" }
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n1" }
      ],
      output: "n2"
    });

    expect(selfEdge.success).toBe(false);
    expect(cycle.success).toBe(false);
  });

  it("rejects multiple starts, branching, merging, and disconnected nodes in v1", async () => {
    const multipleStarts = await createTextEngine().run({
      input: {},
      nodes: [
        { id: "n1", type: "return" },
        { id: "n2", type: "return" }
      ],
      edges: [],
      output: "n1"
    });

    const branching = await createTextEngine().run({
      input: {},
      nodes: [
        { id: "n1", type: "return" },
        { id: "n2", type: "return" },
        { id: "n3", type: "return" }
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n1", to: "n3" }
      ],
      output: "n2"
    });

    const merging = await createTextEngine().run({
      input: {},
      nodes: [
        { id: "n1", type: "return" },
        { id: "n2", type: "return" },
        { id: "n3", type: "return" }
      ],
      edges: [
        { from: "n1", to: "n3" },
        { from: "n2", to: "n3" }
      ],
      output: "n3"
    });

    const disconnected = await createTextEngine().run({
      input: {},
      nodes: [
        { id: "n1", type: "return" },
        { id: "n2", type: "return" },
        { id: "n3", type: "return" }
      ],
      edges: [{ from: "n1", to: "n2" }],
      output: "n2"
    });

    expect(multipleStarts.success).toBe(false);
    expect(branching.success).toBe(false);
    expect(merging.success).toBe(false);
    expect(disconnected.success).toBe(false);
  });
});
