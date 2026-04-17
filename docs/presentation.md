---
marp: true
theme: default
paginate: true
footer: 'AI as Infrastructure  ·  Nick Moore'
---

<!--
Render this deck locally:
  npx @marp-team/marp-cli docs/presentation.md --preview
Export to PDF:
  npx @marp-team/marp-cli docs/presentation.md --pdf
Export to PPTX (editable in Keynote/PowerPoint):
  npx @marp-team/marp-cli docs/presentation.md --pptx
Or: install the Marp for VS Code extension and open this file.
-->

<style>
section {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 28px;
  padding: 64px 72px;
  color: #1a2332;
}
section.lead {
  background: linear-gradient(135deg, #0f1e2e 0%, #1a3a5c 100%);
  color: #f5f5f5;
  justify-content: center;
}
section.lead h1 { color: #f5f5f5; font-size: 64px; letter-spacing: -0.02em; }
section.lead h2 { color: #a8c5db; font-weight: 400; font-size: 32px; }
section.lead footer,
section.lead header,
section.lead::after { visibility: hidden; }
h1 { color: #0f1e2e; font-weight: 700; letter-spacing: -0.01em; }
h2 { color: #4a6580; font-weight: 500; }
strong { color: #0f1e2e; }
ol, ul { line-height: 1.55; }
li { margin-bottom: 0.35em; }
footer { color: #aab4bf; font-size: 16px; }
table { font-size: 22px; border-collapse: collapse; }
table th { background: #f4f6f8; text-align: left; padding: 10px 14px; }
table td { padding: 10px 14px; border-bottom: 1px solid #e8ecef; }
pre {
  background: #0f1e2e;
  color: #e8e8e8;
  border-radius: 6px;
  padding: 20px 24px;
  font-size: 18px;
  line-height: 1.45;
}
code { font-size: 0.92em; }
.money { color: #b8371f; font-weight: 700; }
.quiet { color: #7a8590; font-size: 0.88em; }
.big {
  font-size: 44px;
  font-weight: 600;
  line-height: 1.35;
  color: #0f1e2e;
  padding-top: 60px;
}
.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
}
.columns h2 { margin-top: 0; font-size: 26px; }
</style>

<!-- _class: lead -->

# AI as Infrastructure

## Handing agents the keys, safely

<br>

Nick Moore

---

<div class="big">

How do you let AI help <u>run</u> a platform,

without letting AI <u>run</u> your platform?

</div>

---

# Where AI fits in most shops today

- Better autocomplete in the IDE
- Test generation
- PR review hints
- Commit messages

<br>

<span class="quiet">AI as a productivity tool. Useful — but not *infrastructure*.</span>

---

# Where the leverage actually is

- Triage an on-call page at 2am
- Scale a service when a queue spikes
- Propose a config change with cited evidence
- Catch drift before it becomes an incident

<br>

**The hard part isn't making AI *do* this.
It's making AI do this *safely*.**

---

# The core bet

## Three principles

1. **Every AI action is a structured proposal** — not free text, not shell commands
2. **Every proposal is reviewed by deterministic rules** — not by another AI
3. **Humans stay in the loop where risk demands it** — not on every routine action

---

# Five phases

|   | Phase | Role |
|---|-------|------|
| **1** | **Guardrails** | the trust anchor — typed form + deterministic rules |
| **2** | **Agent** | the proposal-maker — Claude, reasoning honestly |
| **3** | **Modernization** | extracting the .NET monolith without big-bang cutovers |
| **4** | **Platform** | golden paths that inherit the guardrails for free |
| **5** | **Rollout** | how teams actually opt in |

---

# Phase 1 — Guardrails

## The trust anchor

Before any agent touches a system, it fills out a **typed form**. A **deterministic rulebook** reviews the form.

Rules are **code**. Reviewed in pull requests. Tested. Versioned. Boring.

<br>

<span class="quiet">That's the point — safety should be boring.</span>

---

# Phase 1 — Form & rules

<div class="columns">
<div>

## The form asks

- What action? *(deploy, scale, restart…)*
- What target? *(service, environment)*
- What risk? *(score, blast radius, reversibility)*
- Who's asking? *(agent, capabilities, human co-signer?)*
- Why? *(justification, evidence, ticket)*

</div>
<div>

## The rules check

- Prod changes need a **change ticket**
- High risk needs a **human**
- Irreversible + prod **always** needs a human
- Config mutations need **cited evidence**
- Agents only use capabilities they were **granted**

</div>
</div>

---

# Phase 2 — The agent

Claude reads production signals, reasons, and proposes **one** action.

- The agent cannot respond with free text — it **must** call a typed tool
- Whatever it proposes goes straight through the Phase 1 guardrails
- Model: `claude-sonnet-4-6`, with prompt caching on the tool schema

<br>

The agent is smart. The rulebook is simple.
*Different brains for different problems.*

---

# Demo — the happy path

```
kind       deploy
target     registration-api / staging
risk       score=20  blast=service  reversible=true
principal  deploy-bot  [deploy:write]
why        Routine promotion, CI green, canary empty

Policy decision:
  ✓ ALLOW  — action cleared every gate
```

<span class="quiet">Low risk. Capability-matched. Non-prod. Gate gets out of the way.</span>

---

# Demo — the gate holds

```
kind       scale
target     billing-worker / prod
risk       score=82  blast=service
principal  capacity-bot  [compute:scale]
ticket     CHG-4471
evidence   2 citations
why        Queue crossed 10k, p99 past SLO, RB-017 prescribes 3x

Policy decision:
  ✗ DENY   — 1 reason(s)
    • risk_score 82 exceeds autonomous threshold (70)
      without human_approver
```

<span class="money">Agent did its job. Gate did its job. That's the pitch.</span>

---

# Phase 3 — Modernizing the monolith

The legacy .NET platform isn't getting rewritten over a weekend.

## Strangler pattern

- Route **per-endpoint**, not per-service, through a gateway
- Extract one capability at a time into a new service
- Gate every cutover with the Phase 1 guardrails

<br>

No big-bang cutovers. No weekend maintenance windows.
No *"we're migrating, please hold."*

---

# Phase 4 — Golden paths

Platform work only matters if teams **use** it.

<div class="columns">
<div>

## Backstage scaffolder

New service? One command. You get:
- pipeline
- Dockerfile
- health check
- observability
- **the guardrails**

…for free.

</div>
<div>

## Reusable pipelines

Every deploy pipeline inherits the same gated-promotion step from Phase 1.

<br>

**Teams don't opt *in* to safety.
They get it by default.**

</div>
</div>

---

# Phase 5 — Rollout & adoption

## How an org actually adopts this

1. **Start with volunteers** — one team, one service, a real win
2. **Make the golden path *easier* than the alternative** — not just better
3. **Publish the numbers** — cached tokens, caught incidents, pages avoided
4. **Sunset the old way on a schedule** — don't support both forever

<br>

<span class="quiet">The technology is the easy part. This phase is the hard part.</span>

---

<!-- _class: lead -->

# What this unlocks

- .NET modernization **without** weekend migrations
- AIOps your on-call **actually trusts**
- Platform changes teams opt *into* — friction is low when risk is low
- **AI as infrastructure**, not as autocomplete

<br>

## Thanks — questions?
