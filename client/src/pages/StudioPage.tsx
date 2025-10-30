
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import {
  FileText, Folder, Terminal as TerminalIcon, Plus, X, Bug, Monitor,
  File as FileIcon, RefreshCw, ChevronRight, ChevronDown, Github, Zap,
  Upload, Package, Code2, FilePlus, FolderPlus, Trash2, Send, Copy,
  Play, Square, ArrowUpCircle, Cloud, CheckCircle, AlertCircle
} from "lucide-react";

interface StudioFile {
  path: string;
  language: string;
  content: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

type SideViewType = 'explorer' | 'git' | 'debug' | 'extensions' | 'ai';
type BottomTabType = 'terminal' | 'explanation' | 'preview' | 'deploy';

interface Tab {
  id: string;
  name: string;
  path: string;
}

interface TerminalLine {
  type: 'command' | 'output' | 'error';
  text: string;
  timestamp: Date;
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

const buildFileTree = (files: Map<string, Pick<StudioFile, 'content' | 'language'>>): TreeNode[] => {
  const root: TreeNode = { name: 'root', path: '', type: 'folder', children: [] };

  for (const path of files.keys()) {
    const parts = path.split('/');
    let currentNode = root;

    parts.forEach((part, index) => {
      if (!part) return;
      const isFile = index === parts.length - 1;
      const currentPath = parts.slice(0, index + 1).join('/');
      let childNode = currentNode.children?.find(child => child.name === part && child.path === currentPath);

      if (!childNode) {
        childNode = { name: part, path: currentPath, type: isFile ? 'file' : 'folder' };
        if (!isFile) childNode.children = [];
        currentNode.children?.push(childNode);
      }
      if (!isFile) currentNode = childNode;
    });
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(node => { if (node.children) sortNodes(node.children); });
  };

  if (root.children) sortNodes(root.children);
  return root.children || [];
};

interface StudioPageProps {
  currentModel: "gemini" | "milesai";
  onModelChange: (model: "gemini" | "milesai") => void;
  conversations: any[];
  onNewConversation: () => void;
  currentView: 'chat' | 'studio';
  onSetView: (view: 'chat' | 'studio') => void;
}

export default function StudioPage({
  currentModel,
  onModelChange,
  conversations,
  onNewConversation,
  currentView,
  onSetView
}: StudioPageProps) {
  const { theme } = useTheme();
  const [localFiles, setLocalFiles] = useState<Map<string, Pick<StudioFile, 'content' | 'language'>>>(() => new Map());
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const [activeSideView, setActiveSideView] = useState<SideViewType>('explorer');
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTabType>('terminal');
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  
  // Terminal state
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // AI Console state
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Preview state
  const [previewUrl, setPreviewUrl] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // Deployment state
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'building' | 'deploying' | 'success' | 'error'>('idle');
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const aiMessagesEndRef = useRef<HTMLDivElement>(null);

  const fileTree = useMemo(() => buildFileTree(localFiles), [localFiles]);

  const activeFile = useMemo(() => {
    const tab = openTabs.find(t => t.id === activeTabId);
    if (!tab?.path) return null;
    if (localFiles.has(tab.path)) {
      return { path: tab.path, ...localFiles.get(tab.path)! };
    }
    return null;
  }, [activeTabId, openTabs, localFiles]);

  useEffect(() => {
    const initialContent = '# Welcome to Studio!\n\nCreate files and start coding.';
    setLocalFiles(new Map([['README.md', { language: 'markdown', content: initialContent }]]));
    const initialTab = { id: 'file:README.md', name: 'README.md', path: 'README.md' };
    setOpenTabs([initialTab]);
    setActiveTabId(initialTab.id);
    
    setTerminalLines([
      { type: 'output', text: 'Welcome to Dr\'s Lab Studio Terminal', timestamp: new Date() },
      { type: 'output', text: 'Type "help" for available commands', timestamp: new Date() }
    ]);
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const handleContentChange = (path: string, content: string, language?: string) => {
    setLocalFiles(prev => new Map(prev).set(path, { content, language: language || prev.get(path)?.language || 'plaintext' }));
  };

  const handleFileClick = (path: string) => {
    const tabId = `file:${path}`;
    if (!openTabs.some(tab => tab.id === tabId)) {
      setOpenTabs(prev => [...prev, { id: tabId, name: path.split('/').pop()!, path }]);
    }
    setActiveTabId(tabId);
  };

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tabIndex = openTabs.findIndex(t => t.id === tabId);
    const newTabs = openTabs.filter(t => t.id !== tabId);
    setOpenTabs(newTabs);
    if (activeTabId === tabId) setActiveTabId(newTabs[Math.max(0, tabIndex - 1)]?.id || null);
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const n = new Set(prev);
      n.has(path) ? n.delete(path) : n.add(path);
      return n;
    });
  };

  const handleCreateItem = (type: 'file' | 'folder') => {
    const promptText = type === 'file' ? "Enter new file path:" : "Enter new folder path:";
    const path = window.prompt(promptText);
    if (!path) return;
    const finalPath = type === 'folder' ? `${path.replace(/\/$/, '')}/.gitkeep` : path;
    if (!localFiles.has(finalPath)) {
      handleContentChange(finalPath, '', 'plaintext');
      if (type === 'file') handleFileClick(finalPath);
    }
  };

  const handleDelete = (path: string, type: 'file' | 'folder') => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?\n${path}`)) return;
    setLocalFiles(prev => {
      const next = new Map(prev);
      if (type === 'file') {
        next.delete(path);
      } else {
        for (const p of next.keys()) {
          if (p.startsWith(path + '/')) next.delete(p);
        }
      }
      return next;
    });
  };

  // Terminal functions
  const executeCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim();
    if (!trimmedCmd) return;

    setTerminalLines(prev => [...prev, { type: 'command', text: `$ ${trimmedCmd}`, timestamp: new Date() }]);
    setCommandHistory(prev => [...prev, trimmedCmd]);

    // Simulate command execution
    const parts = trimmedCmd.split(' ');
    const command = parts[0];

    switch (command) {
      case 'help':
        setTerminalLines(prev => [...prev, {
          type: 'output',
          text: 'Available commands:\n  ls - List files\n  cat <file> - Show file contents\n  clear - Clear terminal\n  help - Show this message',
          timestamp: new Date()
        }]);
        break;
      case 'ls':
        const fileList = Array.from(localFiles.keys()).join('\n  ');
        setTerminalLines(prev => [...prev, {
          type: 'output',
          text: fileList || 'No files',
          timestamp: new Date()
        }]);
        break;
      case 'cat':
        if (parts[1]) {
          const fileContent = localFiles.get(parts[1]);
          setTerminalLines(prev => [...prev, {
            type: fileContent ? 'output' : 'error',
            text: fileContent ? fileContent.content : `File not found: ${parts[1]}`,
            timestamp: new Date()
          }]);
        } else {
          setTerminalLines(prev => [...prev, { type: 'error', text: 'Usage: cat <filename>', timestamp: new Date() }]);
        }
        break;
      case 'clear':
        setTerminalLines([]);
        break;
      default:
        setTerminalLines(prev => [...prev, {
          type: 'error',
          text: `Command not found: ${command}. Type 'help' for available commands.`,
          timestamp: new Date()
        }]);
    }
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(terminalInput);
      setTerminalInput('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setTerminalInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setTerminalInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setTerminalInput('');
      }
    }
  };

  // AI Console functions
  const sendAiMessage = async () => {
    if (!aiInput.trim() || isAiLoading) return;

    const userMessage: AIMessage = { role: 'user', content: aiInput };
    setAiMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const response = await fetch('/api/studio/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...aiMessages, userMessage],
          context: { files: Array.from(localFiles.keys()) }
        })
      });

      const data = await response.json();
      const assistantMessage: AIMessage = { role: 'assistant', content: data.response || 'Error getting response' };
      setAiMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: AIMessage = { role: 'assistant', content: 'Failed to get AI response. Please try again.' };
      setAiMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Preview functions
  const refreshPreview = () => {
    setIsPreviewLoading(true);
    // Simulate preview generation
    setTimeout(() => {
      const htmlFile = localFiles.get('index.html');
      if (htmlFile) {
        const blob = new Blob([htmlFile.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
      setIsPreviewLoading(false);
    }, 500);
  };

  useEffect(() => {
    if (activeBottomTab === 'preview') {
      refreshPreview();
    }
  }, [activeBottomTab]);

  // Deployment functions
  const handleDeploy = async () => {
    setDeploymentStatus('building');
    setDeploymentLogs(['Starting deployment...', 'Building project...']);

    // Simulate deployment process
    setTimeout(() => {
      setDeploymentLogs(prev => [...prev, 'Build complete', 'Deploying to Replit...']);
      setDeploymentStatus('deploying');
      
      setTimeout(() => {
        setDeploymentLogs(prev => [...prev, 'Deployment successful!']);
        setDeploymentStatus('success');
        setDeploymentUrl('https://your-project.replit.app');
      }, 2000);
    }, 2000);
  };

  const FileTreeNode: React.FC<{
    node: TreeNode;
    level: number;
    expandedFolders: Set<string>;
    onToggleFolder: (path: string) => void;
    onFileClick: (path: string) => void;
    onDelete: (path: string, type: 'file' | 'folder') => void;
  }> = ({ node, level, expandedFolders, onToggleFolder, onFileClick, onDelete }) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders.has(node.path);
    const Icon = isFolder ? Folder : FileIcon;

    return (
      <div>
        <div
          className="flex items-center gap-1 md:gap-2 py-1 md:py-1.5 px-1 md:px-2 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer group"
          style={{ paddingLeft: `${level * 12 + 4}px` }}
          onClick={() => isFolder ? onToggleFolder(node.path) : onFileClick(node.path)}
        >
          {isFolder && (
            isExpanded ? <ChevronDown className="w-3 h-3 md:w-4 md:h-4 shrink-0" /> : <ChevronRight className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
          )}
          <Icon className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
          <span className="text-xs md:text-sm flex-1 truncate">{node.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(node.path, node.type); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 md:p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        {isFolder && isExpanded && node.children && (
          <div>
            {node.children.map(child => (
              <FileTreeNode
                key={child.path}
                node={child}
                level={level + 1}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onFileClick={onFileClick}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const CodeEditor: React.FC<{
    content: string;
    language: string;
    onContentChange: (newContent: string) => void;
  }> = ({ content, language, onContentChange }) => {
    return (
      <div className="relative w-full h-full">
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          className="absolute inset-0 p-2 md:p-4 font-mono text-xs md:text-sm resize-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
          spellCheck="false"
        />
      </div>
    );
  };

  const SideNavItems = [
    { type: 'explorer', icon: FileIcon, name: 'Explorer' },
    { type: 'git', icon: Github, name: 'Source Control' },
    { type: 'debug', icon: Bug, name: 'Debugger' },
    { type: 'extensions', icon: Package, name: 'Extensions' },
    { type: 'ai', icon: Zap, name: 'AI Assistant' }
  ];

  const BottomNavItems = [
    { type: 'terminal', icon: TerminalIcon, name: 'Terminal' },
    { type: 'explanation', icon: FileText, name: 'AI Console' },
    { type: 'preview', icon: Monitor, name: 'Live Preview' },
    { type: 'deploy', icon: Upload, name: 'Deployments' },
  ];

  return (
    <div className="flex h-full w-full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 overflow-hidden">
      {/* Activity Bar */}
      <div className="hidden md:flex w-12 lg:w-14 bg-slate-200/50 dark:bg-black/20 flex-col items-center justify-between py-2 md:py-4">
        <div className="flex flex-col items-center gap-2 md:gap-4">
          {SideNavItems.map(item => (
            <button
              key={item.type}
              onClick={() => setActiveSideView(item.type as SideViewType)}
              title={item.name}
              className={`p-1.5 md:p-2 rounded-lg transition-colors ${activeSideView === item.type ? 'bg-indigo-200 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-300/50 dark:hover:bg-slate-700/50'}`}
            >
              <item.icon className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-48 md:w-56 lg:w-64 border-r dark:border-slate-700/50 flex flex-col bg-slate-100 dark:bg-slate-900 shrink-0">
        <header className="p-2 md:p-3 border-b dark:border-slate-700/50 flex items-center justify-between gap-1 md:gap-2">
          <h2 className="font-semibold uppercase text-xs md:text-sm tracking-wider truncate">{activeSideView}</h2>
          {activeSideView === 'explorer' && (
            <div className="flex items-center gap-0.5 md:gap-1">
              <button onClick={() => handleCreateItem('file')} title="New File" className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                <FilePlus className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button onClick={() => handleCreateItem('folder')} title="New Folder" className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                <FolderPlus className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          )}
        </header>
        <div className="flex-1 overflow-y-auto">
          {activeSideView === 'explorer' && (
            <div>
              {fileTree.map(node => (
                <FileTreeNode
                  key={node.path}
                  node={node}
                  level={0}
                  expandedFolders={expandedFolders}
                  onToggleFolder={toggleFolder}
                  onFileClick={handleFileClick}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
          {activeSideView !== 'explorer' && (
            <div className="p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">{activeSideView} panel - Coming soon</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor Tabs */}
        <div className="flex items-center border-b dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 overflow-x-auto scrollbar-thin">
          {openTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-1 md:gap-2 text-xs md:text-sm p-1.5 md:p-2 border-r dark:border-slate-700/50 whitespace-nowrap ${activeTabId === tab.id ? 'bg-white dark:bg-slate-800' : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
            >
              <span className="truncate max-w-[100px] md:max-w-none">{tab.name}</span>
              <div onClick={(e) => handleTabClose(e, tab.id)} className="p-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-600 shrink-0">
                <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
              </div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0">
          {activeFile ? (
            <CodeEditor
              content={activeFile.content}
              language={activeFile.language}
              onContentChange={(c) => handleContentChange(activeFile.path!, c)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <FileIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a file from the explorer to begin editing.</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Panel */}
        <div className="w-full bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700/50" style={{ height: isBottomPanelOpen ? `${bottomPanelHeight}px` : 'auto' }}>
          <div className="flex items-center border-b dark:border-slate-700/50 overflow-x-auto scrollbar-thin">
            {BottomNavItems.map(item => (
              <button
                key={item.type}
                onClick={() => { setActiveBottomTab(item.type as BottomTabType); setIsBottomPanelOpen(true); }}
                className={`flex items-center gap-1 md:gap-2 text-xs md:text-sm p-1.5 md:p-2 whitespace-nowrap ${activeBottomTab === item.type && isBottomPanelOpen ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
              >
                <item.icon className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                <span className="hidden sm:inline">{item.name}</span>
              </button>
            ))}
            <div className="flex-1"></div>
            <button onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)} className="p-1.5 md:p-2 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 shrink-0">
              {isBottomPanelOpen ? <ChevronDown className="w-4 h-4 md:w-5 md:h-5" /> : <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />}
            </button>
          </div>
          {isBottomPanelOpen && (
            <div className="h-full pb-6 md:pb-10 overflow-auto">
              {activeBottomTab === 'terminal' && (
                <div className="h-full bg-black text-green-400 font-mono text-xs md:text-sm p-2 md:p-4 flex flex-col">
                  <div className="flex-1 overflow-y-auto mb-2">
                    {terminalLines.map((line, idx) => (
                      <div key={idx} className={`mb-1 ${line.type === 'error' ? 'text-red-400' : line.type === 'command' ? 'text-cyan-400' : ''}`}>
                        {line.text}
                      </div>
                    ))}
                    <div ref={terminalEndRef} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400">$</span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyDown={handleTerminalKeyDown}
                      className="flex-1 bg-transparent outline-none text-green-400"
                      placeholder="Type a command..."
                    />
                  </div>
                </div>
              )}
              {activeBottomTab === 'explanation' && (
                <div className="h-full flex flex-col p-2 md:p-4">
                  <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                    {aiMessages.length === 0 ? (
                      <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                        <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Ask the AI assistant for help with your code</p>
                      </div>
                    ) : (
                      <>
                        {aiMessages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  code({ node, inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                      <SyntaxHighlighter
                                        style={oneDark}
                                        language={match[1]}
                                        PreTag="div"
                                        {...props}
                                      >
                                        {String(children).replace(/\n$/, '')}
                                      </SyntaxHighlighter>
                                    ) : (
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    );
                                  }
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ))}
                        {isAiLoading && (
                          <div className="flex justify-start">
                            <div className="bg-slate-200 dark:bg-slate-700 p-3 rounded-lg">
                              <div className="flex gap-2">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={aiMessagesEndRef} />
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendAiMessage();
                        }
                      }}
                      placeholder="Ask AI for help..."
                      className="flex-1 resize-none"
                      rows={2}
                    />
                    <Button onClick={sendAiMessage} disabled={isAiLoading || !aiInput.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              {activeBottomTab === 'preview' && (
                <div className="h-full flex flex-col bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-2 p-2 border-b dark:border-slate-700">
                    <Button size="sm" onClick={refreshPreview} disabled={isPreviewLoading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${isPreviewLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    {previewUrl && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">Preview ready</span>
                    )}
                  </div>
                  <div className="flex-1 overflow-auto">
                    {previewUrl ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full border-0"
                        title="Preview"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                        <div className="text-center">
                          <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Create an index.html file to see live preview</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeBottomTab === 'deploy' && (
                <div className="h-full p-4 overflow-auto">
                  <div className="max-w-2xl">
                    <h3 className="text-lg font-semibold mb-4">Deploy to Replit</h3>
                    
                    {deploymentStatus === 'idle' && (
                      <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Deploy your project to make it accessible online
                        </p>
                        <Button onClick={handleDeploy} className="w-full">
                          <Cloud className="w-4 h-4 mr-2" />
                          Deploy Project
                        </Button>
                      </div>
                    )}
                    
                    {(deploymentStatus === 'building' || deploymentStatus === 'deploying') && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          <span className="font-medium">
                            {deploymentStatus === 'building' ? 'Building...' : 'Deploying...'}
                          </span>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg font-mono text-xs space-y-1">
                          {deploymentLogs.map((log, idx) => (
                            <div key={idx}>{log}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {deploymentStatus === 'success' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-6 h-6" />
                          <span className="font-medium">Deployment Successful!</span>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Your app is live at:</p>
                          <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline break-all">
                            {deploymentUrl}
                          </a>
                        </div>
                        <Button onClick={handleDeploy} variant="outline" className="w-full">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Redeploy
                        </Button>
                      </div>
                    )}
                    
                    {deploymentStatus === 'error' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                          <AlertCircle className="w-6 h-6" />
                          <span className="font-medium">Deployment Failed</span>
                        </div>
                        <Button onClick={handleDeploy} className="w-full">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retry Deployment
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
