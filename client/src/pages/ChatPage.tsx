import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Message, Conversation } from "@shared/schema";

interface ChatPageProps {
  currentModel: "gemini" | "milesai";
}

export default function ChatPage({ currentModel }: ChatPageProps) {
  const [, params] = useRoute("/chat/:id");
  const conversationId = params?.id;
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages for current conversation
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: [`/api/messages/${conversationId}`],
    enabled: !!conversationId,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) throw new Error("No conversation selected");
      return await apiRequest("POST", "/api/messages", {
        conversationId,
        role: "user",
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${conversationId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (content: string) => {
    await sendMessage.mutateAsync(content);
  };

  const handleVoiceToggle = () => {
    setIsVoiceActive(!isVoiceActive);
  };

  // Empty state when no conversation is selected
  if (!conversationId) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Welcome to Dr's Lab
            </h2>
            <p className="text-muted-foreground mb-6">
              {currentModel === "gemini" 
                ? "Your empathetic AI therapist is ready to listen and support you."
                : "Your advanced development assistant is ready to help you code."}
            </p>
            <div className="grid gap-2 text-sm text-left">
              <div className="p-3 rounded-lg border bg-card hover-elevate active-elevate-2 cursor-pointer">
                <p className="font-medium mb-1">
                  {currentModel === "gemini" 
                    ? "Feeling overwhelmed?" 
                    : "Need to build an app?"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {currentModel === "gemini"
                    ? "Let's talk about what's on your mind"
                    : "I can help you write code and debug"}
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-card hover-elevate active-elevate-2 cursor-pointer">
                <p className="font-medium mb-1">
                  {currentModel === "gemini"
                    ? "Want to develop better habits?"
                    : "Stuck on a bug?"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {currentModel === "gemini"
                    ? "We can work together on your goals"
                    : "Share your code and I'll help fix it"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Create a new conversation to get started
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md px-4">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Start the conversation by sending a message
              </p>
            </div>
          </div>
        ) : (
          <div className="py-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} model={currentModel} />
            ))}
            {sendMessage.isPending && (
              <div className="flex gap-3 px-4 py-4">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    {currentModel === "gemini" ? "Gemini" : "MilesAI"}
                  </div>
                  <div className="rounded-2xl rounded-bl-lg px-4 py-3 text-sm bg-card border">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <ChatInput
        onSend={handleSend}
        onVoiceToggle={handleVoiceToggle}
        isVoiceActive={isVoiceActive}
        isLoading={sendMessage.isPending}
        placeholder={
          currentModel === "gemini"
            ? "Share what's on your mind..."
            : "Ask me anything about code..."
        }
      />
    </div>
  );
}
