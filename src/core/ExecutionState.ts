import type { NodeResult } from "../types";

export class ExecutionState {
  private readonly results = new Map<string, NodeResult>();

  setNodeResult(result: NodeResult): void {
    this.results.set(result.nodeId, result);
  }

  getNodeResult(nodeId: string): NodeResult | undefined {
    return this.results.get(nodeId);
  }

  toRecord(): Record<string, NodeResult> {
    return Object.fromEntries(this.results);
  }
}
