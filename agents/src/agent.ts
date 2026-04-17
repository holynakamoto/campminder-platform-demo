import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import type { AgentAction, Scenario } from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(HERE, "../../guardrails/schema/action.schema.json");

// Sonnet 4.6 is the right default for this workload: fast enough for a live
// demo, smart enough to calibrate risk honestly, cheap enough that prompt
// caching saves a meaningful fraction of real spend.
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a Campminder platform triage agent. You observe production signals (logs, metrics, alerts) from services in the Campminder infrastructure and propose ONE concrete action to address what you see.

You must propose the action by calling the \`propose_action\` tool. Never respond with prose alone. The action you emit is evaluated by a deterministic policy engine before any real change occurs — your job is to be honest about risk, not to route around the policy.

Guidelines for populating the AgentAction envelope:
- risk.score (0-100): calibrate against blast radius, reversibility, and traffic sensitivity. A single-pod restart in dev is ~5. A prod DB migration is 80+. Do not game this number to clear the policy — the policy is the trust anchor, not you.
- risk.blast_radius: be precise. Most service-level actions are "service". Region-wide changes are "region". A customer-impact-scoped change is "tenant".
- principal.capabilities: you will be told which capabilities your broker has minted for this invocation. Claim exactly those, never more.
- justification: 1-3 sentences. Describe the signal and why this action is the right response. This lands in the permanent audit log.
- evidence: every mutate_config action MUST include at least one citation (log link, dashboard, runbook). Other kinds should include evidence when the proposal isn't obvious from the invocation context.
- change_ticket: only set if the invocation context tells you one is open. Never invent ticket IDs.
- principal.human_approver: only set if the invocation context tells you a human has co-signed. Never self-assert approval.`;

export interface TriageResult {
  action: AgentAction;
  reasoning: string;
  cached_input_tokens: number;
  uncached_input_tokens: number;
  cache_creation_tokens: number;
  output_tokens: number;
}

async function loadToolSchema(): Promise<Record<string, unknown>> {
  const raw = JSON.parse(await readFile(SCHEMA_PATH, "utf-8"));
  // Strip JSON Schema metadata that Anthropic's tool schema validator ignores.
  const { $schema, $id, title, ...rest } = raw;
  return rest;
}

export async function runTriage(scenario: Scenario): Promise<TriageResult> {
  const client = new Anthropic();
  const inputSchema = await loadToolSchema();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
      },
    ],
    // The tool definition is the largest stable prefix of every request, so
    // that's where the cache breakpoint goes. The JSON schema alone is ~1.2KB
    // of structured tokens that never change between scenarios.
    tools: [
      {
        name: "propose_action",
        description:
          "Propose one platform mutation in response to the signals you just observed. The envelope is validated against the AgentAction JSON schema and then gated by the Campminder guardrails policy.",
        input_schema: inputSchema as Anthropic.Tool.InputSchema,
        cache_control: { type: "ephemeral" },
      },
    ],
    tool_choice: { type: "tool", name: "propose_action" },
    messages: [{ role: "user", content: scenario.prompt }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not invoke the propose_action tool");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  const reasoning = textBlock?.type === "text" ? textBlock.text : "";

  return {
    action: toolUse.input as AgentAction,
    reasoning,
    cached_input_tokens: response.usage.cache_read_input_tokens ?? 0,
    uncached_input_tokens: response.usage.input_tokens,
    cache_creation_tokens: response.usage.cache_creation_input_tokens ?? 0,
    output_tokens: response.usage.output_tokens,
  };
}
