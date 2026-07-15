import { NodeFlowError, toSerializableError } from "../errors";
import type { ChainPlan, ExecutionEvent, FailureInput, FlowRequest, FlowResult, RunOptions, SerializableError } from "../types";
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
  ) { this.nodeExecutor = nodeExecutor; }

  async execute(request: FlowRequest, plan: ChainPlan, runId: string, options: RunOptions = {}): Promise<FlowResult> {
    const state = new ExecutionState();
    const nodesById = new Map(request.nodes.map((node) => [node.id, node]));
    const visited = new Set<string>();
    let currentNodeId: string | undefined = plan.startNodeId;
    let currentInput = request.input;
    emit(options.onEvent, { type: "runStarted", runId, timestamp: Date.now() });

    while (currentNodeId !== undefined) {
      if (visited.has(currentNodeId)) return this.fail(new NodeFlowError(`Node "${currentNodeId}" would execute more than once.`, { code: "REPEATED_NODE_EXECUTION", nodeId: currentNodeId }), state, runId, options);
      visited.add(currentNodeId);
      const node = nodesById.get(currentNodeId);
      if (!node) return this.fail(new NodeFlowError(`Node "${currentNodeId}" does not exist.`, { code: "NODE_NOT_FOUND", nodeId: currentNodeId }), state, runId, options);
      const definition = this.registry.getNode(node.type);
      if (!definition) return this.fail(new NodeFlowError(`Node type "${node.type}" is not registered.`, { code: "UNREGISTERED_NODE_TYPE", nodeId: node.id, nodeType: node.type }), state, runId, options);

      const result = await this.nodeExecutor.runNode(node, definition, currentInput, {
        runId, nodeId: node.id, nodeType: node.type
      }, options);
      state.setNodeResult(result);

      if (result.status === "failed") {
        const next = this.connectionResolver.getNextNodeId(plan, node.id, "failure", result.error);
        if (next === undefined) return this.fail(result.error ?? new NodeFlowError(`Node "${node.id}" failed.`, { code: "NODE_FAILED", nodeId: node.id, nodeType: node.type }), state, runId, options);
        currentInput = {
          failedNodeId: node.id,
          failedNodeType: node.type,
          input: result.input,
          error: result.error!,
          attempts: result.attempts
        } satisfies FailureInput;
        currentNodeId = next;
        continue;
      }

      currentInput = result.output;
      currentNodeId = this.connectionResolver.getNextNodeId(plan, node.id, "success", result.output);
    }

    const selected = state.getNodeResult(request.output);
    if (!selected || selected.status !== "success") return this.fail(new NodeFlowError(`Output node "${request.output}" did not complete successfully.`, { code: "OUTPUT_NODE_NOT_COMPLETED", nodeId: request.output }), state, runId, options);
    const final = this.resultBuilder.success(selected.output, state, runId);
    emit(options.onEvent, { type: "runSucceeded", runId, timestamp: Date.now() });
    return final;
  }

  private fail(error: SerializableError | NodeFlowError, state: ExecutionState, runId: string, options: RunOptions): FlowResult {
    const serialized = error instanceof NodeFlowError ? toSerializableError(error) : error;
    emit(options.onEvent, { type: "runFailed", runId, error: serialized, timestamp: Date.now() });
    return this.resultBuilder.failure(serialized, state, runId);
  }
}

function emit(callback: RunOptions["onEvent"], event: ExecutionEvent): void {
  try { callback?.(event); } catch { /* Observability must not change execution. */ }
}
