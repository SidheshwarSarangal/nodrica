import { NodeFlowError, toSerializableError } from "../errors";
import type { FlowResult, NodeResult, SerializableError } from "../types";
import { ExecutionState } from "./ExecutionState";

export class ResultBuilder {
  success(output: unknown, state: ExecutionState, runId: string): FlowResult {
    return {
      success: true,
      output,
      nodeResults: state.toRecord(),
      runId
    };
  }

  failure(error: SerializableError | NodeFlowError, state: ExecutionState, runId: string): FlowResult {
    return {
      success: false,
      nodeResults: state.toRecord(),
      error: error instanceof NodeFlowError ? toSerializableError(error) : error,
      runId
    };
  }

  failureFromNodeResult(result: NodeResult, state: ExecutionState, runId: string): FlowResult {
    const error =
      result.error ??
      toSerializableError(
        new NodeFlowError(`Node "${result.nodeId}" failed without error details.`, {
          code: "NODE_FAILED",
          nodeId: result.nodeId,
          nodeType: result.nodeType
        })
      );

    return this.failure(error, state, runId);
  }
}
