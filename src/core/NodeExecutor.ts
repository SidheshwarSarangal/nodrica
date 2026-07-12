import { NodeExecutionError, toSerializableError } from "../errors";
import type { FlowNode, NodeContext, NodeDefinition, NodeResult } from "../types";

export class NodeExecutor {
  async runNode(
    node: FlowNode,
    definition: NodeDefinition,
    input: unknown,
    context: NodeContext
  ): Promise<NodeResult> {
    try {
      const output = await definition.run(input, node.config, context);

      return {
        nodeId: node.id,
        nodeType: node.type,
        status: "success",
        input,
        output
      };
    } catch (cause) {
      const error = new NodeExecutionError(`Node "${node.id}" failed during execution.`, {
        nodeId: node.id,
        nodeType: node.type,
        cause
      });

      return {
        nodeId: node.id,
        nodeType: node.type,
        status: "failed",
        input,
        error: toSerializableError(error)
      };
    }
  }
}
