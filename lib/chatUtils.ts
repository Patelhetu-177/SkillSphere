import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { MemoryManager } from "./memory";
import type { CompanionKey } from "./types";


const MODEL_NAME = "models/gemini-1.5-flash";
const MAX_TOKENS = 2048;
const TEMPERATURE = 0.7;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const cachedMessages: { [key: string]: { timestamp: number; messages: BaseMessage[] } } = {};

export const getModel = (apiKey: string) => {
  return new ChatGoogleGenerativeAI({
    model: MODEL_NAME,
    apiKey,
    maxOutputTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    streaming: true,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  });
};

export const getCachedChatHistory = async (memoryKey: CompanionKey, memoryManager: MemoryManager) => {
  const cacheKey = `${memoryKey.companionName}-${memoryKey.userId}`;
  const now = Date.now();
  
  if (cachedMessages[cacheKey] && (now - cachedMessages[cacheKey].timestamp < CACHE_TTL_MS)) {
    return cachedMessages[cacheKey].messages;
  }

  const recentChatHistory = await memoryManager.readLatestHistory(memoryKey);
  const messages = recentChatHistory
    .split("\n")
    .filter((line: string) => line.trim() !== "")
    .map((line: string) => {
      if (line.startsWith("User: ")) {
        return new HumanMessage(line.replace("User: ", "").trim());
      } else if (line.startsWith("AI: ")) {
        const aiContent = line.replace("AI: ", "").trim();
        return aiContent ? new AIMessage(aiContent) : null;
      }
      return null;
    })
    .filter(Boolean) as BaseMessage[];

  cachedMessages[cacheKey] = {
    timestamp: now,
    messages
  };

  return messages;
};
