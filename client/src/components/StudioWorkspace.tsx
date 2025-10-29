import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FolderTree, 
  File, 
  FileCode, 
  Terminal as TerminalIcon,
  Play,
  Save,
  Trash2,
  Plus,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StudioFile {
  id: string;
  path: string;
  content: string;
  language?: string;
}

interface StudioWorkspaceProps {
  files: StudioFile[];
  activeFileId?: string;
  onFileSelect: (fileId: string) => void;
  onFileCreate: (path: string) => void;
  onFileUpdate: (fileId: string, content: string) => void;
  onFileDelete: (fileId: string) => void;
  onCommandExecute: (command: string) => void;
  terminalOutput?: string;
}

export function StudioWorkspace({
  files,
  activeFileId,
  onFileSelect,
  onFileCreate,
  onFileUpdate,
  onFileDelete,
  onCommandExecute,
  terminalOutput = "",
}: StudioWorkspaceProps) {
  const [activeTab, setActiveTab] = useState("editor");
  const [newFileName, setNewFileName] = useState("");
  const [terminalCommand, setTerminalCommand] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root"]));

  const activeFile = files.find((f) => f.id === activeFileId);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      onFileCreate(newFileName);
      setNewFileName("");
    }
  };

  const handleRunCommand = () => {
    if (terminalCommand.trim()) {
      onCommandExecute(terminalCommand);
      setTerminalCommand("");
    }
  };

  return (
    <div className="flex h-full">
      {/* File Explorer Sidebar */}
      <div className="w-64 border-r bg-sidebar flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-sidebar-foreground" />
            <span className="text-sm font-semibold text-sidebar-foreground">Files</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => {
              const name = prompt("Enter file name:");
              if (name) onFileCreate(name);
            }}
            data-testid="button-create-file"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {files.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No files yet
              </div>
            ) : (
              <div className="space-y-1">
                {files.map((file) => {
                  const isActive = file.id === activeFileId;
                  return (
                    <div
                      key={file.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md p-2 cursor-pointer hover-elevate active-elevate-2",
                        isActive && "bg-sidebar-accent"
                      )}
                      onClick={() => onFileSelect(file.id)}
                      data-testid={`file-item-${file.id}`}
                    >
                      <FileCode className="h-4 w-4 text-sidebar-foreground/70" />
                      <span className="flex-1 text-sm text-sidebar-foreground truncate">
                        {file.path}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFileDelete(file.id);
                        }}
                        data-testid={`button-delete-file-${file.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b px-2">
            <TabsList className="bg-transparent border-0 h-10">
              <TabsTrigger value="editor" data-testid="tab-editor">
                <FileCode className="h-4 w-4 mr-2" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="terminal" data-testid="tab-terminal">
                <TerminalIcon className="h-4 w-4 mr-2" />
                Terminal
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="editor" className="flex-1 m-0 flex flex-col">
            {activeFile ? (
              <>
                <div className="border-b px-4 py-2 flex items-center justify-between bg-card">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{activeFile.path}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onFileUpdate(activeFile.id, activeFile.content)}
                      data-testid="button-save-file"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
                <div className="flex-1 p-4">
                  <Textarea
                    value={activeFile.content}
                    onChange={(e) => onFileUpdate(activeFile.id, e.target.value)}
                    className="font-mono text-sm min-h-full resize-none"
                    placeholder="// Start coding..."
                    data-testid="textarea-code-editor"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a file to edit</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="terminal" className="flex-1 m-0 flex flex-col">
            <div className="flex-1 bg-slate-950 text-green-400 p-4 font-mono text-sm overflow-auto">
              <ScrollArea className="h-full">
                <pre className="whitespace-pre-wrap" data-testid="terminal-output">
                  {terminalOutput || "Terminal ready. Enter commands below..."}
                </pre>
              </ScrollArea>
            </div>
            <div className="border-t p-2 bg-card flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Textarea
                value={terminalCommand}
                onChange={(e) => setTerminalCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleRunCommand();
                  }
                }}
                placeholder="Enter command..."
                className="flex-1 min-h-[40px] max-h-[100px] resize-none font-mono text-sm"
                data-testid="input-terminal-command"
                rows={1}
              />
              <Button
                size="icon"
                onClick={handleRunCommand}
                disabled={!terminalCommand.trim()}
                data-testid="button-execute-command"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
