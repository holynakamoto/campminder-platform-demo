import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPolicy } from "@open-policy-agent/opa-wasm";
import type { AgentAction, PolicyDecision } from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const WASM_PATH = resolve(HERE, "../dist/policy.wasm");
const DATA_PATH = resolve(HERE, "../dist/data.json");

type LoadedPolicy = {
  setData: (data: unknown) => void;
  evaluate: (input: unknown) => Array<{ result: unknown }>;
};

export class PolicyEvaluator {
  private constructor(private readonly policy: LoadedPolicy) {}

  static async load(): Promise<PolicyEvaluator> {
    const [wasmBytes, dataText] = await Promise.all([
      readFile(WASM_PATH),
      readFile(DATA_PATH, "utf-8"),
    ]);
    const policy = (await loadPolicy(wasmBytes)) as LoadedPolicy;
    policy.setData(JSON.parse(dataText));
    return new PolicyEvaluator(policy);
  }

  evaluate(action: AgentAction): PolicyDecision {
    const results = this.policy.evaluate(action);
    const first = results[0]?.result as
      | { allow?: unknown; reasons?: unknown }
      | undefined;

    if (!first || typeof first.allow !== "boolean") {
      return {
        allow: false,
        reasons: ["policy returned an unexpected shape"],
      };
    }

    const reasons = Array.isArray(first.reasons)
      ? first.reasons.filter((r): r is string => typeof r === "string")
      : [];

    return { allow: first.allow, reasons };
  }
}
