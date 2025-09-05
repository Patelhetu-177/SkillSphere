// app/chat/[chatId]/page.tsx
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ChatClient } from "./components/client";
import { InterviewMate, Message, Prisma } from "@prisma/client";

interface ChatIdPageProps {
  params: {
    chatId: string;
  };
}

type AiEntityWithRelations = InterviewMate & {
  messages: Message[];
  _count: { messages: number };
};

const ChatIdPage = async ({ params }: ChatIdPageProps) => {
  const { userId } = auth();

  if (!userId) {
    return redirect("/sign-in");
  }

  const includeOptions = {
    messages: {
      orderBy: {
        createdAt: Prisma.SortOrder.asc,
      },
      where: {
        userId,
      },
    },
    _count: {
      select: {
        messages: true,
      },
    },
  };

  const fetchedInterviewMate = await prismadb.interviewMate.findUnique({
    where: { id: params.chatId },
    include: includeOptions,
  });

  if (!fetchedInterviewMate) {
    return redirect("/");
  }

  return (
    <ChatClient
      initialData={fetchedInterviewMate as AiEntityWithRelations}
      aiType="interviewMate"
    />
  );
};

export default ChatIdPage;
