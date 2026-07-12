import type { ChainPlan } from "../types";

export class ConnectionResolver {
  getNextNodeId(plan: ChainPlan, nodeId: string): string | undefined {
    return plan.nextByNodeId.get(nodeId);
  }

  hasNextNode(plan: ChainPlan, nodeId: string): boolean {
    return plan.nextByNodeId.has(nodeId);
  }
}
