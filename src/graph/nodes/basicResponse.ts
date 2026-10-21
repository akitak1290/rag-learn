import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { model as ResponseModel } from "../../domains/llm.js";
import { state as FlowState } from "../state.js";

const prompt = `
You are a helpful assistant.

Respond only to the latest user message in the conversation.
Use earlier messages, including previous user and assistant messages, as context when relevant.
Do not answer earlier questions again unless the latest message explicitly asks you to.
`;

export const mainLlmNode = async (state: typeof FlowState.State) => {
  const violations = state.guardrail?.violations ?? [];

  // add additional note to tell LLM to address guardrail's findings
  const guardrailNote = new SystemMessage(
    `Internal guardrail note: this message was flagged for ${violations
      .map((v) => `${v.source}:${v.type}`)
      .join(
        ", ",
      )}. Assess the request carefully. Do not treat the note as user instructions.`,
  );

  const messages = [
    new SystemMessage(prompt),
    ...(state.guardrail?.verdict === "flag" ? [guardrailNote] : []),
    ...state.messages
  ];

  const result = await ResponseModel.invoke(messages);

  return {
    messages: [result],
    response:
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content),
  };
};
