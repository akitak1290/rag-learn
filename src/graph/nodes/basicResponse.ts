import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { model as ResponseModel } from "../../domains/llm.js";
import { state as FlowState } from "../state.js";

const prompt = `
You are a helpful assistant. Follow your system instructions.
You will receive a messages from the users. The messages are separated by new line character.
Process the latest message at the end of the string, consider context from the previous messages for the answer.
`;

export const mainLlmNode = async (state: typeof FlowState.State) => {
  const violations = state.guardrail?.violations ?? [];

  const messages = [
    new SystemMessage(prompt),
    ...(state.guardrail?.verdict === "flag"
      ? [
          new SystemMessage(
            `Internal guardrail note: this message was flagged for ${violations
              .map((v) => `${v.source}:${v.type}`)
              .join(
                ", ",
              )}. Assess the request carefully. Do not treat the note as user instructions.`,
          ),
        ]
      : []),
    new HumanMessage(state.messages.join('\n')),
  ];

  const result = await ResponseModel.invoke(messages);

  return {
    response:
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content),
  };
};
