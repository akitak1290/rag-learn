import { END, START, StateGraph } from "@langchain/langgraph";
import { state as FlowState } from "./state.js";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import {
  guardrailErrorNode,
  guardrailNode,
  guardrailResponseNode,
} from "./nodes/guardrail.js";
import { supervisorNode, tools } from "./nodes/supervisor.js";
import { overrideNode } from "./nodes/overrideDetector.js";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";

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

const routeBeforeSupervisor = (state: typeof FlowState.State) => {
  if (state.activeDialog) {
    return "dialog";
  } else {
    return "supervisor";
  }
};

enum NodeNames {
  GUARDRAIL = "guardrail_start",
  OVERRIDE = "override_detection_start",
  ROUTER = "router",
  GUARDRAIL_RESPONSE = "guardrail_response",
  GUARDRAIL_ERROR = "guardrail_error",
  RESPONSE = "main_llm",
  PRE_CHECK = "pre_check_router",
  DIALOG = "dialog",
  SUPERVISOR = "supervisor",
  TOOLS = "tools",
}

export const graph = graphBuilder
  // nodes
  .addNode(NodeNames.GUARDRAIL, guardrailNode)
  .addNode(NodeNames.OVERRIDE, overrideNode)
  .addNode(NodeNames.ROUTER, () => ({}))
  .addNode(NodeNames.GUARDRAIL_RESPONSE, guardrailResponseNode)
  .addNode(NodeNames.GUARDRAIL_ERROR, guardrailErrorNode)
  .addNode(NodeNames.PRE_CHECK, () => ({}))
  .addNode(NodeNames.DIALOG, () => ({})) // TODO: update after dialog flow is done
  .addNode(NodeNames.SUPERVISOR, supervisorNode)
  .addNode(NodeNames.TOOLS, new ToolNode(tools))
  // edges
  .addEdge(START, NodeNames.GUARDRAIL)
  .addEdge(START, NodeNames.OVERRIDE)
  .addEdge(NodeNames.GUARDRAIL, NodeNames.ROUTER)
  .addEdge(NodeNames.OVERRIDE, NodeNames.ROUTER)
  .addConditionalEdges(NodeNames.ROUTER, routeAfterGuardrail, {
    blocked: NodeNames.GUARDRAIL_RESPONSE,
    error: NodeNames.GUARDRAIL_ERROR,
    continue: NodeNames.PRE_CHECK,
    cancel: END,
    escalate: END, // TODO: update after escalation flow is done
  })
  .addConditionalEdges(NodeNames.PRE_CHECK, routeBeforeSupervisor, {
    dialog: NodeNames.DIALOG,
    supervisor: NodeNames.SUPERVISOR,
  })
  .addConditionalEdges(NodeNames.SUPERVISOR, toolsCondition, {
    tools: NodeNames.TOOLS,
    [END]: END,
  })
  .addEdge(NodeNames.TOOLS, NodeNames.SUPERVISOR)
  // terminals
  .addEdge(NodeNames.GUARDRAIL_RESPONSE, END)
  .addEdge(NodeNames.GUARDRAIL_ERROR, END)
  .addEdge(NodeNames.DIALOG, END)
  .addEdge(NodeNames.SUPERVISOR, END)
  .compile({ checkpointer });
