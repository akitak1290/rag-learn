import { END, START, StateGraph } from "@langchain/langgraph";
import { state as FlowState } from "./state.js";
import { logger } from "../utils/logger.js";
import { MemorySaver } from "@langchain/langgraph-checkpoint";

const checkpointer = new MemorySaver();

const graphBuilder = new StateGraph(FlowState);

// TODO: cleanup
const testNode = (state: typeof FlowState.State) => {
  logger.info("testNode");
  logger.info(state.messages);
  return {};
};

export const graph = graphBuilder
  .addNode("testNode", testNode)
  .addEdge(START, "testNode")
  .addEdge("testNode", END)
  .compile({ checkpointer });
