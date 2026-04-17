import pc from "picocolors";
import type { AgentAction, PolicyDecision } from "./types.js";
import type { TriageResult } from "./agent.js";

export function renderHeader(scenarioTitle: string): void {
  console.log();
  console.log(pc.bold(pc.cyan("━━━ Campminder agent triage ━━━")));
  console.log(pc.dim(scenarioTitle));
  console.log();
}

export function renderReasoning(result: TriageResult | { reasoning: string }): void {
  if (!result.reasoning.trim()) return;
  console.log(pc.bold("Agent reasoning:"));
  console.log(indent(result.reasoning, "  "));
  console.log();
}

export function renderUsage(result: TriageResult): void {
  const parts = [
    `in=${result.uncached_input_tokens}`,
    `cached=${result.cached_input_tokens}`,
    `cache_write=${result.cache_creation_tokens}`,
    `out=${result.output_tokens}`,
  ];
  console.log(pc.dim(`(${parts.join("  ")})`));
  console.log();
}

export function renderAction(action: AgentAction): void {
  console.log(pc.bold("Proposed action:"));
  row("kind", action.kind);
  row("target", `${action.target.service} / ${action.target.environment}`);
  row(
    "risk",
    `score=${action.risk.score}  blast=${action.risk.blast_radius}  reversible=${action.risk.reversible ?? "unset"}`,
  );
  row(
    "principal",
    `${action.principal.agent_id}  [${action.principal.capabilities.join(", ")}]`,
  );
  if (action.principal.human_approver) {
    row("approver", action.principal.human_approver);
  }
  if (action.change_ticket) {
    row("ticket", action.change_ticket);
  }
  if (action.evidence && action.evidence.length > 0) {
    row("evidence", `${action.evidence.length} citation(s)`);
  }
  console.log(`  ${pc.dim("why")} ${action.justification}`);
  console.log();
}

export function renderDecision(decision: PolicyDecision): void {
  console.log(pc.bold("Policy decision:"));
  if (decision.allow) {
    console.log(`  ${pc.green("✓ ALLOW")}  — action cleared every gate`);
  } else {
    console.log(
      `  ${pc.red("✗ DENY")}   — ${decision.reasons.length} reason(s):`,
    );
    for (const r of decision.reasons) {
      console.log(`    ${pc.red("•")} ${r}`);
    }
  }
  console.log();
}

function row(label: string, value: string): void {
  console.log(`  ${pc.dim(label.padEnd(10))} ${value}`);
}

function indent(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((l) => `${prefix}${pc.dim(l)}`)
    .join("\n");
}
