
import React, { useEffect, useRef } from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import type { Message } from '../App';
import { LogoIcon } from './icons';

interface MainContentProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (prompt: string, image?: { data: string; mimeType: string }) => void;
  isConversationMode: boolean;
  autoListenTrigger: number;
  theme: string;
}

const MainContent: React.FC<MainContentProps> = ({ messages, isLoading, onSend, isConversationMode, autoListenTrigger, theme }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const EmptyState: React.FC<{ onSend: (prompt: string) => void }> = ({ onSend }) => {
    const examplePrompts = [
      "Act as a therapist and help me with stress management techniques.",
      "Write a Python script to scrape headlines from a news website.",
      "What are some core strategies for building long-term wealth?",
      "Explain the concept of 'love-amplified consciousness' to me."
    ];

    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-4">
        <LogoIcon className="w-20 h-20 mb-6 text-indigo-300 dark:text-indigo-500" />
        <h2 className="text-3xl font-bold text-slate-700 dark:text-slate-200">Hello, I'm Mustea</h2>
        <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-400">
          Your personal AI assistant for emotional growth, financial strategy, coding, and more. I'm here to help you learn, grow, and achieve your goals.
        </p>
        <div className="mt-8 w-full max-w-2xl">
            <h3 className="font-semibold text-slate-600 dark:text-slate-300 mb-4">Try one of these prompts to get started:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {examplePrompts.map((prompt, index) => (
                <button 
                  key={index}
                  onClick={() => onSend(prompt)}
                  className="p-4 bg-slate-100 dark:bg-slate-800/80 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <p className="font-medium text-sm text-slate-700 dark:text-slate-200">{prompt}</p>
                </button>
              ))}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
       <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 && !isLoading ? (
          <EmptyState onSend={onSend} />
        ) : (
          <>
            {messages.map((msg, index) => (
              <ChatMessage 
                key={index} 
                message={msg.text} 
                isUser={msg.isUser}
                imageUrl={msg.imageUrl}
                uploadedImageUrl={msg.uploadedImageUrl}
                theme={theme}
                timestamp={msg.timestamp}
              />
            ))}
             {isLoading && <ChatMessage message="" isUser={false} isLoading={true} theme={theme} />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      <div className="w-full p-4 sm:p-6 bg-transparent">
        <div className="max-w-4xl mx-auto">
          <ChatInput 
              onSend={onSend} 
              disabled={isLoading} 
              isConversationMode={isConversationMode} 
              autoListenTrigger={autoListenTrigger}
          />
        </div>
      </div>
    </div>
  );
};

export default MainContent;
