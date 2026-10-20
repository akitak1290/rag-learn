import { Annotation } from "@langchain/langgraph";

export const state = Annotation.Root({
  messages: Annotation<string[]>({
    reducer: (left: string[], right: string | string[]): string[] => {
      if (Array.isArray(right)) return left.concat(right);
      else return left.concat([right]);
    },
    default: () => [],
  }),
  // TODO: add other states
});
