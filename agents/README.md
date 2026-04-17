# Agents

The agent-side half of the guardrails story. A Claude-driven triage agent reads production signals, reasons over them, and emits a typed `AgentAction` envelope via tool use. The envelope runs through the Rego policy (compiled to WebAssembly, evaluated inline) before any mutation would hit a real system.

## Running the demo

```bash
npm install
npm run build:policy          # compiles ../guardrails/policies/*.rego -> dist/policy.wasm

# with a real Claude call
export ANTHROPIC_API_KEY=sk-ant-...
npm run demo:allow            # staging deploy → ALLOW
npm run demo:deny             # prod autonomous scale → DENY

# without credentials — canned agent output, real policy eval
unset ANTHROPIC_API_KEY
npm run demo:allow
npm run demo:deny
```

The policy evaluation runs identically in both modes. Mock mode exists so the demo survives an interview-day network hiccup; the point of the walkthrough is the gate, not the agent.

## Why these design choices

**Tool use, not prose.** `tool_choice: { type: "tool", name: "propose_action" }` forces Claude down the typed path. The envelope isn't scraped from free text — it's the return value of a function Claude must call. This is the single biggest reason a real platform can trust agent output.

**Prompt caching on the tool definition.** The `propose_action` tool carries the full `AgentAction` JSON Schema — ~1KB of structured tokens that are identical on every invocation. A `cache_control: { type: "ephemeral" }` breakpoint there cuts input-token cost on repeat calls. Real cost relief, not a party trick.

**The policy is the trust anchor, not the agent.** The system prompt explicitly instructs Claude to *not game the risk score to clear the policy*. Even if an agent ignored that instruction, the capabilities list is minted by the broker (not self-asserted), which is what the `principal.capabilities` rule in the policy catches.

**`claude-sonnet-4-6` by default.** Fast enough for live interview pacing, smart enough to calibrate risk honestly, and priced so the cache savings are meaningful. Opus is overkill for a scenario where the structured output shape does most of the heavy lifting.

## Expected output

Scenario `staging-deploy-ready` (allowed):

```
Proposed action:
  kind       deploy
  target     registration-api / staging
  risk       score=20  blast=service  reversible=true
  principal  deploy-bot  [deploy:write]
  why        Routine promotion ... CI green ...

Policy decision:
  ✓ ALLOW  — action cleared every gate
```

Scenario `billing-queue-spike` (denied):

```
Proposed action:
  kind       scale
  target     billing-worker / prod
  risk       score=82  blast=service  reversible=true
  principal  capacity-bot  [compute:scale]
  ticket     CHG-4471
  why        Queue crossed 10k, p99 climbing past SLO ...

Policy decision:
  ✗ DENY   — 1 reason(s):
    • risk_score 82 exceeds autonomous threshold (70) without human_approver
```

That second output is the story. The agent's reasoning is fine — it read the signals, matched them to a runbook, filled in a change ticket, and cited evidence. The *gate* is what makes autonomous operation safe: at 2am, an autonomous bot can't push a 3x scale-out in prod without a human on the other end of the co-sign.

## Where this goes next

- Phase 4 wires this same policy evaluator into a reusable GitHub Actions workflow so pipeline steps can gate themselves the same way the agent does.
- A production version would stream `TriageResult` to an audit log (every envelope, every decision, keyed by `action_id`) and surface `cached_input_tokens` as a cost SLI.
