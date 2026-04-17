# Guardrails

The deterministic policy layer that sits between agent intent and platform mutation. An agent cannot take action against a Campminder service without an **AgentAction envelope** that passes this policy.

## Contract

```
agent runtime ──► AgentAction envelope ──► OPA policy ──► { allow, reasons[] }
                  (schema/action.schema.json)  (policies/agent_actions.rego)
```

**Producers** (agents) assemble the envelope and emit it alongside any proposed action.
**Consumers** (the execution broker, CI pipelines, on-call tooling) refuse to act unless the decision document says `allow: true`.

The split is intentional. The agent can be probabilistic — it proposes, reasons, summarizes. The policy is pure, deterministic, and reviewable in a PR. The two halves together are the *safety valve*: we get the upside of agentic automation without handing production to an LLM.

## Why this shape

- **Deny-by-default.** Unknown envelope shapes are rejected, not interpreted.
- **Additive reasons.** The policy returns *every* blocker in one round trip so the agent can fix them in one pass rather than N.
- **Capabilities are minted, not self-asserted.** The `principal.capabilities` list comes from an upstream agent broker that signs them. The policy trusts the claim only because the broker did.
- **Irreversibility is a first-class concept.** `run_migration` and `rotate_secret` in prod can never be autonomous, regardless of risk score.
- **No network, no time.** The policy is a pure function of the envelope. That's what makes it auditable.

## Running

Requires [OPA](https://www.openpolicyagent.org/docs/latest/#running-opa) in `PATH`.

```bash
# Evaluate one example
opa eval -d policies/ -i examples/allowed-staging-deploy.json \
  'data.campminder.guardrails.agent_actions.decision'

# Run the policy test suite
opa test policies/ -v
```

Example output for a denied action:

```json
{
  "allow": false,
  "reasons": [
    "prod actions require a change_ticket (CHG-*/INC-*)"
  ]
}
```

## Examples

| Fixture | Outcome | What it demonstrates |
| --- | --- | --- |
| `allowed-staging-deploy.json` | ✅ allow | Low-risk, capability-matched, non-prod action clears all gates |
| `denied-prod-no-ticket.json` | ❌ deny | Prod change control — a human approver is not a substitute for a ticket |
| `denied-high-risk-autonomous.json` | ❌ deny | Risk threshold — score >70 always needs a human, even with evidence and a ticket |

## Test coverage

See `policies/agent_actions_test.rego`. The suite covers every `deny` rule plus one end-to-end allow path and a multi-reason case to lock in the additive behavior.

## Extending

When adding a new `kind`:
1. Update the `kind` enum in `schema/action.schema.json`.
2. Add the capability mapping in `capability_for_kind`.
3. Add any rule-specific constraints (blast radius, irreversibility, evidence).
4. Add tests for the happy path and for each new deny.
5. Update the Examples table above.
