import { runTriage } from "./agent.js";
import { PolicyEvaluator } from "./policy.js";
import { scenarios } from "./scenarios/index.js";
import {
  renderAction,
  renderDecision,
  renderHeader,
  renderReasoning,
  renderUsage,
} from "./render.js";
import type { TriageResult } from "./agent.js";

const scenarioId = process.argv[2];

if (!scenarioId || scenarioId === "--help" || scenarioId === "-h") {
  console.log("Usage: npm start -- <scenario>");
  console.log();
  console.log("Scenarios:");
  for (const s of Object.values(scenarios)) {
    console.log(`  ${s.id.padEnd(28)} ${s.title}`);
  }
  process.exit(scenarioId ? 0 : 1);
}

const scenario = scenarios[scenarioId];
if (!scenario) {
  console.error(`Unknown scenario: ${scenarioId}`);
  console.error(`Known: ${Object.keys(scenarios).join(", ")}`);
  process.exit(1);
}

const mockMode = !process.env.ANTHROPIC_API_KEY;

renderHeader(scenario.title);

if (mockMode) {
  console.log(
    "(no ANTHROPIC_API_KEY set — running in mock mode with canned agent output)",
  );
  console.log();
}

const triage: TriageResult = mockMode
  ? {
      action: scenario.mockAction,
      reasoning: "[mock mode — agent output is canned]",
      cached_input_tokens: 0,
      uncached_input_tokens: 0,
      cache_creation_tokens: 0,
      output_tokens: 0,
    }
  : await runTriage(scenario);

renderReasoning(triage);
if (!mockMode) renderUsage(triage);
renderAction(triage.action);

const evaluator = await PolicyEvaluator.load();
const decision = evaluator.evaluate(triage.action);
renderDecision(decision);

process.exit(decision.allow ? 0 : 1);
