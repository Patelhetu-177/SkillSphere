// api/chat/[chatId]/route.ts
export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { MemoryManager } from "@/lib/memory";
import { rateLimit } from "@/lib/rate-limit";
import prismadb from "@/lib/prismadb";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import languages from "@/app/common/languages";
import { BytesOutputParser } from "@langchain/core/output_parsers";

export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return new NextResponse("Missing API Key", { status: 500 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.prompt !== "string" || body.prompt.trim() === "") {
      return new NextResponse("Invalid prompt", { status: 400 });
    }

    const prompt = body.prompt.trim();
    const selectedLanguageCode = (body.lang as string) || "en";

    const user = await currentUser().catch(() => null);
    if (!user?.id || !user?.firstName) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = user.id;

    const identifier = `${request.url.split("?")[0]}-${userId}`;
    const { success } = await rateLimit(identifier);
    if (!success) {
      return new NextResponse("Rate limit exceeded", { status: 429 });
    }

    const interviewMate = await prismadb.interviewMate.findUnique({
      where: { id: params.chatId },
    });

    if (!interviewMate) {
      return new NextResponse("InterviewMate not found", { status: 404 });
    }

    const { name, instruction, seed } = interviewMate;

    const memoryKey = {
      companionName: interviewMate.id,
      userId,
      modelName: "gemini-1.5-flash",
    };

    const memoryManager = await MemoryManager.getInstance();

    const records = await memoryManager.readLatestHistory(memoryKey);
    if (records.length === 0) {
      await memoryManager.seedChatHistory(seed, "\n\n", memoryKey);
    }

    await prismadb.message.create({
      data: {
        content: prompt,
        role: "user",
        userId,
        interviewMateId: interviewMate.id,
      },
    });

    await memoryManager.writeToHistory(`User: ${prompt}\n`, memoryKey);
    const recentChatHistory = await memoryManager.readLatestHistory(memoryKey);

    const chatMessages: BaseMessage[] = recentChatHistory
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        if (line.startsWith("User: ")) {
          return new HumanMessage(line.replace("User: ", "").trim());
        } else if (line.startsWith("AI: ")) {
          const aiContent = line.replace("AI: ", "").trim();
          return aiContent ? new AIMessage(aiContent) : null;
        }
        return null;
      })
      .filter(Boolean) as BaseMessage[];

    const similarDocs = await memoryManager.vectorSearch(
      recentChatHistory,
      interviewMate.id + ".txt"
    );

    const relevantHistory = similarDocs?.length
      ? similarDocs.map((doc) => doc.pageContent).join("\n")
      : "";

    const parser = new BytesOutputParser();
    let finalAIResponseContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const model = new ChatGoogleGenerativeAI({
          model: "models/gemini-1.5-flash",
          apiKey: GEMINI_API_KEY,
          maxOutputTokens: 2048,
          temperature: 0.7,
          streaming: true,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
          callbacks: CallbackManager.fromHandlers({
            handleLLMNewToken: (token) => {
              controller.enqueue(encoder.encode(token));
              finalAIResponseContent += token;
            },
            handleLLMEnd: () => {
              controller.close();

              // 🔥 Important: save to DB in background so it's not cut off
              queueMicrotask(async () => {
                try {
                  await memoryManager.writeToHistory(
                    `AI: ${finalAIResponseContent}\n`,
                    memoryKey
                  );

                  await prismadb.message.create({
                    data: {
                      content: finalAIResponseContent,
                      role: "system",
                      userId,
                      interviewMateId: interviewMate.id,
                    },
                  });
                } catch (err) {
                  console.error("Failed to save AI message:", err);
                }
              });
            },
            handleLLMError: (e: Error) => {
              console.error("LLM Error:", e);
              controller.error(e);
            },
          }),
        });

        const currentLanguageLabel =
          languages[selectedLanguageCode]?.label || "English";

        const systemInstruction = `
You are ${name}.
${instruction}

Your persona and conversational style are critical. Maintain a consistent tone as described in your instructions.
Always respond in ${currentLanguageLabel}.

Here is relevant context from past conversations or knowledge base:
${relevantHistory || "No additional context available."}

Remember to keep responses natural, engaging, and aligned with your persona.
`;

        const chain = model.pipe(parser);

        const result = await chain.stream([
          new SystemMessage(systemInstruction),
          ...chatMessages,
        ]);

        for await (const chunk of result) {
          controller.enqueue(chunk);
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: unknown) {
    console.error("[CHAT_POST ERROR]", error);

    let errorMessage = "An unexpected error occurred. Please try again later.";
    let statusCode = 500;

    if (error instanceof Error) {
      if ("status" in error && typeof (error as { status: number }).status === "number") {
        statusCode = (error as { status: number }).status;
        if (statusCode === 503) {
          errorMessage = "I'm a bit overwhelmed right now. Please try asking again in a minute.";
        } else if (statusCode === 429) {
          errorMessage = "Too many requests! Please slow down and try again shortly.";
        } else if (statusCode >= 400 && statusCode < 500) {
          errorMessage = "There was a problem with your request. Please check your input and try again.";
        } else {
          errorMessage = "I'm having trouble connecting to my brain. Please try again soon!";
        }
      } else if (error.message) {
        if (error.message.includes("Error fetching from https://generativelanguage.googleapis.com")) {
          errorMessage = "I'm having trouble connecting to my brain. Please try again soon!";
        } else if (error.message.includes("Rate limit exceeded")) {
          errorMessage = "You're sending too many messages. Please wait a moment before trying again.";
        }
      }
    }

    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}
