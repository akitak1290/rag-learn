export type DialogName = "report_issue" | "check_status";

// for intent classifier
export type Intent =
  "info_qa" | "report_issue" | "check_status" | "cancel" | "human";

// for override detection node
// which will run first before intent classifier
export type OverrideReason = "cancel" | "human";

export type FaqInput = {
  question: string;
  answer: string;
  url: string;
};

export type DocumentInput = {
  title: string;
  url: string;
  text: string;
};
