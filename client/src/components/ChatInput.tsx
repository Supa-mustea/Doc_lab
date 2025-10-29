import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onVoiceToggle?: () => void;
  isVoiceActive?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSend, 
  onVoiceToggle,
  isVoiceActive = false,
  isLoading = false,
  placeholder = "Type your message..."
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  return (
    <div className="border-t bg-background p-2 md:p-4">
      <div className="mx-auto max-w-4xl w-full">
        <div className="flex items-end gap-1 md:gap-2">
          {onVoiceToggle && (
            <Button
              size="icon"
              variant={isVoiceActive ? "default" : "outline"}
              onClick={onVoiceToggle}
              disabled={isLoading}
              data-testid="button-voice-toggle"
              className={cn(
                "h-9 w-9 md:h-10 md:w-10 shrink-0",
                isVoiceActive && "animate-pulse"
              )}
            >
              {isVoiceActive ? <MicOff className="h-3 w-3 md:h-4 md:w-4" /> : <Mic className="h-3 w-3 md:h-4 md:w-4" />}
            </Button>
          )}
          
          <div className="flex-1 flex items-end gap-1 md:gap-2 rounded-lg border bg-card p-1.5 md:p-2">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              data-testid="input-chat-message"
              className="min-h-[36px] md:min-h-[40px] max-h-[150px] md:max-h-[200px] resize-none border-0 focus-visible:ring-0 p-1.5 md:p-2 text-sm md:text-base"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              data-testid="button-send-message"
              className="h-8 w-8 md:h-10 md:w-10 shrink-0"
            >
              <Send className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
