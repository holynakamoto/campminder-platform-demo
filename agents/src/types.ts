// TS mirror of guardrails/schema/action.schema.json. Kept in sync by hand
// because this is a demo repo and the schema is stable. In a real deployment
// these types would be generated from the JSON Schema at build time.

export type Kind =
  | "deploy"
  | "rollback"
  | "scale"
  | "restart"
  | "mutate_config"
  | "run_migration"
  | "rotate_secret";

export type Environment = "dev" | "staging" | "prod";

export type BlastRadius =
  | "single_pod"
  | "service"
  | "tenant"
  | "region"
  | "global";

export interface AgentAction {
  action_id: string;
  kind: Kind;
  target: {
    service: string;
    environment: Environment;
    region?: string;
  };
  risk: {
    score: number;
    blast_radius: BlastRadius;
    reversible?: boolean;
  };
  principal: {
    agent_id: string;
    capabilities: string[];
    human_approver?: string;
  };
  justification: string;
  change_ticket?: string;
  dry_run?: boolean;
  evidence?: string[];
}

export interface PolicyDecision {
  allow: boolean;
  reasons: string[];
}

export interface Scenario {
  id: string;
  title: string;
  prompt: string;
  mockAction: AgentAction;
}
