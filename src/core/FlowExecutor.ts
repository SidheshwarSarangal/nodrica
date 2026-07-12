import { NodeFlowError } from "../errors";
import type { ChainPlan, FlowRequest, FlowResult } from "../types";
import type { NodeRegistry } from "./NodeRegistry";
import { ConnectionResolver } from "./ConnectionResolver";
import { ExecutionState } from "./ExecutionState";
import { NodeExecutor } from "./NodeExecutor";
import { ResultBuilder } from "./ResultBuilder";

export class FlowExecutor {
  private readonly nodeExecutor: NodeExecutor;

  constructor(
    private readonly registry: NodeRegistry,
    nodeExecutor = new NodeExecutor(),
    private readonly resultBuilder = new ResultBuilder(),
    private readonly connectionResolver = new ConnectionResolver()
  ) {
    this.nodeExecutor = nodeExecutor;
  }

  async execute(request: FlowRequest, plan: ChainPlan, runId: string): Promise<FlowResult> {
    const state = new ExecutionState();
    const nodesById = new Map(request.nodes.map((node) => [node.id, node]));
    let currentInput = request.input;

    for (const nodeId of plan.orderedNodeIds) {
      const node = nodesById.get(nodeId);

      if (!node) {
        const error = new NodeFlowError(`Node "${nodeId}" does not exist.`, {
          code: "NODE_NOT_FOUND",
          nodeId
        });

        return this.resultBuilder.failure(error, state, runId);
      }

      const definition = this.registry.getNode(node.type);

      if (!definition) {
        const error = new NodeFlowError(`Node type "${node.type}" is not registered.`, {
          code: "UNREGISTERED_NODE_TYPE",
          nodeId: node.id,
          nodeType: node.type
        });

        return this.resultBuilder.failure(error, state, runId);
      }

      const result = await this.nodeExecutor.runNode(node, definition, currentInput, {
        runId,
        nodeId: node.id,
        nodeType: node.type
      });

      state.setNodeResult(result);

      if (result.status === "failed") {
        return this.resultBuilder.failureFromNodeResult(result, state, runId);
      }

      currentInput = result.output;
      this.connectionResolver.getNextNodeId(plan, node.id);
    }

    const selectedResult = state.getNodeResult(request.output);

    if (!selectedResult || selectedResult.status !== "success") {
      const error = new NodeFlowError(`Output node "${request.output}" did not complete successfully.`, {
        code: "OUTPUT_NODE_NOT_COMPLETED",
        nodeId: request.output
      });

      return this.resultBuilder.failure(error, state, runId);
    }

    return this.resultBuilder.success(selectedResult.output, state, runId);
  }
}
