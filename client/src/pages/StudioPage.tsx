import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StudioWorkspace } from "@/components/StudioWorkspace";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { StudioFile, TerminalCommand } from "@shared/schema";

export default function StudioPage() {
  const [activeFileId, setActiveFileId] = useState<string>();
  const [terminalOutput, setTerminalOutput] = useState("");

  // Fetch studio files
  const { data: files = [] } = useQuery<StudioFile[]>({
    queryKey: ["/api/studio/files"],
  });

  // Fetch terminal history
  const { data: commandHistory = [] } = useQuery<TerminalCommand[]>({
    queryKey: ["/api/studio/terminal"],
  });

  // Create file mutation
  const createFile = useMutation({
    mutationFn: async (path: string) => {
      return await apiRequest("POST", "/api/studio/files", {
        path,
        content: "",
        language: getLanguageFromPath(path),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/files"] });
    },
  });

  // Update file mutation
  const updateFile = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return await apiRequest("PATCH", `/api/studio/files/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/files"] });
    },
  });

  // Delete file mutation
  const deleteFile = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/studio/files/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/files"] });
      if (activeFileId) {
        setActiveFileId(undefined);
      }
    },
  });

  // Execute command mutation
  const executeCommand = useMutation({
    mutationFn: async (command: string) => {
      return await apiRequest("POST", "/api/studio/terminal", { command });
    },
    onSuccess: (data: any) => {
      setTerminalOutput((prev) => prev + "\n$ " + data.command + "\n" + (data.output || ""));
      queryClient.invalidateQueries({ queryKey: ["/api/studio/terminal"] });
    },
  });

  const handleFileSelect = (fileId: string) => {
    setActiveFileId(fileId);
  };

  const handleFileCreate = async (path: string) => {
    const result = await createFile.mutateAsync(path);
    if (result && 'id' in result) {
      setActiveFileId(result.id);
    }
  };

  const handleFileUpdate = (fileId: string, content: string) => {
    updateFile.mutate({ id: fileId, content });
  };

  const handleFileDelete = async (fileId: string) => {
    if (confirm("Are you sure you want to delete this file?")) {
      await deleteFile.mutateAsync(fileId);
    }
  };

  const handleCommandExecute = (command: string) => {
    executeCommand.mutate(command);
  };

  return (
    <div className="h-full">
      <StudioWorkspace
        files={files}
        activeFileId={activeFileId}
        onFileSelect={handleFileSelect}
        onFileCreate={handleFileCreate}
        onFileUpdate={handleFileUpdate}
        onFileDelete={handleFileDelete}
        onCommandExecute={handleCommandExecute}
        terminalOutput={terminalOutput}
      />
    </div>
  );
}

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    rb: "ruby",
    go: "go",
    rs: "rust",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
  };
  return langMap[ext || ""] || "plaintext";
}
