
import React, { useState, useEffect, useMemo, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from "@/components/ThemeProvider";

// Import icons (you may need to add these to your project)
import {
  FileText, Folder, Terminal as TerminalIcon, Plus, X, Bug, Monitor,
  File as FileIcon, RefreshCw, ChevronRight, ChevronDown, Github, Zap,
  Upload, Package, Code2, Link, FilePlus, FolderPlus, Trash2,
  Cloud, Archive, Menu, Tablet, Smartphone, Check, Minus,
  ArrowUpCircle, ArrowDownCircle, Download, Edit, Copy, ArrowRight
} from "lucide-react";

interface StudioFile {
  path: string;
  language: string;
  content: string;
}

interface NextStep {
  text: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

type SideViewType = 'explorer' | 'git' | 'debug' | 'extensions' | 'ai';
type BottomTabType = 'terminal' | 'explanation' | 'preview' | 'deploy';
type AiMode = 'assistant' | 'agent';

interface Tab {
  id: string;
  name: string;
  path: string;
}

interface StudioChatMessage {
  text: string;
  isUser: boolean;
}

interface TerminalHandle {
  executeCommand: (cmd: string) => void;
}

const STORAGE_KEY = 'studio-project-state';
const MIN_BOTTOM_PANEL_HEIGHT = 40;
const DEFAULT_BOTTOM_PANEL_HEIGHT = 250;

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

export default function StudioPage() {
  const { theme } = useTheme();
  const [projectName, setProjectName] = useState('My Awesome Project');
  const [localFiles, setLocalFiles] = useState<Map<string, Pick<StudioFile, 'content' | 'language'>>>(() => new Map());
  const [gitBase, setGitBase] = useState<Map<string, string>>(() => new Map());
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(() => new Set());
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const [explanation, setExplanation] = useState('');
  const [nextSteps, setNextSteps] = useState<NextStep[]>([]);
  const [activeSideView, setActiveSideView] = useState<SideViewType>('explorer');
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTabType>('terminal');
  const [bottomPanelHeight, setBottomPanelHeight] = useState(DEFAULT_BOTTOM_PANEL_HEIGHT);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [studioChatMessages, setStudioChatMessages] = useState<StudioChatMessage[]>([]);
  const [isAiChatLoading, setIsAiChatLoading] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>('assistant');
  const [currentModel, setCurrentModel] = useState<"milesai" | "gemini">("gemini");

  const mainContentAreaRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<TerminalHandle>(null);

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
    const initialContent = '# Welcome!\n\nUse the AI assistant to start building.';
    setLocalFiles(new Map([['README.md', { language: 'markdown', content: initialContent }]]));
    setGitBase(new Map([['README.md', initialContent]]));
    const initialTab = { id: 'file:README.md', name: 'README.md', path: 'README.md' };
    setOpenTabs([initialTab]);
    setActiveTabId(initialTab.id);
  }, []);

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
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer group"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => isFolder ? onToggleFolder(node.path) : onFileClick(node.path)}
        >
          {isFolder && (
            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          )}
          <Icon className="w-4 h-4" />
          <span className="text-sm flex-1">{node.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(node.path, node.type); }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
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
          className="absolute inset-0 p-4 font-mono text-sm resize-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
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
      <div className="w-14 bg-slate-200/50 dark:bg-black/20 flex flex-col items-center justify-between py-4">
        <div className="flex flex-col items-center gap-4">
          {SideNavItems.map(item => (
            <button
              key={item.type}
              onClick={() => setActiveSideView(item.type as SideViewType)}
              title={item.name}
              className={`p-2 rounded-lg transition-colors ${activeSideView === item.type ? 'bg-indigo-200 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-300/50 dark:hover:bg-slate-700/50'}`}
            >
              <item.icon className="w-6 h-6" />
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-64 border-r dark:border-slate-700/50 flex flex-col bg-slate-100 dark:bg-slate-900">
        <header className="p-3 border-b dark:border-slate-700/50 flex items-center justify-between gap-2">
          <h2 className="font-semibold uppercase text-sm tracking-wider">{activeSideView}</h2>
          {activeSideView === 'explorer' && (
            <div className="flex items-center gap-1">
              <button onClick={() => handleCreateItem('file')} title="New File" className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                <FilePlus className="w-5 h-5" />
              </button>
              <button onClick={() => handleCreateItem('folder')} title="New Folder" className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                <FolderPlus className="w-5 h-5" />
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
          {activeSideView === 'ai' && (
            <div className="p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">AI Assistant panel - Coming soon</p>
            </div>
          )}
          {activeSideView !== 'explorer' && activeSideView !== 'ai' && (
            <div className="p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">{activeSideView} panel - Coming soon</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden" ref={mainContentAreaRef}>
        {/* Editor Tabs */}
        <div className="flex items-center border-b dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 overflow-x-auto">
          {openTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 text-sm p-2 border-r dark:border-slate-700/50 whitespace-nowrap ${activeTabId === tab.id ? 'bg-white dark:bg-slate-800' : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
            >
              <span>{tab.name}</span>
              <div onClick={(e) => handleTabClose(e, tab.id)} className="p-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-600">
                <X className="w-3.5 h-3.5" />
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
          <div className="flex items-center border-b dark:border-slate-700/50 overflow-x-auto">
            {BottomNavItems.map(item => (
              <button
                key={item.type}
                onClick={() => { setActiveBottomTab(item.type as BottomTabType); setIsBottomPanelOpen(true); }}
                className={`flex items-center gap-2 text-sm p-2 whitespace-nowrap ${activeBottomTab === item.type && isBottomPanelOpen ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </button>
            ))}
            <div className="flex-1"></div>
            <button onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)} className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-700/50">
              {isBottomPanelOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
          {isBottomPanelOpen && (
            <div className="h-full pb-10 overflow-auto">
              {activeBottomTab === 'terminal' && (
                <div className="h-full bg-black text-green-400 font-mono text-sm p-4">
                  <pre>Terminal ready. Type commands here...</pre>
                </div>
              )}
              {activeBottomTab === 'explanation' && (
                <div className="h-full p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">AI Console - Coming soon</p>
                </div>
              )}
              {activeBottomTab === 'preview' && (
                <div className="h-full p-4 bg-slate-200 dark:bg-slate-900">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Live Preview - Coming soon</p>
                </div>
              )}
              {activeBottomTab === 'deploy' && (
                <div className="h-full p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Deployments - Coming soon</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
