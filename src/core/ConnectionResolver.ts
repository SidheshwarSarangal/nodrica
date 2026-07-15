import type { ChainPlan, EdgeCondition } from "../types";

export class ConnectionResolver {
  getNextNodeId(plan: ChainPlan, nodeId: string, outcome: "success" | "failure" = "success", value?: unknown): string | undefined {
    const candidates = (plan.outgoingByNodeId.get(nodeId) ?? [])
      .filter((edge) => (edge.on ?? "success") === outcome);
    const conditional = candidates.find((edge) => edge.condition !== undefined && matches(edge.condition, value));
    return conditional?.to ?? candidates.find((edge) => edge.condition === undefined)?.to;
  }

  hasNextNode(plan: ChainPlan, nodeId: string, outcome: "success" | "failure" = "success", value?: unknown): boolean {
    return this.getNextNodeId(plan, nodeId, outcome, value) !== undefined;
  }
}

function matches(condition: EdgeCondition, input: unknown): boolean {
  const value = readPath(input, condition.path);
  switch (condition.operator) {
    case "equals": return Object.is(value, condition.value);
    case "notEquals": return !Object.is(value, condition.value);
    case "exists": return value !== undefined;
    case "truthy": return Boolean(value);
    case "falsy": return !value;
  }
}

function readPath(input: unknown, path?: string): unknown {
  if (path === undefined || path === "") return input;
  let current = input;
  for (const part of path.split(".")) {
    if (typeof current !== "object" || current === null || !Object.hasOwn(current, part)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
