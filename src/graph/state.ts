import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import type { GuardrailResult } from "./nodes/guardrail.js";

export const state = Annotation.Root({
  ...MessagesAnnotation.spec,
  guardrail: Annotation<GuardrailResult | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
  response: Annotation<string | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
});
