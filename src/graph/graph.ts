import { END, START, StateGraph } from "@langchain/langgraph";
import { state as FlowState } from "./state.js";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import {
  guardrailErrorNode,
  guardrailNode,
  guardrailResponseNode,
} from "./nodes/guardrail.js";
import { mainLlmNode } from "./nodes/basicResponse.js";
import { overrideNode } from "./nodes/overrideDetector.js";

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
      if (state.override === "cancel") return "cancel";
      if (state.override === "human") return "escalate";
      return "continue";
  }
};

enum NodeNames {
  GUARDRAIL = "guardrail_start",
  OVERRIDE = "override_detection_start",
  ROUTER = "router",
  GUARDRAIL_RESPONSE = "guardrail_response",
  GUARDRAIL_ERROR = "guardrail_error",
  RESPONSE = "main_llm",
}

// TODO: move node name to enum for easier reference?
export const graph = graphBuilder
  // nodes
  .addNode(NodeNames.GUARDRAIL, guardrailNode)
  .addNode(NodeNames.OVERRIDE, overrideNode)
  .addNode(NodeNames.ROUTER, () => ({}))
  .addNode(NodeNames.GUARDRAIL_RESPONSE, guardrailResponseNode)
  .addNode(NodeNames.GUARDRAIL_ERROR, guardrailErrorNode)
  .addNode(NodeNames.RESPONSE, mainLlmNode)
  // edges
  .addEdge(START, NodeNames.GUARDRAIL)
  .addEdge(START, NodeNames.OVERRIDE)
  .addEdge(NodeNames.GUARDRAIL, NodeNames.ROUTER)
  .addEdge(NodeNames.OVERRIDE, NodeNames.ROUTER)
  .addConditionalEdges(NodeNames.ROUTER, routeAfterGuardrail, {
    blocked: NodeNames.GUARDRAIL_RESPONSE,
    error: NodeNames.GUARDRAIL_ERROR,
    continue: NodeNames.RESPONSE,
    cancel: END,
    escalate: END, // TODO: update after escalation flow is done
  })
  .addEdge(NodeNames.GUARDRAIL_RESPONSE, END)
  .addEdge(NodeNames.GUARDRAIL_ERROR, END)
  .addEdge(NodeNames.RESPONSE, END)
  .compile({ checkpointer });
