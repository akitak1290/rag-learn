import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { model as ResponseModel } from "../../domains/llm.js";
import { state as FlowState } from "../state.js";
import { logger } from "../../utils/logger.js";
import { getLatestMessage } from "../../utils/annotation.js";

const prompt = `
You are a helpful assistant.

Respond only to the latest user message in the conversation.
Use earlier messages, including previous user and assistant messages, as context when relevant.
Do not answer earlier questions again unless the latest message explicitly asks you to.
`;

import { tool } from "@langchain/core/tools";
import { z } from "zod";

// TODO: update these to call to respective services per tool
// for now return a static response
const searchFaq = tool(
  async ({ query }) => {
    return `Placeholder FAQ result for: ${query}`;
  },
  {
    name: "search_faq",
    description: "Search public agency FAQs and help pages.",
    schema: z.object({
      query: z.string(),
    }),
  },
);

const checkStatus = tool(
  async ({ caseReference }) => {
    return `Placeholder status for case: ${caseReference}`;
  },
  {
    name: "check_status",
    description: "Check the status of an existing case.",
    schema: z.object({
      caseReference: z.string(),
    }),
  },
);

// TODO: need to refactor these tools out
export const tools = [searchFaq, checkStatus];

const SupervisorModel = ResponseModel.bindTools(tools);

export const supervisorNode = async (state: typeof FlowState.State) => {
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
    ...state.messages,
  ];

  const result = await SupervisorModel.invoke(messages);

  logger.info(
    {
      event: "supervisor_completed",
      userQuery: getLatestMessage(state),
      toolCalls: result.tool_calls?.map((call) => call.name) ?? "",
      llmResponse: JSON.stringify(result.content),
    },
    "Supervisor invocation completed",
  );

  // 1. The graph will execute these tools next.
  if (result.tool_calls && result.tool_calls.length > 0) {
    return { messages: [result] };
  }

  // 2. The graph will return user-facing messages
  return {
    messages: [result],
    response:
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content),
  };
};
