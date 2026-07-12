import { ValidationError } from "../errors";
import type { NodeDefinition } from "../types";

export class NodeRegistry {
  private readonly nodes = new Map<string, NodeDefinition>();

  registerNode(node: NodeDefinition): this {
    if (!node || typeof node !== "object") {
      throw new ValidationError("Node definition must be an object.");
    }

    if (typeof node.type !== "string" || node.type.trim() === "") {
      throw new ValidationError("Node definition must include a non-empty type.");
    }

    if (typeof node.run !== "function") {
      throw new ValidationError(`Node "${node.type}" must include a run function.`);
    }

    if (this.nodes.has(node.type)) {
      throw new ValidationError(`Node type "${node.type}" is already registered.`, [
        {
          code: "DUPLICATE_NODE_TYPE",
          message: `Node type "${node.type}" is already registered.`,
          nodeType: node.type
        }
      ]);
    }

    this.nodes.set(node.type, node);
    return this;
  }

  registerNodes(nodes: NodeDefinition[]): this {
    for (const node of nodes) {
      this.registerNode(node);
    }

    return this;
  }

  getNode(type: string): NodeDefinition | undefined {
    return this.nodes.get(type);
  }

  hasNode(type: string): boolean {
    return this.nodes.has(type);
  }

  listNodeTypes(): string[] {
    return [...this.nodes.keys()];
  }
}
