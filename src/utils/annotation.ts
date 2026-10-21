import { HumanMessage } from "@langchain/core/messages";
import { state as FlowState } from "../graph/state.js";

export const getLatestMessage = (state: typeof FlowState.State) =>
  [...state.messages].reverse().find(HumanMessage.isInstance);
