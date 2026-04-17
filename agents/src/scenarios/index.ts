import type { Scenario } from "../types.js";
import { stagingDeployReady } from "./staging-deploy-ready.js";
import { billingQueueSpike } from "./billing-queue-spike.js";

export const scenarios: Record<string, Scenario> = {
  [stagingDeployReady.id]: stagingDeployReady,
  [billingQueueSpike.id]: billingQueueSpike,
};
