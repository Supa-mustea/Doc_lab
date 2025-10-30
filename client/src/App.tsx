
import { Switch, Route, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import ChatPage from "@/pages/ChatPage";
import StudioPage from "@/pages/StudioPage";
import NotFound from "@/pages/not-found";
import type { Conversation } from "@shared/schema";

function Router() {
  const [currentModel, setCurrentModel] = useState<"gemini" | "milesai">("gemini");
  const [location, setLocation] = useLocation();
  const [view, setView] = useState<'chat' | 'studio'>('chat');

  useEffect(() => {
    if (location.startsWith('/studio')) {
      setView('studio');
    } else {
      setView('chat');
    }
  }, [location]);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const createConversation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/conversations", {
        title: `New ${currentModel === "gemini" ? "Therapy" : "Dev"} Chat`,
        model: currentModel,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (data && 'id' in data) {
        setLocation(`/chat/${data.id}`);
      }
    },
  });

  const handleNewConversation = async () => {
    await createConversation.mutateAsync();
  };

  const handleModelChange = (model: "gemini" | "milesai") => {
    setCurrentModel(model);
  };

  const handleSetView = (newView: 'chat' | 'studio') => {
    setView(newView);
    if (newView === 'studio') {
      setLocation('/studio');
    } else {
      setLocation('/');
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 dark:bg-slate-900 text-gray-800 dark:text-gray-200 font-sans antialiased overflow-hidden">
      <Switch>
        <Route path="/" component={() => (
          <ChatPage 
            currentModel={currentModel} 
            onModelChange={handleModelChange}
            conversations={conversations}
            onNewConversation={handleNewConversation}
            currentView={view}
            onSetView={handleSetView}
          />
        )} />
        <Route path="/chat/:id" component={() => (
          <ChatPage 
            currentModel={currentModel}
            onModelChange={handleModelChange}
            conversations={conversations}
            onNewConversation={handleNewConversation}
            currentView={view}
            onSetView={handleSetView}
          />
        )} />
        <Route path="/studio" component={() => (
          <StudioPage 
            currentModel={currentModel}
            onModelChange={handleModelChange}
            conversations={conversations}
            onNewConversation={handleNewConversation}
            currentView={view}
            onSetView={handleSetView}
          />
        )} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="drslab-theme">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
