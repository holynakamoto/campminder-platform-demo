package campminder.guardrails.agent_actions_test

import rego.v1

import data.campminder.guardrails.agent_actions

base_principal := {
	"agent_id": "deploy-bot",
	"capabilities": ["deploy:write"],
}

test_allows_low_risk_staging_deploy if {
	d := agent_actions.decision with input as {
		"action_id": "0190c4a0-1111-7000-8000-000000000001",
		"kind": "deploy",
		"target": {"service": "registration-api", "environment": "staging"},
		"risk": {"score": 20, "blast_radius": "service", "reversible": true},
		"principal": base_principal,
		"justification": "routine promotion of main after green CI",
	}
	d.allow
}

test_denies_prod_without_change_ticket if {
	d := agent_actions.decision with input as {
		"action_id": "0190c4a0-1111-7000-8000-000000000002",
		"kind": "deploy",
		"target": {"service": "registration-api", "environment": "prod"},
		"risk": {"score": 30, "blast_radius": "service", "reversible": true},
		"principal": object.union(base_principal, {"human_approver": "nick@campminder.example"}),
		"justification": "promote staging build after smoke tests passed",
	}
	not d.allow
	some r in d.reasons
	contains(r, "change_ticket")
}

test_denies_high_risk_without_human if {
	d := agent_actions.decision with input as {
		"action_id": "0190c4a0-1111-7000-8000-000000000003",
		"kind": "scale",
		"target": {"service": "billing-worker", "environment": "prod"},
		"risk": {"score": 85, "blast_radius": "service", "reversible": true},
		"principal": {"agent_id": "capacity-bot", "capabilities": ["compute:scale"]},
		"justification": "queue depth exceeded SLO; scaling workers 3x",
		"change_ticket": "CHG-4471",
	}
	not d.allow
	some r in d.reasons
	contains(r, "autonomous threshold")
}

test_denies_missing_capability if {
	d := agent_actions.decision with input as {
		"action_id": "0190c4a0-1111-7000-8000-000000000004",
		"kind": "rotate_secret",
		"target": {"service": "auth-api", "environment": "staging"},
		"risk": {"score": 40, "blast_radius": "service", "reversible": false},
		"principal": base_principal,
		"justification": "scheduled rotation per 90-day policy",
	}
	not d.allow
	some r in d.reasons
	contains(r, "capability")
}

test_denies_mutate_config_without_evidence if {
	d := agent_actions.decision with input as {
		"action_id": "0190c4a0-1111-7000-8000-000000000005",
		"kind": "mutate_config",
		"target": {"service": "registration-api", "environment": "staging"},
		"risk": {"score": 30, "blast_radius": "service", "reversible": true},
		"principal": {"agent_id": "triage-bot", "capabilities": ["config:write"]},
		"justification": "bumping timeout based on p99 latency observations",
		"evidence": [],
	}
	not d.allow
	some r in d.reasons
	contains(r, "evidence")
}

test_allows_prod_with_full_controls if {
	d := agent_actions.decision with input as {
		"action_id": "0190c4a0-1111-7000-8000-000000000006",
		"kind": "deploy",
		"target": {"service": "registration-api", "environment": "prod"},
		"risk": {"score": 40, "blast_radius": "service", "reversible": true},
		"principal": {
			"agent_id": "deploy-bot",
			"capabilities": ["deploy:write"],
			"human_approver": "nick@campminder.example",
		},
		"justification": "promote v2026.04.17-build.3 to prod after canary baked 30m",
		"change_ticket": "CHG-4482",
	}
	d.allow
}

test_denies_irreversible_prod_migration_without_human if {
	d := agent_actions.decision with input as {
		"action_id": "0190c4a0-1111-7000-8000-000000000007",
		"kind": "run_migration",
		"target": {"service": "registration-api", "environment": "prod"},
		"risk": {"score": 60, "blast_radius": "service", "reversible": false},
		"principal": {"agent_id": "migrator-bot", "capabilities": ["data:migrate"]},
		"justification": "drop deprecated registrations.legacy_status column",
		"change_ticket": "CHG-4499",
	}
	not d.allow
	some r in d.reasons
	contains(r, "irreversible")
}

test_collects_multiple_reasons if {
	d := agent_actions.decision with input as {
		"action_id": "0190c4a0-1111-7000-8000-000000000008",
		"kind": "scale",
		"target": {"service": "billing-worker", "environment": "prod"},
		"risk": {"score": 90, "blast_radius": "region", "reversible": true},
		"principal": {"agent_id": "capacity-bot", "capabilities": []},
		"justification": "autoscaler suggested spike response based on ingress metrics",
	}
	not d.allow
	count(d.reasons) >= 3
}
