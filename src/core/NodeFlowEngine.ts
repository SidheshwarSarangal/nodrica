import { toSerializableError, ValidationError } from "../errors";
import type { FlowRequest, FlowResult, NodeDefinition } from "../types";
import { createRunId } from "../utils/ids";
import { FlowExecutor } from "./FlowExecutor";
import { FlowValidator } from "./FlowValidator";
import { NodeRegistry } from "./NodeRegistry";

export class NodeFlowEngine {
  readonly registry: NodeRegistry;
  private readonly validator: FlowValidator;
  private readonly executor: FlowExecutor;

  constructor(registry = new NodeRegistry()) {
    this.registry = registry;
    this.validator = new FlowValidator(this.registry);
    this.executor = new FlowExecutor(this.registry);
  }

  registerNode(node: NodeDefinition): this {
    this.registry.registerNode(node);
    return this;
  }

  registerNodes(nodes: NodeDefinition[]): this {
    this.registry.registerNodes(nodes);
    return this;
  }

  async run(request: FlowRequest): Promise<FlowResult> {
    const runId = createRunId();
    const validation = this.validator.validate(request);

    if (!validation.valid) {
      const error = new ValidationError("Flow request validation failed.", validation.issues);

      return {
        success: false,
        nodeResults: {},
        error: toSerializableError(error),
        runId
      };
    }

    const plan = this.validator.buildChainPlan(request);
    return this.executor.execute(request, plan, runId);
  }
}
