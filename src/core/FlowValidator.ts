import type { ChainPlan, FlowEdge, FlowNode, FlowRequest, ValidationIssue, ValidationResult } from "../types";
import type { NodeRegistry } from "./NodeRegistry";

export class FlowValidator {
  constructor(private readonly registry: NodeRegistry) {}

  validate(request: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!isRecord(request)) {
      return {
        valid: false,
        issues: [
          {
            code: "INVALID_REQUEST",
            message: "Flow request must be an object."
          }
        ]
      };
    }

    if (!Object.hasOwn(request, "input")) {
      issues.push({
        code: "MISSING_INPUT",
        message: "Flow request must include input."
      });
    }

    if (!Array.isArray(request.nodes)) {
      issues.push({
        code: "INVALID_NODES",
        message: "Flow request must include a nodes array."
      });
    }

    if (!Array.isArray(request.edges)) {
      issues.push({
        code: "INVALID_EDGES",
        message: "Flow request must include an edges array."
      });
    }

    if (typeof request.output !== "string" || request.output.trim() === "") {
      issues.push({
        code: "INVALID_OUTPUT",
        message: "Flow request must include a non-empty output node ID."
      });
    }

    if (issues.length > 0) {
      return { valid: false, issues };
    }

    const typedRequest = request as FlowRequest;
    issues.push(...this.validateNodes(typedRequest.nodes));
    issues.push(...this.validateEdges(typedRequest.edges));

    if (issues.length === 0) {
      issues.push(...this.validateGraph(typedRequest));
    }

    if (issues.length > 0) {
      return { valid: false, issues };
    }

    return { valid: true };
  }

  buildChainPlan(request: FlowRequest): ChainPlan {
    const nextByNodeId = new Map<string, string>();
    const incomingCount = new Map<string, number>();

    for (const node of request.nodes) {
      incomingCount.set(node.id, 0);
    }

    for (const edge of request.edges) {
      nextByNodeId.set(edge.from, edge.to);
      incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1);
    }

    const startNode = request.nodes.find((node) => incomingCount.get(node.id) === 0);

    if (!startNode) {
      return {
        startNodeId: "",
        orderedNodeIds: [],
        nextByNodeId
      };
    }

    const orderedNodeIds: string[] = [];
    const seen = new Set<string>();
    let current: string | undefined = startNode.id;

    while (current !== undefined && !seen.has(current)) {
      orderedNodeIds.push(current);
      seen.add(current);
      current = nextByNodeId.get(current);
    }

    return {
      startNodeId: startNode.id,
      orderedNodeIds,
      nextByNodeId
    };
  }

  private validateNodes(nodes: FlowNode[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seenNodeIds = new Set<string>();

    if (nodes.length === 0) {
      issues.push({
        code: "EMPTY_NODES",
        message: "Flow must include at least one node."
      });
    }

    for (const [index, node] of nodes.entries()) {
      if (!isRecord(node)) {
        issues.push({
          code: "INVALID_NODE",
          message: `Node at index ${index} must be an object.`
        });
        continue;
      }

      if (typeof node.id !== "string" || node.id.trim() === "") {
        issues.push({
          code: "MISSING_NODE_ID",
          message: `Node at index ${index} must include a non-empty id.`
        });
      } else if (seenNodeIds.has(node.id)) {
        issues.push({
          code: "DUPLICATE_NODE_ID",
          message: `Node id "${node.id}" is duplicated.`,
          nodeId: node.id
        });
      } else {
        seenNodeIds.add(node.id);
      }

      if (typeof node.type !== "string" || node.type.trim() === "") {
        const issue: ValidationIssue = {
          code: "MISSING_NODE_TYPE",
          message: `Node "${String(node.id ?? index)}" must include a non-empty type.`
        };

        if (typeof node.id === "string") {
          issue.nodeId = node.id;
        }

        issues.push(issue);
      } else if (!this.registry.hasNode(node.type)) {
        const issue: ValidationIssue = {
          code: "UNREGISTERED_NODE_TYPE",
          message: `Node type "${node.type}" is not registered.`,
          nodeType: node.type
        };

        if (typeof node.id === "string") {
          issue.nodeId = node.id;
        }

        issues.push(issue);
      }
    }

    return issues;
  }

  private validateEdges(edges: FlowEdge[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const [index, edge] of edges.entries()) {
      if (!isRecord(edge)) {
        issues.push({
          code: "INVALID_EDGE",
          message: `Edge at index ${index} must be an object.`
        });
        continue;
      }

      if (typeof edge.from !== "string" || edge.from.trim() === "") {
        issues.push({
          code: "MISSING_EDGE_FROM",
          message: `Edge at index ${index} must include a non-empty from node ID.`
        });
      }

      if (typeof edge.to !== "string" || edge.to.trim() === "") {
        issues.push({
          code: "MISSING_EDGE_TO",
          message: `Edge at index ${index} must include a non-empty to node ID.`
        });
      }
    }

    return issues;
  }

  private validateGraph(request: FlowRequest): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const nodeIds = new Set(request.nodes.map((node) => node.id));
    const outgoingCount = new Map<string, number>();
    const incomingCount = new Map<string, number>();

    for (const node of request.nodes) {
      outgoingCount.set(node.id, 0);
      incomingCount.set(node.id, 0);
    }

    if (!nodeIds.has(request.output)) {
      issues.push({
        code: "MISSING_OUTPUT_NODE",
        message: `Output node "${request.output}" does not exist.`,
        nodeId: request.output
      });
    }

    for (const edge of request.edges) {
      if (!nodeIds.has(edge.from)) {
        issues.push({
          code: "MISSING_EDGE_SOURCE",
          message: `Edge source "${edge.from}" does not exist.`,
          nodeId: edge.from
        });
      }

      if (!nodeIds.has(edge.to)) {
        issues.push({
          code: "MISSING_EDGE_TARGET",
          message: `Edge target "${edge.to}" does not exist.`,
          nodeId: edge.to
        });
      }

      if (edge.from === edge.to) {
        issues.push({
          code: "SELF_EDGE",
          message: `Node "${edge.from}" cannot connect to itself.`,
          nodeId: edge.from
        });
      }

      outgoingCount.set(edge.from, (outgoingCount.get(edge.from) ?? 0) + 1);
      incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1);
    }

    if (issues.length > 0) {
      return issues;
    }

    for (const node of request.nodes) {
      const outgoing = outgoingCount.get(node.id) ?? 0;
      const incoming = incomingCount.get(node.id) ?? 0;

      if (outgoing > 1) {
        issues.push({
          code: "MULTIPLE_OUTGOING_EDGES",
          message: `Node "${node.id}" has multiple outgoing edges. Branching is not supported in v1.`,
          nodeId: node.id,
          nodeType: node.type
        });
      }

      if (incoming > 1) {
        issues.push({
          code: "MULTIPLE_INCOMING_EDGES",
          message: `Node "${node.id}" has multiple incoming edges. Merging is not supported in v1.`,
          nodeId: node.id,
          nodeType: node.type
        });
      }
    }

    const startNodes = request.nodes.filter((node) => (incomingCount.get(node.id) ?? 0) === 0);

    if (request.nodes.length > 1 && startNodes.length !== 1) {
      issues.push({
        code: "INVALID_START_NODE_COUNT",
        message: `Flow must have exactly one start node in v1. Found ${startNodes.length}.`
      });
    }

    if (issues.length > 0) {
      return issues;
    }

    const plan = this.buildChainPlan(request);
    const visited = new Set(plan.orderedNodeIds);

    if (plan.orderedNodeIds.length !== request.nodes.length) {
      for (const node of request.nodes) {
        if (!visited.has(node.id)) {
          issues.push({
            code: "DISCONNECTED_NODE",
            message: `Node "${node.id}" is not part of the single v1 chain.`,
            nodeId: node.id,
            nodeType: node.type
          });
        }
      }
    }

    if (!visited.has(request.output)) {
      issues.push({
        code: "UNREACHABLE_OUTPUT_NODE",
        message: `Output node "${request.output}" is unreachable from the start node.`,
        nodeId: request.output
      });
    }

    if (hasCycle(request.nodes, request.edges)) {
      issues.push({
        code: "CYCLE_DETECTED",
        message: "Flow contains a cycle."
      });
    }

    return issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasCycle(nodes: FlowNode[], edges: FlowEdge[]): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const nextByNodeId = new Map<string, string>();

  for (const edge of edges) {
    nextByNodeId.set(edge.from, edge.to);
  }

  function visit(nodeId: string): boolean {
    if (visiting.has(nodeId)) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);

    const nextNodeId = nextByNodeId.get(nodeId);
    if (nextNodeId !== undefined && visit(nextNodeId)) {
      return true;
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  return nodes.some((node) => visit(node.id));
}
