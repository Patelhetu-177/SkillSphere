"use client";

import { ChatHeader } from "@/components/chat-header";
import { Message, InterviewMate } from "@prisma/client";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useEffect} from "react";
import { ChatForm } from "@/components/chat-form";
import { ChatMessages } from "@/components/chat-messages";
import { ChatMessageProps } from "@/components/chat-message";
import LanguageDropdown from "./LanguageDropdown";
import i18n from "@/lib/i18n";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";

type AiEntity =
 
  | (InterviewMate & {
      messages: Message[];
      _count: { messages: number };
    });

interface ChatClientProps {
  initialData: AiEntity;
  aiType:  "interviewMate";
}

export const ChatClient = ({ initialData, aiType }: ChatClientProps) => {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessageProps[]>(
    initialData.messages.map((msg) => ({
      id: msg.id,
      role: msg.role === "user" ? "user" : "system",
      content: msg.content,
    }))
  );
  const [currentLanguage, setCurrentLanguage] = useState<string>("en");
  const [isLoadingResponse, setIsLoadingResponse] = useState<boolean>(false);
  const [showTypingIndicator, setShowTypingIndicator] =
    useState<boolean>(false);

  const [input, setInput] = useState<string>("");
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setInput(e.target.value);
  };

  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLanguage(i18n.language);
    };
    i18n.on("languageChanged", handleLanguageChange);

    setCurrentLanguage(i18n.language);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const userMessage: ChatMessageProps = {
      role: "user",
      content: input,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");

    setIsLoadingResponse(true);
    setShowTypingIndicator(true);

    let accumulatedResponse = "";
    let messageIndexToUpdate = -1;

    setMessages((current) => {
      const newMessages = [
        ...current,
        { role: "system", content: "" } as ChatMessageProps,
      ];
      messageIndexToUpdate = newMessages.length - 1;
      return newMessages;
    });

    try {
      if (!navigator.onLine) {
        throw new Error("You are offline. Please check your internet connection.");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`/api/chat/${initialData.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          lang: currentLanguage,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Could not get reader for response body.");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        accumulatedResponse += chunk;

        setMessages((current) => {
          if (messageIndexToUpdate !== -1 && current[messageIndexToUpdate]) {
            const updatedMessages = [...current];
            updatedMessages[messageIndexToUpdate] = {
              ...updatedMessages[messageIndexToUpdate],
              content: accumulatedResponse,
            } as ChatMessageProps;
            return updatedMessages;
          }
          return current;
        });
      }
    } catch (error: unknown) {
      console.error("Error sending message or processing stream:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Request timed out. Please try again.";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Unable to connect to the server. Please check your internet connection.";
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      console.error('Full error details:', error);
      toast({
        variant: "destructive",
        description: `Failed to get response: ${errorMessage}`,
        duration: 5000,
      });
      setMessages((current) => {
        if (messageIndexToUpdate !== -1 && current[messageIndexToUpdate]) {
          const updatedMessages = [...current];
          updatedMessages[messageIndexToUpdate] = {
            ...updatedMessages[messageIndexToUpdate],
            content: `Error: ${errorMessage}`,
            isError: true,
          } as ChatMessageProps;
          return updatedMessages;
        }
        return [
          ...current,
          {
            role: "system",
            content: `Error: ${errorMessage}`,
            isError: true,
          } as ChatMessageProps,
        ];
      });
    } finally {
      setIsLoadingResponse(false);
      setShowTypingIndicator(false);
      router.refresh();
    }
  };

  const onDeleteMessage = async (messageId: string) => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        description: "You must be logged in to delete messages.",
        duration: 3000,
      });
      return;
    }

    try {
      const response = await fetch(`/api/chat/message/${messageId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to delete message: ${response.statusText}`
        );
      }

      toast({
        description: "Message deleted successfully.",
        duration: 3000,
      });

      setMessages((current) => current.filter((msg) => msg.id !== messageId));
      router.refresh();
    } catch (error: unknown) {
      // Changed to unknown
      console.error("Error deleting message:", error);
      let errorMessage = "Unknown error.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        variant: "destructive",
        description: `Failed to delete message: ${errorMessage}`,
        duration: 5000,
      });
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-2">
      <div className="flex justify-between items-center mb-4">
        <ChatHeader companion={initialData} aiType={aiType} />
        <LanguageDropdown />
      </div>
      <ChatMessages
        companion={initialData}
        isLoading={showTypingIndicator}
        messages={messages}
        onDelete={onDeleteMessage}
      />
      <ChatForm
        isLoading={isLoadingResponse}
        input={input}
        handleInputChange={handleInputChange}
        onSubmit={onSubmit}
      />
    </div>
  );
};
