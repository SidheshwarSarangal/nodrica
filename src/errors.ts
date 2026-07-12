import type { SerializableError, ValidationIssue } from "./types";

export class NodeFlowError extends Error {
  readonly code: string;
  readonly nodeId?: string;
  readonly nodeType?: string;
  readonly cause?: unknown;

  constructor(
    message: string,
    options: {
      code?: string;
      nodeId?: string;
      nodeType?: string;
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = "NodeFlowError";
    this.code = options.code ?? "NODE_FLOW_ERROR";

    if (options.nodeId !== undefined) {
      this.nodeId = options.nodeId;
    }

    if (options.nodeType !== undefined) {
      this.nodeType = options.nodeType;
    }

    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }

  toJSON(): SerializableError {
    const serialized: SerializableError = {
      name: this.name,
      message: this.message,
      code: this.code
    };

    if (this.nodeId !== undefined) {
      serialized.nodeId = this.nodeId;
    }

    if (this.nodeType !== undefined) {
      serialized.nodeType = this.nodeType;
    }

    if (this.cause !== undefined) {
      serialized.cause = serializeCause(this.cause);
    }

    return serialized;
  }
}

export class ValidationError extends NodeFlowError {
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[] = []) {
    super(message, { code: "VALIDATION_ERROR" });
    this.name = "ValidationError";
    this.issues = issues;
  }

  override toJSON(): SerializableError {
    return {
      ...super.toJSON(),
      cause: this.issues
    };
  }
}

export class NodeExecutionError extends NodeFlowError {
  constructor(
    message: string,
    options: {
      nodeId: string;
      nodeType: string;
      cause?: unknown;
    }
  ) {
    super(message, {
      code: "NODE_EXECUTION_ERROR",
      nodeId: options.nodeId,
      nodeType: options.nodeType,
      cause: options.cause
    });
    this.name = "NodeExecutionError";
  }
}

export function toSerializableError(error: unknown): SerializableError {
  if (error instanceof NodeFlowError) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: "UNKNOWN_ERROR"
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
    code: "UNKNOWN_ERROR"
  };
}

function serializeCause(cause: unknown): unknown {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message
    };
  }

  return cause;
}
