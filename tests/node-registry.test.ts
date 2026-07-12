import { describe, expect, it } from "vitest";
import { NodeRegistry, ValidationError } from "../src";

describe("NodeRegistry", () => {
  it("registers and fetches a node by type", () => {
    const registry = new NodeRegistry();
    const node = {
      type: "echo",
      run(input: unknown) {
        return input;
      }
    };

    registry.registerNode(node);

    expect(registry.getNode("echo")).toBe(node);
    expect(registry.hasNode("echo")).toBe(true);
    expect(registry.listNodeTypes()).toEqual(["echo"]);
  });

  it("rejects duplicate node types", () => {
    const registry = new NodeRegistry();

    registry.registerNode({
      type: "echo",
      run(input: unknown) {
        return input;
      }
    });

    expect(() =>
      registry.registerNode({
        type: "echo",
        run(input: unknown) {
          return input;
        }
      })
    ).toThrow(ValidationError);
  });
});
