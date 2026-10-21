import { getLatestMessage } from "../../utils/annotation.js";
import { logger } from "../../utils/logger.js";
import type { OverrideReason } from "../../utils/type.js";
import { state as FlowState } from "../state.js";

export const overrideNode = (state: typeof FlowState.State) => {
  const latest = getLatestMessage(state);

  if (!latest) {
    return { override: undefined };
  }

  // TODO: potentially can create another override intent
  // classifier here, but may it's better to group with normal
  // intent classifier (TBD) to save tokens
  //
  // for now just do exact matching (not4prod)
  let overrideReason: OverrideReason | undefined;
  switch (latest.content as string) {
    case "cancel":
      overrideReason = "cancel";
      break;
    case "human":
      overrideReason = "human";
      break;
    default:
      break;
  }

  logger.info(
    {
      event: "override_detection_completed",
      overrideReason: overrideReason ?? "",
    },
    "Override detection completed",
  );

  if (overrideReason === "cancel") {
    return {
      override: "cancel" as OverrideReason,
      // clear dialog state
      activeDialog: undefined,
      slots: {},
      awaitingConfirmation: false,
      // return ack instead of calling llm
      response: "Okay, I've canceled that.",
    };
  }

  if (overrideReason === "human") {
    return { override: "human" as OverrideReason };
  }

  return { override: undefined };
};
