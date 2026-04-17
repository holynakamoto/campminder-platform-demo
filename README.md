# Campminder Platform Demo

A steel-thread portfolio repo built to walk through one real conversation: **how do you let agents help run a platform without letting them run it off a cliff?**

The narrative follows a fictional modernization of a legacy .NET monolith into a set of extracted services fronted by an API gateway, with agent-assisted operations gated by a deterministic policy layer.

## The story, by talking point

| Talking point | The legacy pain | The intent-driven fix | Where it lives |
| --- | --- | --- | --- |
| **Agentic AI infrastructure** | Manual log triage, on-call fatigue, AI bolted on as IDE autocomplete | Claude-driven agents that emit typed intent envelopes, not freeform shell commands | [`agents/`](./agents) *(phase 2)* |
| **Deterministic guardrails** | "Wild West" automation, fear of unreviewable AI actions | OPA policy that gates every agent action — pure function of the envelope, no network, no LLM | [`guardrails/`](./guardrails) ✅ |
| **Monolith modernization** | High-risk big-bang cutovers, ad-hoc routing | Strangler pattern: YARP-style config shifts traffic per-endpoint, not per-service | [`modernization/`](./modernization) *(phase 3)* |
| **Developer-workflow influence** | Snowflake services, YAML tax on every new repo | Backstage Scaffolder templates + reusable GH Actions workflows that inherit the guardrails | [`platform/`](./platform), [`.github/workflows/`](./.github/workflows) *(phase 4)* |
| **Cross-team adoption** | Platform changes that ship but never land | Golden-path narrative anchored in the above — infra you *want* to opt into | [`platform/README.md`](./platform/README.md) *(phase 4)* |

## Current state

- [x] **Phase 1 — Guardrails steel thread.** Typed AgentAction schema, Rego policy with eight tests, three example fixtures, README.
- [ ] Phase 2 — Agent demo CLI
- [ ] Phase 3 — Modernization stub
- [ ] Phase 4 — Platform templates + pipelines
- [ ] Phase 5 — Interview polish

Track progress in [`tasks/todo.md`](./tasks/todo.md). Lessons and validated approaches live in [`tasks/lessons.md`](./tasks/lessons.md).

## Demo script (60 seconds)

> *Coming in Phase 5.* The walkthrough will follow one action from an agent's first log-triage prompt, through schema validation, through the OPA decision, through a reusable gated-promotion workflow, into the extracted TS service behind the gateway.
