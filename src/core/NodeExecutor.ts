import { NodeExecutionError, NodeFlowError, toSerializableError } from "../errors";
import type { ExecutionEvent, FlowNode, NodeContext, NodeDefinition, NodeResult, RunOptions, SerializableError } from "../types";

type Emit = (event: ExecutionEvent) => void;

export class NodeExecutor {
  async runNode(
    node: FlowNode,
    definition: NodeDefinition,
    input: unknown,
    context: Pick<NodeContext, "runId" | "nodeId" | "nodeType">,
    options: RunOptions = {}
  ): Promise<NodeResult> {
    const startedAt = Date.now();
    const maxAttempts = node.retry?.maxAttempts ?? 1;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt += 1;
      emit(options.onEvent, {
        type: "nodeStarted", ...context, attempt, timestamp: Date.now()
      });

      try {
        const output = await runAttempt(node, definition, input, {
          ...context, attempt, maxAttempts
        }, options.signal);
        const durationMs = Date.now() - startedAt;
        const result: NodeResult = {
          nodeId: node.id,
          nodeType: node.type,
          status: "success",
          input,
          output,
          attempts: attempt,
          durationMs
        };
        emit(options.onEvent, {
          type: "nodeSucceeded", ...context, result, timestamp: Date.now()
        });
        return result;
      } catch (cause) {
        const code = errorCode(cause);
        const canRetry = attempt < maxAttempts && shouldRetry(node, code) && !options.signal?.aborted;
        if (canRetry) {
          const delayMs = retryDelay(node, attempt);
          emit(options.onEvent, {
            type: "nodeRetrying", ...context, attempt, delayMs,
            error: serializeAttemptError(node, cause, code), timestamp: Date.now()
          });
          try {
            await abortableDelay(delayMs, options.signal);
            continue;
          } catch (abortCause) {
            cause = abortCause;
          }
        }

        const durationMs = Date.now() - startedAt;
        const error = serializeAttemptError(node, cause, errorCode(cause));
        const result: NodeResult = {
          nodeId: node.id,
          nodeType: node.type,
          status: "failed",
          input,
          error,
          attempts: attempt,
          durationMs
        };
        emit(options.onEvent, {
          type: "nodeFailed", ...context, result, timestamp: Date.now()
        });
        return result;
      }
    }

    throw new NodeFlowError("Node retry loop ended unexpectedly.", { code: "INVALID_RETRY_STATE", nodeId: node.id, nodeType: node.type });
  }
}

async function runAttempt(
  node: FlowNode,
  definition: NodeDefinition,
  input: unknown,
  context: Omit<NodeContext, "signal">,
  parentSignal?: AbortSignal
): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const onParentAbort = () => controller.abort(parentSignal?.reason);
  if (parentSignal?.aborted) controller.abort(parentSignal.reason);
  else parentSignal?.addEventListener("abort", onParentAbort, { once: true });

  const timer = node.timeoutMs === undefined ? undefined : setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, node.timeoutMs);

  try {
    if (controller.signal.aborted) throw abortError(node, timedOut);
    const handler = Promise.resolve(definition.run(input, node.config, { ...context, signal: controller.signal }));
    const aborted = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener("abort", () => reject(abortError(node, timedOut)), { once: true });
    });
    return await Promise.race([handler, aborted]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    parentSignal?.removeEventListener("abort", onParentAbort);
  }
}

function abortError(node: FlowNode, timedOut: boolean): NodeFlowError {
  return new NodeFlowError(
    timedOut ? `Node "${node.id}" timed out.` : `Node "${node.id}" was aborted.`,
    { code: timedOut ? "NODE_TIMEOUT" : "NODE_ABORTED", nodeId: node.id, nodeType: node.type }
  );
}

function errorCode(cause: unknown): string {
  if (cause instanceof NodeFlowError) return cause.code;
  if (typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string") return cause.code;
  return "NODE_EXECUTION_ERROR";
}

function shouldRetry(node: FlowNode, code: string): boolean {
  if (!node.retry) return false;
  return node.retry.retryOn === undefined || node.retry.retryOn.includes(code);
}

function retryDelay(node: FlowNode, completedAttempt: number): number {
  const base = node.retry?.delayMs ?? 0;
  const multiplier = node.retry?.backoffMultiplier ?? 1;
  return Math.min(60_000, Math.round(base * multiplier ** Math.max(0, completedAttempt - 1)));
}

function serializeAttemptError(node: FlowNode, cause: unknown, code: string): SerializableError {
  if (cause instanceof NodeFlowError && (code === "NODE_TIMEOUT" || code === "NODE_ABORTED")) {
    return cause.toJSON();
  }
  return toSerializableError(new NodeExecutionError(`Node "${node.id}" failed during execution.`, {
    nodeId: node.id, nodeType: node.type, code, cause
  }));
}

async function abortableDelay(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw new NodeFlowError("Workflow was aborted.", { code: "NODE_ABORTED" });
  if (delayMs === 0) return;
  await new Promise<void>((resolve, reject) => {
    const finish = () => { signal?.removeEventListener("abort", onAbort); resolve(); };
    const timer = setTimeout(finish, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(new NodeFlowError("Workflow was aborted.", { code: "NODE_ABORTED" }));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function emit(callback: RunOptions["onEvent"], event: ExecutionEvent): void {
  try { callback?.(event); } catch { /* Observability must not change execution. */ }
}
