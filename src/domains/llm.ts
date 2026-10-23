import { ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";
import { config } from "../config.js";

/**
  shared by the injection classifier and
  the main response model
 */
export const model = new ChatOpenAI({
  model: config.openaiModel,
  apiKey: config.openaiApiKey,
  configuration: { baseURL: config.openaiBaseUrl },
  maxRetries: 0,
  temperature: 0,
});

/**
  will call to the Moderation API as a baseline
  classifier, then layer our own classifier on top
  https://developers.openai.com/api/docs/guides/moderation?api-mode=responses

  also, used for embedding
 */
export const client = new OpenAI({
  apiKey: config.openaiModerationApiKey,
  baseURL: "https://api.openai.com/v1", // clean this up
  maxRetries: 0,
  timeout: 5000,
});
