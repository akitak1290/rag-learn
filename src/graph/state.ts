import { Annotation } from "@langchain/langgraph";
import type { GuardrailResult } from "./nodes/guardrail.js";

export const state = Annotation.Root({
  // TODO: replace with role-based message
  // to store query-response 
  // ...MessagesAnnotation.spec,
  messages: Annotation<string[]>({
    reducer: (left: string[], right: string | string[]): string[] => {
      if (Array.isArray(right)) return left.concat(right);
      else return left.concat([right]);
    },
    default: () => [],
  }),
  guardrail: Annotation<GuardrailResult | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
  response: Annotation<string | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
});
