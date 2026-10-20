import { moderationClient } from "../../domains/llm.js";
import { state as FlowState } from "../state.js";
import { logger } from "../../utils/logger.js";
import { classifyInjection } from "./guardrailClassifier.js";

const GUARDRAIL_TIMEOUT_MS = 20000;

const severeCategories = new Set([
  "violence",
  "violence/graphic",
  "sexual/minors",
  "self-harm",
  "self-harm/intent",
  "self-harm/instructions",
]);

export type GuardrailResult = {
  verdict: "pass" | "flag" | "block" | "unavailable";
  violations: Array<{
    source: "moderation" | "prompt_injection";
    type: string;
    score: number | null;
  }>;
  reason?: "timeout" | "api_error";
};

/**
 * guardrail logic to process use message
 * by passing it through Moderation API
 * and our own classifier
 */
async function runGuardrails(message: string): Promise<GuardrailResult> {
  // set a timeout for llm api call with abort signal
  // https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal#examples
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error("GUARDRAIL_TIMEOUT"));
    }, GUARDRAIL_TIMEOUT_MS);
  });

  try {
    // run both Moderation API and our
    // predefined classifier in parallel
    const checks = Promise.all([
      moderationClient.moderations.create(
        {
          model: "omni-moderation-latest",
          input: message,
        },
        { signal: controller.signal },
      ),
      classifyInjection(message, controller.signal),
    ]);

    const [moderation, injection] = await Promise.race([checks, timeout]);

    const result = moderation.results[0];

    if (!result) {
      // result is undefined, manual check
      logger.warn(
        {
          event: "unavailable",
        },
        "issue with moderation api or classifier",
      );

      return {
        verdict: "unavailable",
        violations: [],
      };
    }

    const violations: GuardrailResult["violations"] = [];

    for (const [category, flagged] of Object.entries(result.categories)) {
      if (flagged) {
        violations.push({
          source: "moderation",
          type: category,
          score:
            result.category_scores[
              category as keyof typeof result.category_scores
            ] ?? null,
        });
      }
    }

    if (injection.injection) {
      violations.push({
        source: "prompt_injection",
        type: injection.type,
        score: injection.score,
      });

      logger.warn({
        injection,
      });
    }

    const hasSevereCategory = violations.some(
      (v) => v.source === "moderation" && severeCategories.has(v.type),
    );

    const shouldBlockInjection = injection.injection && injection.score >= 0.9;

    const verdict =
      hasSevereCategory || shouldBlockInjection
        ? "block"
        : violations.length > 0
          ? "flag"
          : "pass";

    // Log classifications only; never log message text.
    logger.info(
      {
        event: "guardrail_completed",
        verdict,
        categories: violations.map((v) => ({
          source: v.source,
          type: v.type,
        })),
      },
      "Guardrail completed",
    );

    return { verdict, violations };
  } catch (err) {
    controller.abort();

    const reason = timedOut ? "timeout" : "api_error";

    logger.warn(
      { event: "guardrail_unavailable", reason, err },
      "Guardrail unavailable",
    );

    return {
      verdict: "unavailable",
      violations: [],
      reason,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export const guardrailNode = async (state: typeof FlowState.State) => {
  const latest = state.messages[state.messages.length - 1];
  if (!latest) return {};

  return {
    guardrail: await runGuardrails(latest),
  };
};
export const guardrailResponseNode = async () => ({
  response: "I can't help with that request.",
});

export const guardrailErrorNode = async () => ({
  response:
    "Sorry, I'm having trouble right now. Please try again in a moment.",
});
