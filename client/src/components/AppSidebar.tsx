import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { MessageCircle, Code2, Plus, Moon, Sun, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";
import { Badge } from "@/components/ui/badge";

interface AppSidebarProps {
  currentModel: "gemini" | "milesai";
  onModelChange: (model: "gemini" | "milesai") => void;
  conversations: Array<{ id: string; title: string; model: string }>;
  onNewConversation: () => void;
}

export function AppSidebar({ 
  currentModel, 
  onModelChange, 
  conversations,
  onNewConversation 
}: AppSidebarProps) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const isStudio = location.startsWith("/studio");

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">Dr</span>
            </div>
            <div>
              <h1 className="text-base font-bold">Dr's Lab</h1>
              <p className="text-xs text-muted-foreground">AI Platform</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            data-testid="button-theme-toggle"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={!isStudio}>
                  <Link href="/" data-testid="link-chat">
                    <MessageCircle className="h-4 w-4" />
                    <span>Chat</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isStudio}>
                  <Link href="/studio" data-testid="link-studio">
                    <Code2 className="h-4 w-4" />
                    <span>Studio</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel>AI Model</SidebarGroupLabel>
          </div>
          <SidebarGroupContent>
            <div className="flex flex-col gap-2 px-2">
              <Button
                variant={currentModel === "gemini" ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => onModelChange("gemini")}
                data-testid="button-select-gemini"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Gemini
                <Badge variant="secondary" className="ml-auto text-xs">Therapy</Badge>
              </Button>
              <Button
                variant={currentModel === "milesai" ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => onModelChange("milesai")}
                data-testid="button-select-milesai"
              >
                <Code2 className="h-4 w-4 mr-2" />
                MilesAI
                <Badge variant="secondary" className="ml-auto text-xs">Dev</Badge>
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={onNewConversation}
              data-testid="button-new-conversation"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No conversations yet
                </div>
              ) : (
                conversations.map((conv) => (
                  <SidebarMenuItem key={conv.id}>
                    <SidebarMenuButton asChild>
                      <Link href={`/chat/${conv.id}`} data-testid={`link-conversation-${conv.id}`}>
                        {conv.model === "gemini" ? (
                          <MessageCircle className="h-4 w-4" />
                        ) : (
                          <Code2 className="h-4 w-4" />
                        )}
                        <span className="truncate">{conv.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Button variant="ghost" size="sm" className="w-full justify-start" data-testid="button-settings">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
