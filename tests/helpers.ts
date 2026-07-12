import { NodeFlowEngine } from "../src";

export function createTextEngine(): NodeFlowEngine {
  const engine = new NodeFlowEngine();

  engine.registerNodes([
    {
      type: "uppercase",
      async run(input) {
        const current = input as { text: string };
        return { text: current.text.toUpperCase() };
      }
    },
    {
      type: "append",
      async run(input, config) {
        const current = input as { text: string };
        const options = config as { value: string };
        return { text: current.text + options.value };
      }
    },
    {
      type: "return",
      async run(input) {
        return input;
      }
    },
    {
      type: "fail",
      async run() {
        throw new Error("Intentional failure");
      }
    },
    {
      type: "reject",
      async run() {
        return Promise.reject(new Error("Intentional rejection"));
      }
    },
    {
      type: "undefined-output",
      async run() {
        return undefined;
      }
    },
    {
      type: "null-output",
      async run() {
        return null;
      }
    }
  ]);

  return engine;
}
