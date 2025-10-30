
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Message, Conversation } from "@shared/schema";
import { AppSidebar } from "@/components/AppSidebar";
import { 
  Menu, Download, Sun, Moon, MessageCircle, Code2, 
  Settings, Plus, Volume2, VolumeX 
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface ChatPageProps {
  currentModel: "gemini" | "milesai";
  onModelChange: (model: "gemini" | "milesai") => void;
  conversations: Conversation[];
  onNewConversation: () => void;
  currentView: 'chat' | 'studio';
  onSetView: (view: 'chat' | 'studio') => void;
}

export default function ChatPage({ 
  currentModel, 
  onModelChange, 
  conversations,
  onNewConversation,
  currentView,
  onSetView
}: ChatPageProps) {
  const [, params] = useRoute("/chat/:id");
  const conversationId = params?.id;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [responseMode, setResponseMode] = useState<'text' | 'voice'>('text');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: [`/api/messages/${conversationId}`],
    enabled: !!conversationId,
  });

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content: string) => {
    await sendMessage.mutateAsync(content);
  };

  const handleDownloadChat = () => {
    const formattedHistory = messages.map(msg => {
      const sender = msg.role === 'user' ? 'User' : currentModel === 'gemini' ? 'Gemini' : 'MilesAI';
      const timestamp = new Date(msg.createdAt).toLocaleString();
      return `[${timestamp}] ${sender}:\n${msg.content}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([formattedHistory], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-history-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity md:hidden ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />
      
      {/* Sidebar */}
      <aside className={`fixed md:static top-0 left-0 w-72 h-full bg-slate-50 dark:bg-slate-900 z-50 flex flex-col justify-between p-4 border-r border-slate-200 dark:border-slate-800 transition-transform md:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="flex items-center justify-between gap-2 px-2 pb-6 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">Dr</div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Dr's Lab AI</h1>
            </div>
            <button onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* View Switcher */}
          <div className="space-y-2 mb-6">
            <button 
              onClick={() => { onSetView('chat'); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center p-3 rounded-lg transition-colors ${currentView === 'chat' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}
            >
              <MessageCircle className="w-5 h-5 mr-3" />
              <span className="font-medium">Chat</span>
            </button>
            <button 
              onClick={() => { onSetView('studio'); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center p-3 rounded-lg transition-colors ${currentView === 'studio' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}
            >
              <Code2 className="w-5 h-5 mr-3" />
              <span className="font-medium">Studio</span>
            </button>
          </div>

          {/* Model Selector */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">Model</label>
            <div className="space-y-1">
              <button
                onClick={() => onModelChange("gemini")}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${currentModel === "gemini" ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
              >
                <div className="flex items-center">
                  <MessageCircle className="w-5 h-5 mr-3" />
                  <span className="font-medium">DOC</span>
                </div>
                <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">Therapy</span>
              </button>
              <button
                onClick={() => onModelChange("milesai")}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${currentModel === "milesai" ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
              >
                <div className="flex items-center">
                  <Code2 className="w-5 h-5 mr-3" />
                  <span className="font-medium">MilesAI</span>
                </div>
                <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">Dev</span>
              </button>
            </div>
          </div>

          <button 
            onClick={onNewConversation} 
            className="w-full flex items-center p-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors text-gray-700 dark:text-gray-300"
          >
            <Plus className="w-5 h-5 mr-3" />
            <span className="font-medium">New Chat</span>
          </button>
        </div>
        
        {/* Bottom Controls */}
        <div className="space-y-2">
          <button
            onClick={() => setResponseMode(prev => prev === 'text' ? 'voice' : 'text')}
            className="w-full flex items-center p-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors text-gray-700 dark:text-gray-300"
          >
            {responseMode === 'text' ? <VolumeX className="w-5 h-5 mr-3" /> : <Volume2 className="w-5 h-5 mr-3" />}
            <span className="font-medium">Voice Output</span>
          </button>
          <button
            onClick={handleDownloadChat}
            disabled={!conversationId || messages.length === 0}
            className="w-full flex items-center p-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            <Download className="w-5 h-5 mr-3" />
            <span className="font-medium">Download Chat</span>
          </button>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="w-full flex items-center p-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors text-gray-700 dark:text-gray-300"
          >
            {theme === 'light' ? <Moon className="w-5 h-5 mr-3" /> : <Sun className="w-5 h-5 mr-3" />}
            <span className="font-medium">{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
          </button>
          <button className="w-full flex items-center p-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors text-gray-700 dark:text-gray-300">
            <Settings className="w-5 h-5 mr-3" />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white dark:bg-slate-800">
        <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 md:hidden">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Dr's Lab AI</h1>
          <div className="w-8"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-4">
              <div className="w-20 h-20 mb-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                <div className="text-3xl font-bold text-indigo-500">Dr</div>
              </div>
              <h2 className="text-3xl font-bold text-slate-700 dark:text-slate-200">
                {currentModel === 'gemini' ? 'Hello, I\'m here to help' : 'Ready to code'}
              </h2>
              <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-400">
                {currentModel === 'gemini' 
                  ? 'Your personal AI assistant for emotional growth and well-being.'
                  : 'Your advanced development assistant for coding and technical tasks.'}
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  model={currentModel}
                />
              ))}
              {sendMessage.isPending && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="w-full p-4 sm:p-6 bg-transparent">
          <div className="max-w-4xl mx-auto">
            <ChatInput 
              onSend={handleSend} 
              disabled={sendMessage.isPending || !conversationId}
            />
          </div>
        </div>
      </main>
    </>
  );
}
