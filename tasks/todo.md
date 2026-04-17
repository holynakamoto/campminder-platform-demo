# Campminder Platform Demo — Task Log

**Objective:** Build a steel-thread portfolio repo that demonstrates five talking points for the Campminder platform engineering interview: (1) agentic AI infrastructure, (2) developer-workflow influence, (3) monolith modernization, (4) deterministic guardrails, (5) cross-team platform adoption.

**Approach:** One lifecycle flow end-to-end. An agent proposes an action → a deterministic policy gates it → a reusable pipeline executes it → the modernization target receives it. Depth on #1 and #4 (differentiators). Credible stubs for #2, #3, #5.

---

## Phase 1 — Guardrails steel thread (#1 + #4) ✅

- [x] Seed `tasks/todo.md` and `tasks/lessons.md`
- [x] `guardrails/schema/action.schema.json` — typed Agent Action envelope
- [x] `guardrails/policies/agent_actions.rego` — deterministic deny rules
- [x] `guardrails/policies/agent_actions_test.rego` — 8 rego unit tests, all passing
- [x] `guardrails/examples/` — one allowed, two denied fixtures, outcomes verified via `opa eval`
- [x] `guardrails/README.md` — contract + how to run `opa test`
- [x] Top-level `README.md` — interview talking-doc skeleton

**Proof of work:** `opa test policies/ -v` → 8/8 PASS. `opa check --strict policies/` clean. All three example fixtures evaluate to their documented outcomes.

**Gate:** Pause for review. Confirm the schema shape + policy rules resonate before wiring the agent demo.

## Phase 2 — Agent demo CLI (#1) ✅

- [x] `agents/package.json` + `tsconfig.json` + `.gitignore`
- [x] `agents/scripts/build-policy.sh` — compile Rego → wasm via `opa build -t wasm`
- [x] `agents/src/types.ts` — TS types mirroring the AgentAction schema
- [x] `agents/src/policy.ts` — opa-wasm loader + `PolicyEvaluator.evaluate(action)`
- [x] `agents/src/agent.ts` — Anthropic SDK client with tool use + prompt caching
- [x] `agents/src/scenarios/` — two fixtures: staging-deploy (allow) + billing-queue-spike (deny)
- [x] `agents/src/render.ts` — CLI output (reasoning, action, decision, usage)
- [x] `agents/src/cli.ts` — scenario selector, mock-mode fallback
- [x] `agents/README.md` — how to run, expected output, model choice rationale
- [x] Verification: `npm install`, `npm run build:policy`, `npm run typecheck`, both scenarios in mock mode produce expected allow/deny outcomes

**Proof of work:** `npm run typecheck` clean. `npm run demo:allow` → exit 0, ALLOW, action cleared every gate. `npm run demo:deny` → exit 1, DENY, reason: "risk_score 82 exceeds autonomous threshold (70) without human_approver". Real-API path (tool use, prompt caching, model selection) is structurally correct and typechecks but has not been exercised end-to-end in this session — user needs to export `ANTHROPIC_API_KEY` and run `npm run demo:allow` / `demo:deny` to validate live.

**Tech debt logged:** `prestart` rebuilds the policy wasm on every `npm start`. Fine for a demo; a real platform would cache on mtime. Not worth fixing pre-interview.

**Design decisions for the interview:**
- Tool use, not JSON mode — it's the canonical Claude way to emit typed intent, and it maps directly to "agent proposes an action."
- Prompt caching on the tool definition (the JSON schema is ~1KB of stable tokens). Demonstrates cost-awareness.
- `tool_choice: { type: "tool", name: "propose_action" }` — forces the agent down the typed path.
- Mock mode when no `ANTHROPIC_API_KEY` — demo survives bad Wi-Fi.
- The policy is real in both modes — the whole point is the gate, never the agent.

## Phase 3 — Modernization stub (#3)

- [ ] `modernization/legacy/` — minimal `.csproj` stand-in for the monolith
- [ ] `modernization/modern/` — clean TS service with one extracted endpoint
- [ ] `modernization/gateway/yarp-config.json` — strangler routing

## Phase 4 — Platform + pipelines (#2 + #5)

- [ ] `platform/templates/service-template.yaml` — Backstage Scaffolder template (no Backstage install)
- [ ] `.github/workflows/gated-promotion.yml` — reusable workflow that calls the guardrails policy
- [ ] `platform/README.md` — golden-path narrative

## Phase 5 — Interview polish

- [x] Explainer deck covering all 5 phases — [docs/presentation.md](../docs/presentation.md) (Marp, 15 slides, plain English). Verified renders to HTML and exports to editable PPTX at [docs/presentation.pptx](../docs/presentation.pptx). PDF export available via `npx @marp-team/marp-cli docs/presentation.md --pdf`.
- [ ] Flesh out top-level README table (problem → intent-driven fix)
- [ ] Add a 60-second demo script to `README.md`
- [ ] Tech-debt audit in this file

**Note:** Phase 5 internally is "interview polish" (meta). In the audience-facing deck it's rebranded to **Rollout & adoption** — that's the substantive story (how teams opt in) rather than the meta (how we polish the demo).

---

## Audit trail

- 2026-04-17 — Scope pivoted from full monorepo to steel thread per user feedback. Dropped real Backstage install, full YARP gateway, and multi-agent orchestration in favor of one end-to-end flow.
