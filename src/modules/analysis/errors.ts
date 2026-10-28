export class ModelCallError extends Error {
  constructor(public readonly code: "MODEL_RATE_LIMITED" | "MODEL_UNAVAILABLE" | "MODEL_FAILED") { super(code); }
}
