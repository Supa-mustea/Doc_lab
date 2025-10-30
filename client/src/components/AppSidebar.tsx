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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b p-3 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <span className="text-xs md:text-sm font-bold">Dr</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm md:text-base font-bold truncate">Dr's Lab</h1>
              <p className="text-xs text-muted-foreground truncate">AI Platform</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            data-testid="button-theme-toggle"
            className="shrink-0 h-7 w-7 md:h-8 md:w-8"
          >
            {theme === "light" ? <Moon className="h-3 w-3 md:h-4 md:w-4" /> : <Sun className="h-3 w-3 md:h-4 md:w-4" />}
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
            <div className="px-2">
              <Select value={currentModel} onValueChange={onModelChange}>
                <SelectTrigger className="w-full" data-testid="model-selector">
                  <SelectValue placeholder="Select AI Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini" data-testid="option-select-gemini">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      <span>DOC</span>
                      <span className="text-xs text-muted-foreground ml-auto">Therapy</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="milesai" data-testid="option-select-milesai">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4" />
                      <span>MilesAI</span>
                      <span className="text-xs text-muted-foreground ml-auto">Dev</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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
                <div className="px-3 md:px-4 py-4 md:py-6 text-center text-xs md:text-sm text-muted-foreground">
                  No conversations yet
                </div>
              ) : (
                conversations.map((conv) => (
                  <SidebarMenuItem key={conv.id}>
                    <SidebarMenuButton asChild size="sm">
                      <Link href={`/chat/${conv.id}`} data-testid={`link-conversation-${conv.id}`}>
                        {conv.model === "gemini" ? (
                          <MessageCircle className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                        ) : (
                          <Code2 className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                        )}
                        <span className="truncate text-xs md:text-sm">{conv.title}</span>
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
