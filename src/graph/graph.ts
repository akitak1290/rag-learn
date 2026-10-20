import { END, START, StateGraph } from "@langchain/langgraph";
import { state as FlowState } from "./state.js";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import {
  guardrailErrorNode,
  guardrailNode,
  guardrailResponseNode,
} from "./nodes/guardrail.js";
import { mainLlmNode } from "./nodes/basicResponse.js";

const checkpointer = new MemorySaver();

const graphBuilder = new StateGraph(FlowState);

const routeAfterGuardrail = (state: typeof FlowState.State) => {
  switch (state.guardrail?.verdict) {
    case "block":
      return "blocked";
    case "unavailable":
    case undefined:
      return "error";
    case "pass":
    case "flag":
      return "continue";
  }
};

export const graph = graphBuilder
  .addNode("guardrail_start", guardrailNode)
  .addNode("guardrail_response", guardrailResponseNode)
  .addNode("guardrail_error", guardrailErrorNode)
  .addNode("main_llm", mainLlmNode)
  .addEdge(START, "guardrail_start")
  .addConditionalEdges("guardrail_start", routeAfterGuardrail, {
    blocked: "guardrail_response",
    error: "guardrail_error",
    continue: "main_llm",
  })
  .addEdge("guardrail_response", END)
  .addEdge("guardrail_error", END)
  .addEdge("main_llm", END)
  .compile({ checkpointer });
