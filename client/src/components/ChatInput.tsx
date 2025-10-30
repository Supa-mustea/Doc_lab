import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, MicOff, Paperclip, Image as ImageIcon } from "lucide-react";
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
        <div className="flex items-end gap-2">
          <div className="flex-1 flex flex-col gap-2 rounded-2xl border bg-card p-2">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              data-testid="input-chat-message"
              className="min-h-[40px] max-h-[150px] md:max-h-[200px] resize-none border-0 focus-visible:ring-0 p-2 text-sm md:text-base bg-transparent"
              rows={1}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isLoading}
                  className="h-8 w-8 rounded-full hover:bg-muted"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isLoading}
                  className="h-8 w-8 rounded-full hover:bg-muted"
                  title="Upload image"
                >
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
                {onVoiceToggle && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onVoiceToggle}
                    disabled={isLoading}
                    data-testid="button-voice-toggle"
                    className={cn(
                      "h-8 w-8 rounded-full hover:bg-muted",
                      isVoiceActive && "animate-pulse bg-muted"
                    )}
                    title={isVoiceActive ? "Stop recording" : "Start voice input"}
                  >
                    {isVoiceActive ? <MicOff className="h-4 w-4 text-muted-foreground" /> : <Mic className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                )}
              </div>
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!message.trim() || isLoading}
                data-testid="button-send-message"
                className="h-8 w-8 rounded-full shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
