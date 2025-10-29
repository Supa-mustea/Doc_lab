import { type Message } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
  model: "gemini" | "milesai";
}

export function ChatMessage({ message, model }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isGemini = model === "gemini";

  return (
    <div
      className={cn(
        "flex gap-2 md:gap-3 px-2 md:px-4 py-3 md:py-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      data-testid={`message-${message.id}`}
    >
      <Avatar className="h-7 w-7 md:h-9 md:w-9 flex-shrink-0">
        <AvatarFallback className={cn(
          isUser 
            ? "bg-primary text-primary-foreground" 
            : isGemini 
              ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white"
              : "bg-gradient-to-br from-emerald-500 to-teal-500 text-white"
        )}>
          {isUser ? <User className="h-3 w-3 md:h-4 md:w-4" /> : <Bot className="h-3 w-3 md:h-4 md:w-4" />}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex flex-col gap-1 max-w-[85%] md:max-w-2xl",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div className="text-xs font-medium text-muted-foreground">
          {isUser ? "You" : isGemini ? "Gemini" : "MilesAI"}
        </div>
        <div
          className={cn(
            "rounded-2xl px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-lg"
              : "bg-card border rounded-bl-lg"
          )}
          data-testid={`message-content-${message.id}`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </div>
  );
}
