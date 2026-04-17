# Deterministic policy for agent-proposed platform actions.
#
# Contract: consume an AgentAction envelope (see schema/action.schema.json)
# and produce a decision document the agent runtime can act on.
#
#   opa eval -d policies/ -i action.json \
#     'data.campminder.guardrails.agent_actions.decision'
#
# Design notes:
#  - Deny-by-default for unknown shapes.
#  - Rules are additive: each reason is collected, not short-circuited, so
#    the agent sees every blocker in one round trip.
#  - No network, no time-of-day rules, no LLM calls. Pure functions of input.

package campminder.guardrails.agent_actions

import rego.v1

default decision := {
	"allow": false,
	"reasons": ["policy did not evaluate — envelope did not match schema"],
}

decision := {
	"allow": count(reasons) == 0,
	"reasons": reasons,
} if {
	reasons := [r | some r in deny]
}

# --- Production change control ---

deny contains msg if {
	input.target.environment == "prod"
	not input.change_ticket
	msg := "prod actions require a change_ticket (CHG-*/INC-*)"
}

deny contains msg if {
	input.target.environment == "prod"
	input.risk.blast_radius in {"tenant", "region", "global"}
	not input.principal.human_approver
	msg := sprintf("prod %v-radius action requires a human_approver", [input.risk.blast_radius])
}

# --- Risk threshold ---

deny contains msg if {
	input.risk.score > 70
	not input.principal.human_approver
	msg := sprintf("risk_score %v exceeds autonomous threshold (70) without human_approver", [input.risk.score])
}

# --- Capability enforcement (agent can only do what its broker minted for it) ---

deny contains msg if {
	required := capability_for_kind[input.kind]
	not required in input.principal.capabilities
	msg := sprintf("agent %q lacks capability %q required for kind %q", [input.principal.agent_id, required, input.kind])
}

# --- Irreversibility hard-stop ---

deny contains msg if {
	input.kind in {"run_migration", "rotate_secret"}
	input.risk.reversible == false
	input.target.environment == "prod"
	not input.principal.human_approver
	msg := sprintf("%v is irreversible in prod — requires human_approver", [input.kind])
}

# --- Evidence requirement for config mutations ---

deny contains msg if {
	input.kind == "mutate_config"
	count(object.get(input, "evidence", [])) == 0
	msg := "mutate_config requires at least one evidence citation"
}

capability_for_kind := {
	"deploy": "deploy:write",
	"rollback": "deploy:write",
	"scale": "compute:scale",
	"restart": "compute:restart",
	"mutate_config": "config:write",
	"run_migration": "data:migrate",
	"rotate_secret": "secret:rotate",
}
