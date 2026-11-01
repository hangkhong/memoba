import type { ComponentType } from "react";
import { AgentRun } from "./agent-run";
import { EditGoesLive } from "./edit-goes-live";
import { MemoryDoor } from "./memory-door";
import { NoneOrFailed } from "./none-or-failed";
import { PipelineVsAgent } from "./pipeline-vs-agent";
import { SeenReadCited } from "./seen-read-cited";
import { TwoSearches } from "./two-searches";

// Every name here is a `<!-- diagram: name -->` marker in docs/engine.
export const engineDiagrams: Readonly<Record<string, ComponentType>> = {
  "pipeline-vs-agent": PipelineVsAgent,
  "two-searches": TwoSearches,
  "agent-run": AgentRun,
  "seen-read-cited": SeenReadCited,
  "none-or-failed": NoneOrFailed,
  "edit-goes-live": EditGoesLive,
  "memory-door": MemoryDoor,
};
