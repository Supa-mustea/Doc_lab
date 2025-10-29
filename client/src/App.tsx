import { Switch, Route, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import ChatPage from "@/pages/ChatPage";
import StudioPage from "@/pages/StudioPage";
import NotFound from "@/pages/not-found";
import type { Conversation } from "@shared/schema";

function Router() {
  const [currentModel, setCurrentModel] = useState<"gemini" | "milesai">("gemini");
  const [location, setLocation] = useLocation();

  // Fetch conversations
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  // Create conversation mutation
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

  return (
    <>
      <AppSidebar
        currentModel={currentModel}
        onModelChange={handleModelChange}
        conversations={conversations}
        onNewConversation={handleNewConversation}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between p-3 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h2 className="text-sm font-semibold">
              {location.startsWith("/studio") ? "Studio Workspace" : "Chat"}
            </h2>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          <Switch>
            <Route path="/" component={() => <ChatPage currentModel={currentModel} />} />
            <Route path="/chat/:id" component={() => <ChatPage currentModel={currentModel} />} />
            <Route path="/studio" component={StudioPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="drslab-theme">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <Router />
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
