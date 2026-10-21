import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import type { GuardrailResult } from "./nodes/guardrail.js";
import type { DialogName, Intent, OverrideReason } from "../utils/type.js";

export const state = Annotation.Root({
  // messages between users/llm
  ...MessagesAnnotation.spec,
  // guardrail metadata
  guardrail: Annotation<GuardrailResult | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
  // llm latest response, for convenience sake
  response: Annotation<string | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
  // TODO: capture the intent of user to route to correct flow
  // intent: Annotation<Intent | undefined>({
  //   reducer: (_, update) => update,
  //   default: () => undefined,
  // }),
  override: Annotation<OverrideReason| undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
  // current dialog flow
  activeDialog: Annotation<DialogName | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
  // metadata for the current dialog flow
  slots: Annotation<Record<string, unknown>>({
    reducer: (_, update) => update,
    default: () => ({}),
  }),
  awaitingConfirmation: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false,
  }),
});
