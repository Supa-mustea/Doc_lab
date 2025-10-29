import React, { useState, useEffect, useMemo, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenAI, Type } from "@google/genai";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CodeBlockHeader from '../components/CodeBlockHeader';
import ChatInput from '../components/ChatInput';

import { 
    FileIcon, FolderIcon, TerminalIcon, PlusIcon, CloseIcon, BugAntIcon, ComputerDesktopIcon, 
    DocumentTextIcon, ArrowPathIcon, ChevronRightIcon, ChevronDownIcon, GitHubIcon, LogoIcon, 
    CloudArrowUpIcon, PuzzlePieceIcon, VercelIcon, SupabaseIcon, FirebaseIcon, PaintBrushIcon, 
    LinkIcon, FilePlusIcon, FolderPlusIcon, TrashIcon, GoogleDriveIcon, AppwriteIcon, 
    ArchiveBoxIcon, MenuIcon, DeviceTabletIcon, DevicePhoneMobileIcon, CheckIcon, MinusIcon,
    ArrowUpCircleIcon, ArrowDownCircleIcon, DocumentArrowDownIcon, PencilIcon, DocumentDuplicateIcon, ArrowRightCircleIcon
} from '../components/icons';

// --- TYPE DEFINITIONS ---
interface StudioViewProps {
  theme: string;
  initialPrompt: string | null;
  onClearInitialPrompt: () => void;
}

interface StudioFile {
  path: string;
  language: string;
  content: string;
}

interface NextStep {
    text: string;
    priority: 'High' | 'Medium' | 'Low';
}

interface StudioContent {
  projectName: string;
  files: StudioFile[];
  explanation: string;
  terminalOutput: string;
  nextSteps: NextStep[];
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
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    path: string;
}

interface StudioChatMessage {
    text: string;
    isUser: boolean;
}

interface TerminalHandle {
    executeCommand: (cmd: string) => void;
}

// --- CONSTANTS & MOCK DATA ---
const STORAGE_KEY = 'studio-project-state';
const MIN_BOTTOM_PANEL_HEIGHT = 40;
const DEFAULT_BOTTOM_PANEL_HEIGHT = 250;


// --- HELPER FUNCTIONS ---
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

// --- SUB-COMPONENTS ---

const ContextMenu: React.FC<{
    x: number; y: number; path: string; type: 'file' | 'folder';
    onClose: () => void; onRename: (path: string, type: 'file' | 'folder') => void;
    onDuplicate: (path: string, type: 'file' | 'folder') => void;
    onMove: (path: string, type: 'file' | 'folder') => void;
    onDelete: (path: string, type: 'file' | 'folder') => void;
}> = ({ x, y, path, type, onClose, onRename, onDuplicate, onMove, onDelete }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const menuItems = [
        { label: 'Rename', icon: PencilIcon, action: () => onRename(path, type) },
        { label: 'Duplicate', icon: DocumentDuplicateIcon, action: () => onDuplicate(path, type) },
        { label: 'Move', icon: ArrowRightCircleIcon, action: () => onMove(path, type) },
        { label: 'Delete', icon: TrashIcon, action: () => onDelete(path, type) },
    ];

    return (
        <div ref={menuRef} style={{ top: y, left: x }} className="fixed z-50 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 p-1 text-sm">
            {menuItems.map(item => (
                <button key={item.label} onClick={() => { item.action(); onClose(); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={type === 'folder' && item.label === 'Duplicate'}
                >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
    );
};

const FileTree: React.FC<{ 
    nodes: TreeNode[]; 
    onFileClick: (path: string) => void;
    onDelete: (path: string, type: 'file' | 'folder') => void;
    onContextMenu: (e: React.MouseEvent, path: string, type: 'file' | 'folder') => void;
    expandedFolders: Set<string>; 
    onToggleFolder: (path: string) => void;
    allChanges: Map<string, 'untracked' | 'modified' | 'deleted'>;
    stagedFiles: Set<string>;
    level?: number;
}> = ({ nodes, onFileClick, onDelete, onContextMenu, expandedFolders, onToggleFolder, allChanges, stagedFiles, level = 0 }) => (
    <div>
        {nodes.map(node => (
            <FileTreeNode key={node.path} node={node} onFileClick={onFileClick} onDelete={onDelete} onContextMenu={onContextMenu} level={level} expandedFolders={expandedFolders} onToggleFolder={onToggleFolder} allChanges={allChanges} stagedFiles={stagedFiles}/>
        ))}
    </div>
);

const FileTreeNode: React.FC<{
  node: TreeNode; 
  onFileClick: (path: string) => void;
  onDelete: (path: string, type: 'file' | 'folder') => void;
  onContextMenu: (e: React.MouseEvent, path: string, type: 'file' | 'folder') => void;
  level: number;
  expandedFolders: Set<string>; 
  onToggleFolder: (path: string) => void;
  allChanges: Map<string, 'untracked' | 'modified' | 'deleted'>;
  stagedFiles: Set<string>;
}> = ({ node, onFileClick, onDelete, onContextMenu, level, expandedFolders, onToggleFolder, allChanges, stagedFiles }) => {
  const isFolder = node.type === 'folder';
  const isExpanded = expandedFolders.has(node.path);
  const handleToggle = () => { isFolder ? onToggleFolder(node.path) : onFileClick(node.path); };

  const status = allChanges.get(node.path);
  const isStaged = stagedFiles.has(node.path);

  let statusColor = 'text-slate-700 dark:text-slate-300';
  let statusTitle = '';
  if (isStaged) {
    statusColor = 'text-green-600 dark:text-green-400';
    statusTitle = 'Staged';
  } else if (status === 'modified') {
    statusColor = 'text-yellow-600 dark:text-yellow-400';
    statusTitle = 'Modified';
  } else if (status === 'untracked') {
    statusColor = 'text-green-600 dark:text-green-400';
    statusTitle = 'Untracked';
  }

  return (
    <div className="relative group">
      <button onContextMenu={(e) => onContextMenu(e, node.path, node.type)} onClick={handleToggle} className="flex items-center space-x-1.5 py-1.5 px-2 w-full text-left rounded transition-colors duration-100 hover:bg-slate-200 dark:hover:bg-slate-700/50" style={{ paddingLeft: `${level * 16 + 8}px` }} title={`${node.path}${statusTitle ? ` (${statusTitle})` : ''}`}>
        {isFolder ? (
            isExpanded ? <ChevronDownIcon className="w-4 h-4 flex-shrink-0" /> : <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
        ) : <div className="w-4 h-4 flex-shrink-0" />}
        
        {isFolder ? <FolderIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0" /> : <FileIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />}
        <span className={`text-sm truncate ${statusColor}`}>{node.name}</span>
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(node.path, node.type); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/50 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-all"
        title={`Delete ${node.name}`}
      >
        <TrashIcon className="w-3.5 h-3.5" />
      </button>
      {isFolder && isExpanded && node.children && (
        <FileTree nodes={node.children} onFileClick={onFileClick} onDelete={onDelete} onContextMenu={onContextMenu} level={level + 1} expandedFolders={expandedFolders} onToggleFolder={onToggleFolder} allChanges={allChanges} stagedFiles={stagedFiles} />
      )}
    </div>
  );
};

const CodeEditor: React.FC<{ content: string, language: string, onContentChange: (newContent: string) => void, theme: string }> = ({ content, language, onContentChange, theme }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const codeContainerRef = useRef<HTMLDivElement>(null);

    const syncScroll = () => {
        if (textareaRef.current && codeContainerRef.current) {
            codeContainerRef.current.scrollTop = textareaRef.current.scrollTop;
            codeContainerRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            const newContent = content.substring(0, start) + '  ' + content.substring(end);
            onContentChange(newContent);
            setTimeout(() => {
                if(textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
                }
            }, 0);
        }
    };
    
    const codeWithNewline = content.endsWith('\n') ? content : content + '\n';

    return (
        <div className={`relative w-full h-full font-mono text-sm ${theme === 'dark' ? 'bg-[#282c34]' : 'bg-slate-50'}`}>
            <textarea 
                ref={textareaRef} 
                value={content} 
                onChange={(e) => onContentChange(e.target.value)} 
                onScroll={syncScroll} 
                onKeyDown={handleKeyDown}
                className={`absolute inset-0 z-10 p-4 pl-16 resize-none border-0 bg-transparent text-transparent caret-current outline-none whitespace-pre-wrap break-normal ${theme === 'dark' ? 'text-white' : 'text-black'}`} 
                spellCheck="false" 
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
            />
            <div ref={codeContainerRef} className="overflow-auto h-full" aria-hidden="true">
                 <SyntaxHighlighter 
                    style={theme === 'dark' ? oneDark : prism} 
                    language={language} 
                    showLineNumbers 
                    wrapLines 
                    lineNumberStyle={{ minWidth: '3.5em', paddingRight: '1.5em', textAlign: 'right', userSelect: 'none', color: theme === 'dark' ? '#888' : '#aaa' }} 
                    PreTag="pre" 
                    customStyle={{ margin: 0, padding: '1rem', backgroundColor: 'transparent', minHeight: '100%', }} 
                    codeTagProps={{ style: { fontFamily: 'inherit', fontSize: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-all', } }}>
                    {codeWithNewline}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};

const PlaceholderPanel: React.FC<{ icon: React.FC<any>, title: string, children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
        <Icon className="w-16 h-16 mb-4 text-slate-400 dark:text-slate-500" />
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">{title}</h3>
        <p className="max-w-md">{children}</p>
    </div>
);

// --- StudioView MAIN COMPONENT ---
const StudioView: React.FC<StudioViewProps> = ({ theme, initialPrompt, onClearInitialPrompt }) => {

    // --- STATE MANAGEMENT ---
    const [projectName, setProjectName] = useState('My Awesome Project');
    const [isEditingProjectName, setIsEditingProjectName] = useState(false);
    const [localFiles, setLocalFiles] = useState<Map<string, Pick<StudioFile, 'content' | 'language'>>>(() => new Map());
    const [gitBase, setGitBase] = useState<Map<string, string>>(() => new Map());
    const [stagedFiles, setStagedFiles] = useState<Set<string>>(() => new Set());
    const [gitRemoteUrl, setGitRemoteUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [openTabs, setOpenTabs] = useState<Tab[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
    const [explanation, setExplanation] = useState('');
    const [nextSteps, setNextSteps] = useState<NextStep[]>([]);
    const [isExplorerOpen, setIsExplorerOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; path: string; type: 'file' | 'folder' } | null>(null);

    // New layout states
    const [activeSideView, setActiveSideView] = useState<SideViewType>('explorer');
    const [activeBottomTab, setActiveBottomTab] = useState<BottomTabType>('terminal');
    const [bottomPanelHeight, setBottomPanelHeight] = useState(DEFAULT_BOTTOM_PANEL_HEIGHT);
    const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
    
    // Lifted state for AI Chat
    const [studioChatMessages, setStudioChatMessages] = useState<StudioChatMessage[]>([]);
    const [isAiChatLoading, setIsAiChatLoading] = useState(false);
    const [aiMode, setAiMode] = useState<AiMode>('assistant');

    const mainContentAreaRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<TerminalHandle>(null);

    // --- RESIZE HANDLER ---
    const resizerRef = useRef<HTMLDivElement>(null);
    const handleResize = useCallback((e: MouseEvent) => {
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight > MIN_BOTTOM_PANEL_HEIGHT) {
            setBottomPanelHeight(newHeight);
        }
    }, []);

    const stopResize = useCallback(() => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', stopResize);
    }, [handleResize]);

    const startResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        window.addEventListener('mousemove', handleResize);
        window.addEventListener('mouseup', stopResize);
    }, [handleResize, stopResize]);
    
    useEffect(() => {
        if (mainContentAreaRef.current) {
            const containerHeight = mainContentAreaRef.current.clientHeight;
            // Set the bottom panel to be 40% of the container height
            const newHeight = containerHeight * 0.4;
            setBottomPanelHeight(Math.max(newHeight, MIN_BOTTOM_PANEL_HEIGHT));
        }
    }, []); // Run once on mount to set the initial 60/40 split

    const runAiTask = useCallback(async (prompt: string, systemInstruction: string) => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { systemInstruction } });
            return response.text;
        } catch (error) { console.error("AI Task Error:", error); return "An error occurred while communicating with the AI."; }
    }, []);

    const handleContentChange = (path: string, content: string, language?: string) => setLocalFiles(prev => new Map(prev).set(path, { content, language: language || prev.get(path)?.language || 'plaintext' }));
    const handleFileClick = (path: string, type: 'file' | 'diff' = 'file') => {
        const tabId = `${type}:${path}`;
        if (!openTabs.some(tab => tab.id === tabId)) setOpenTabs(prev => [...prev, { id: tabId, name: path.split('/').pop()!, path, icon: DocumentTextIcon }]);
        setActiveTabId(tabId); setIsExplorerOpen(false);
    };
    const handleCommit = (message: string) => {
        if (stagedFiles.size === 0) return;
        setGitBase(prev => {
            const next = new Map(prev);
            stagedFiles.forEach(path => {
                if (localFiles.has(path)) next.set(path, localFiles.get(path)!.content); else next.delete(path);
            });
            return next;
        });
        setStagedFiles(new Set());
    };
    
    const processAgentCommands = useCallback((responseText: string) => {
        const commandRegex = /\[COMMAND:(.*?):(.*?)\]/g;
        let match;
        while ((match = commandRegex.exec(responseText)) !== null) {
            try {
                const action = match[1];
                const payload = JSON.parse(match[2]);

                switch (action) {
                    case 'CREATE_FILE':
                    case 'WRITE_FILE':
                        if (payload.path && typeof payload.content === 'string') {
                            handleContentChange(payload.path, payload.content);
                            handleFileClick(payload.path);
                        }
                        break;
                    case 'RUN_TERMINAL':
                        if (payload.command) {
                            setActiveBottomTab('terminal');
                            terminalRef.current?.executeCommand(payload.command);
                        }
                        break;
                    case 'COMMIT':
                        if (payload.message) {
                            if (payload.stageAll) {
                                const allChangedPaths = new Set([...localFiles.keys(), ...gitBase.keys()].filter(path => {
                                    return localFiles.get(path)?.content !== gitBase.get(path) || !gitBase.has(path);
                                }));
                                setStagedFiles(allChangedPaths);
                                // Use a timeout to allow state to update before committing
                                setTimeout(() => handleCommit(payload.message), 100);
                            } else {
                                handleCommit(payload.message);
                            }
                        }
                        break;
                    default:
                        console.warn(`Unknown agent command: ${action}`);
                }
            } catch (error) {
                console.error("Failed to process agent command:", match[0], error);
            }
        }
        return responseText.replace(commandRegex, '').trim();
    }, [gitBase, localFiles]); // Dependencies for actions
    
    const handleStudioChat = useCallback(async (prompt: string) => {
        setIsAiChatLoading(true);
        setStudioChatMessages(prev => [...prev, { text: prompt, isUser: true }]);
        
        const assistantPrompt = "You are a helpful and expert pair programmer AI assistant integrated into a web IDE.";
        const agentPrompt = `You are an autonomous AI agent with full control over a web-based IDE. You can read, write, and execute commands. To perform actions, respond with special commands formatted as \`[COMMAND:ACTION:JSON_PAYLOAD]\`, where PAYLOAD is a valid JSON string. You must also provide a natural language explanation of your actions.
Available commands:
- \`CREATE_FILE\`: Creates a new file. Payload: \`{"path": "path/to/file.ext", "content": "file content"}\`
- \`WRITE_FILE\`: Overwrites an existing file. Payload: \`{"path": "path/to/file.ext", "content": "new content"}\`
- \`RUN_TERMINAL\`: Executes a command in the terminal. Payload: \`{"command": "npm install"}\`
- \`COMMIT\`: Commits staged changes. To stage all current changes and commit, use payload: \`{"message": "Your commit message", "stageAll": true}\`

Example: \`[COMMAND:CREATE_FILE:{"path":"src/App.js","content":"// New React component"}] I have created the new App.js component for you.\``;

        const systemInstruction = aiMode === 'agent' ? agentPrompt : assistantPrompt;
        
        const responseText = await runAiTask(prompt, systemInstruction);

        let displayResponse = responseText;
        if (aiMode === 'agent') {
            displayResponse = processAgentCommands(responseText);
        }

        setStudioChatMessages(prev => [...prev, { text: displayResponse, isUser: false }]);
        setIsAiChatLoading(false);
    }, [aiMode, runAiTask, processAgentCommands]);

    // --- FUNCTIONAL PANELS ---
    const TerminalPanel = useMemo(() => forwardRef<TerminalHandle, { 
      files: Map<string, Pick<StudioFile, 'content' | 'language'>>;
      onFileChange: (path: string, content: string, language?: string) => void;
      onFileDelete: (path: string) => void;
      onStage: (path: string) => void;
      onCommit: (message: string) => void;
      onClone: (url: string) => void;
      onGitInit: () => void;
      onSetRemote: (url: string) => void;
    }>(({ files, onFileChange, onFileDelete, onStage, onCommit, onClone, onGitInit, onSetRemote }, ref) => {
        const [lines, setLines] = useState<{type: 'output' | 'input', value: string}[]>([{type: 'output', value: 'Welcome to the simulated terminal. Type "help" for available commands.'}]);
        const [input, setInput] = useState('');
        const [cwd, setCwd] = useState('/');
        const endOfTerminalRef = useRef<HTMLDivElement>(null);
        useEffect(() => { endOfTerminalRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);

        const processCommand = (cmd: string) => {
            const [command, ...args] = cmd.trim().split(' ');
            let output = '';
            
            const addOutput = (val: string) => { output += (output ? '\n' : '') + val; };

            switch(command) {
                // Shell Commands
                case 'help': addOutput('Available commands:\n  help, ls/dir, cat, cd, pwd, mkdir, touch, rm/del, clear/cls, echo, whoami, git'); break;
                case 'ls': case 'dir':
                    const path = args[0] ? (args[0].startsWith('/') ? args[0] : `${cwd}${args[0]}`) : cwd;
                    const normalizedPath = path.endsWith('/') || path.length === 1 ? path : `${path}/`;
                    const entries = new Set(Array.from(files.keys())
                        .filter(p => p.startsWith(normalizedPath))
                        .map(p => p.substring(normalizedPath.length).split('/')[0])
                        .filter(Boolean));
                    addOutput(entries.size > 0 ? Array.from(entries).join('\n') : `ls: cannot access '${path}': No such file or directory`);
                    break;
                case 'cat':
                    if (args.length === 0) addOutput('Usage: cat <filename>');
                    else addOutput(files.get(args[0])?.content || `Error: File not found: ${args[0]}`);
                    break;
                case 'cd':
                    if (args[0] === '..') setCwd(prev => prev.substring(0, prev.lastIndexOf('/', prev.length - 2) + 1) || '/');
                    else if (args[0]) setCwd(prev => prev + args[0] + '/');
                    break;
                case 'pwd': addOutput(cwd); break;
                case 'mkdir':
                    if (args[0]) onFileChange(`${cwd}${args[0]}/.gitkeep`, '', 'plaintext'); else addOutput('usage: mkdir <directory>');
                    break;
                case 'touch':
                    if (args[0]) onFileChange(`${cwd}${args[0]}`, '', 'plaintext'); else addOutput('usage: touch <filename>');
                    break;
                case 'rm': case 'del':
                    if (args[0]) onFileDelete(`${cwd}${args[0]}`); else addOutput('usage: rm <filename>');
                    break;
                case 'clear': case 'cls': setLines([]); return;
                case 'whoami': addOutput('developer'); break;
                case 'echo': addOutput(args.join(' ')); break;
                case '': break;
                // Git Commands
                case 'git':
                    const [gitCmd, ...gitArgs] = args;
                    switch (gitCmd) {
                        case 'add': if(gitArgs[0]) { onStage(gitArgs[0]); addOutput(`Staged ${gitArgs[0]}`); } else { addOutput('usage: git add <file>'); } break;
                        case 'commit': if(gitArgs[0] === '-m' && gitArgs[1]) { onCommit(gitArgs.slice(1).join(' ')); addOutput('Committed changes.'); } else { addOutput('usage: git commit -m "<message>"'); } break;
                        case 'push': addOutput('Simulating push to remote...'); setTimeout(() => setLines(l => [...l, { type: 'output', value: 'Push successful.' }]), 1000); break;
                        case 'pull': addOutput('Simulating pull from remote...\nAlready up-to-date.'); break;
                        case 'init': onGitInit(); addOutput('Initialized empty Git repository.'); break;
                        case 'clone': if (gitArgs[0]) { onClone(gitArgs[0]); addOutput(`Cloning from ${gitArgs[0]}...`); } else { addOutput('usage: git clone <url>'); } break;
                        case 'remote': if (gitArgs[0] === 'add' && gitArgs[1] === 'origin' && gitArgs[2]) { onSetRemote(gitArgs[2]); addOutput('Set remote origin.'); } else { addOutput('usage: git remote add origin <url>'); } break;
                        default: addOutput(`git: '${gitCmd}' is not a git command. See 'git --help'.`);
                    }
                    break;
                default: addOutput(`Command not found: ${command}.`);
            }
            if (output) setLines(l => [...l, {type: 'output', value: output}]);
        };

        useImperativeHandle(ref, () => ({
            executeCommand: (cmd: string) => {
                setLines(l => [...l, {type: 'input', value: cmd}]);
                processCommand(cmd);
            }
        }));

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && input.trim()) {
                setLines([...lines, {type: 'input', value: input}]);
                processCommand(input);
                setInput('');
            }
        };

        return (
            <div className="h-full bg-black text-white font-mono text-sm p-4 overflow-y-auto" onClick={() => document.getElementById('terminal-input')?.focus()}>
                {lines.map((line, index) => (
                    <div key={index}>
                        {line.type === 'input' && <span className="text-green-400 mr-2">{cwd}$</span>}
                        <pre className="whitespace-pre-wrap break-words">{line.value}</pre>
                    </div>
                ))}
                <div className="flex"><span className="text-green-400 mr-2">{cwd}$</span><input id="terminal-input" type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} className="flex-1 bg-transparent border-none outline-none text-white" autoFocus/></div>
                <div ref={endOfTerminalRef} />
            </div>
        );
    }), []);
    
    const PreviewPanel: React.FC<{ files: Map<string, Pick<StudioFile, 'content' | 'language'>> }> = ({ files }) => {
        const [srcDoc, setSrcDoc] = useState('');
        const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
        const [refreshKey, setRefreshKey] = useState(0);

        useEffect(() => {
            const htmlFile = files.get('index.html') || Array.from(files.entries()).find(([path]) => path.endsWith('.html'))?.[1];
            if (!htmlFile) { setSrcDoc('<html><body>No index.html file found in the project.</body></html>'); return; }
            let content = htmlFile.content;
            for (const [path, file] of files.entries()) {
                if (path.endsWith('.css')) content = content.replace('</head>', `<style>${file.content}</style></head>`);
                if (path.endsWith('.js')) content = content.replace('</body>', `<script>${file.content}</script></body>`);
            }
            setSrcDoc(content);
        }, [files, refreshKey]);

        const deviceSizes = {
            desktop: '100%',
            tablet: '768px',
            mobile: '375px',
        };

        return (
            <div className="h-full flex flex-col bg-slate-200 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 p-1.5 border-b border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <button 
                        onClick={() => setRefreshKey(k => k + 1)} 
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700" 
                        title="Refresh Preview"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                    </button>
                    <div className="h-5 border-l border-slate-300 dark:border-slate-600"></div>
                    <button 
                        onClick={() => setDevice('desktop')}
                        className={`p-1.5 rounded ${device === 'desktop' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} 
                        title="Desktop View"
                    >
                        <ComputerDesktopIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setDevice('tablet')}
                        className={`p-1.5 rounded ${device === 'tablet' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} 
                        title="Tablet View (768px)"
                    >
                        <DeviceTabletIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setDevice('mobile')}
                        className={`p-1.5 rounded ${device === 'mobile' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} 
                        title="Mobile View (375px)"
                    >
                        <DevicePhoneMobileIcon className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-auto p-4 flex justify-center items-start">
                    <div 
                        className="bg-white shadow-lg transition-all duration-300 ease-in-out" 
                        style={{ width: deviceSizes[device], height: device === 'desktop' ? '100%' : 'calc(100% - 2rem)', maxHeight: device === 'desktop' ? 'none' : '812px', maxWidth: '100%' }}
                    >
                        <iframe 
                            key={refreshKey}
                            srcDoc={srcDoc} 
                            title="Live Preview" 
                            sandbox="allow-scripts" 
                            className="w-full h-full border-2 border-slate-300 dark:border-slate-700 rounded-md" 
                        />
                    </div>
                </div>
            </div>
        );
    };

    const DebuggerPanel: React.FC<{ file: StudioFile | null }> = ({ file }) => {
        const [result, setResult] = useState('');
        const [isDebugging, setIsDebugging] = useState(false);
        const handleDebug = async () => {
            if (!file) return;
            setIsDebugging(true); setResult('');
            const prompt = `Review the file "${file.path}" for bugs, performance issues, and best practices. Provide a concise, actionable summary in Markdown.\n\n\`\`\`${file.language}\n${file.content}\n\`\`\``;
            const res = await runAiTask(prompt, "You are an expert code debugger.");
            setResult(res); setIsDebugging(false);
        };
        if (!file) return <PlaceholderPanel icon={BugAntIcon} title="No File Selected">Open a file from the explorer to use the AI Debugger.</PlaceholderPanel>;
        return (
            <div className="h-full flex flex-col p-4 space-y-3">
                <h3 className="font-semibold">Debugger: <span className="font-mono text-indigo-600 dark:text-indigo-400">{file.path}</span></h3>
                <button onClick={handleDebug} disabled={isDebugging} className="text-sm inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-slate-400">
                    {isDebugging ? <><ArrowPathIcon className="w-4 h-4 animate-spin"/>Analyzing...</> : <><LogoIcon className="w-4 h-4"/>Run AI Analysis</>}
                </button>
                <div className="flex-1 overflow-y-auto pt-2 border-t dark:border-slate-700 prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result || 'Analysis results will appear here.'}</ReactMarkdown>
                </div>
            </div>
        );
    };

    const GitPanel: React.FC<{
        files: Map<string, Pick<StudioFile, 'content' | 'language'>>;
        base: Map<string, string>;
        staged: Set<string>;
        onStage: (path: string) => void;
        onUnstage: (path: string) => void;
        onCommit: (message: string) => void;
        onDiff: (path: string) => void;
        allChanges: Map<string, 'untracked' | 'modified' | 'deleted'>;
    }> = ({ files, base, staged, onStage, onUnstage, onCommit, onDiff, allChanges }) => {
        const [pushStatus, setPushStatus] = useState<'idle' | 'pushing' | 'success'>('idle');

        const stagedChanges = useMemo(() => new Map([...allChanges].filter(([path]) => staged.has(path))), [allChanges, staged]);
        const unstagedChanges = useMemo(() => new Map([...allChanges].filter(([path]) => !staged.has(path))), [allChanges, staged]);
    
        const handlePush = () => {
            if (pushStatus !== 'idle') return;
            setPushStatus('pushing');
            setTimeout(() => {
                setPushStatus('success');
                setTimeout(() => setPushStatus('idle'), 3000);
            }, 1500);
        };
        
        const ChangeEntry: React.FC<{ path: string, status: string, onAction: () => void, actionIcon: 'stage' | 'unstage', onDiff: () => void }> = ({ path, status, onAction, actionIcon, onDiff }) => (
            <div className="text-sm flex items-center gap-2 group hover:bg-slate-200 dark:hover:bg-slate-700/50">
                <button onClick={onDiff} className="flex items-center gap-2 px-4 py-1.5 flex-1 text-left truncate">
                  <FileIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate" title={path}>{path}</span>
                  <span className="ml-auto text-xs uppercase text-yellow-600 dark:text-yellow-400 font-bold" title={status}>{status.charAt(0)}</span>
                </button>
                <button onClick={onAction} title={actionIcon === 'stage' ? 'Stage file' : 'Unstage file'} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-300 dark:hover:bg-slate-600 mr-2">
                    {actionIcon === 'stage' ? <PlusIcon className="w-4 h-4" /> : <MinusIcon className="w-4 h-4" />}
                </button>
            </div>
        );

        return (
            <div className="h-full flex flex-col">
                <div className="p-4 border-b dark:border-slate-700 flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Source Control</h3>
                  <div className="flex items-center gap-2">
                    <button title="Pull" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><ArrowDownCircleIcon className="w-5 h-5"/></button>
                    <button onClick={handlePush} disabled={pushStatus !== 'idle' || allChanges.size > 0} title="Push" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"><ArrowUpCircleIcon className="w-5 h-5"/></button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Staged Changes ({stagedChanges.size})</p>
                        <div className="border rounded-md dark:border-slate-700 divide-y dark:divide-slate-700 overflow-hidden">
                            {stagedChanges.size === 0 && <div className="px-4 py-3 text-sm text-slate-500">No staged changes.</div>}
                            {Array.from(stagedChanges.entries()).map(([path, status]) => (
                                <ChangeEntry key={path} path={path} status={status} onAction={() => onUnstage(path)} actionIcon="unstage" onDiff={() => onDiff(path)} />
                            ))}
                        </div>
                    </div>
                    <div className="p-4">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Changes ({unstagedChanges.size})</p>
                         <div className="border rounded-md dark:border-slate-700 divide-y dark:divide-slate-700 overflow-hidden">
                            {unstagedChanges.size === 0 && allChanges.size === 0 && <div className="px-4 py-3 text-sm text-slate-500">No changes detected.</div>}
                            {Array.from(unstagedChanges.entries()).map(([path, status]) => (
                                <ChangeEntry key={path} path={path} status={status} onAction={() => onStage(path)} actionIcon="stage" onDiff={() => onDiff(path)} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 mt-auto space-y-2 border-t dark:border-slate-700">
                    <button 
                        onClick={() => onCommit("Default commit message")} 
                        disabled={staged.size === 0} 
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition-colors"
                    >
                        Commit {staged.size > 0 ? `${staged.size} Staged File(s)`: ''}
                    </button>
                </div>
            </div>
        );
    };

    const DeployPanel: React.FC = () => {
        const deployPlatforms = [ { name: 'Vercel', icon: VercelIcon }, { name: 'Firebase', icon: FirebaseIcon }, { name: 'Supabase', icon: SupabaseIcon }, { name: 'Appwrite', icon: AppwriteIcon }];
        const integrationPlatforms = [ { name: 'GitHub', icon: GitHubIcon }, { name: 'Google Drive', icon: GoogleDriveIcon }];
        return (
            <div className="h-full p-4 space-y-6 overflow-y-auto">
                <div>
                    <h3 className="font-semibold text-lg mb-4">Deploy Project</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {deployPlatforms.map(p => <button key={p.name} className="p-4 border dark:border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-center"><p.icon className="w-10 h-10"/><span className="font-semibold text-sm">{p.name}</span></button>)}
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-lg mb-4">Integrations</h3>
                    <div className="space-y-3">
                        {integrationPlatforms.map(p => <div key={p.name} className="p-3 border dark:border-slate-700 rounded-lg flex items-center justify-between gap-4"><div className="flex items-center gap-3"><p.icon className="w-6 h-6"/> <span className="font-semibold">{p.name}</span></div><button className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded-md hover:bg-slate-700 flex items-center gap-2"><LinkIcon className="w-4 h-4"/>Connect</button></div>)}
                    </div>
                </div>
            </div>
        );
    };
    
    const ExtensionsPanel: React.FC = () => {
        const extensions = [{ name: 'Prettier - Code formatter', pub: 'Prettier', installs: '30.5M', icon: DocumentTextIcon }, { name: 'ESLint', pub: 'Microsoft', installs: '25.1M', icon: PaintBrushIcon }, { name: 'GitLens — Git supercharged', pub: 'GitKraken', installs: '21.9M', icon: GitHubIcon }];
        return (
            <div className="p-4 h-full overflow-y-auto">
                <h3 className="font-semibold text-lg mb-4">Extensions Marketplace</h3>
                <div className="space-y-3">
                    {extensions.map(ext => <div key={ext.name} className="p-3 border dark:border-slate-700 rounded-lg flex items-start gap-3"><div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-md mt-1"><ext.icon className="w-5 h-5 text-slate-500 dark:text-slate-400"/></div><div className="flex-1"><h4 className="font-semibold">{ext.name}</h4><p className="text-xs text-slate-500 dark:text-slate-400">{ext.pub} &bull; {ext.installs} installs</p></div><button className="ml-4 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Install</button></div>)}
                </div>
            </div>
        );
    };

    const AICodeBlock: React.FC<{ code: string; language: string | undefined; onInsert: (code: string) => void; theme: string; }> = ({ code, language, onInsert, theme }) => (
        <div className="relative group my-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center justify-between bg-slate-200 dark:bg-slate-900/50 px-4 py-1 border-b border-slate-300 dark:border-slate-700">
                <span className="text-xs font-sans font-medium uppercase text-slate-500 dark:text-slate-400">{language || 'code'}</span>
                <button
                    onClick={() => onInsert(code)}
                    className="flex items-center gap-1.5 text-xs font-sans text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    title="Insert code into active editor file"
                >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    Insert to Editor
                </button>
            </div>
            <SyntaxHighlighter style={theme === 'dark' ? oneDark : prism} language={language} PreTag="div" customStyle={{ margin: 0, padding: '0.5rem 1rem' }}>
                {code}
            </SyntaxHighlighter>
        </div>
    );

    const AIChatPanel: React.FC<{
        messages: StudioChatMessage[];
        isLoading: boolean;
        onSend: (prompt: string) => void;
        onGenerateCode: (prompt: string) => void;
        mode: AiMode;
        onModeChange: (mode: AiMode) => void;
        onInsertCode: (code: string) => void;
    }> = ({ messages, isLoading, onSend, onGenerateCode, mode, onModeChange, onInsertCode }) => {
        const messagesEndRef = useRef<HTMLDivElement>(null);
        const [codePrompt, setCodePrompt] = useState('');
        useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

        return (
            <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-800/50">
                 <div className="p-4 border-b dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                         <h3 className="font-semibold text-lg">AI Assistant</h3>
                         <div className="flex items-center gap-2 text-sm">
                             <span className={mode === 'assistant' ? 'font-bold text-indigo-600' : ''}>Assistant</span>
                             <button onClick={() => onModeChange(mode === 'assistant' ? 'agent' : 'assistant')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${mode === 'agent' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`} title={`Switch to ${mode === 'assistant' ? 'Agent' : 'Assistant'} Mode`}>
                                 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mode === 'agent' ? 'translate-x-6' : 'translate-x-1'}`}/>
                             </button>
                             <span className={mode === 'agent' ? 'font-bold text-indigo-600' : ''}>Agent</span>
                         </div>
                    </div>
                    {mode === 'assistant' && (
                        <>
                            <textarea value={codePrompt} onChange={e => setCodePrompt(e.target.value)} placeholder="e.g., a React login form" rows={2} className="w-full p-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"></textarea>
                            <button onClick={() => { if(codePrompt) { onGenerateCode(codePrompt); setCodePrompt(''); } }} disabled={!codePrompt || isLoading} className="w-full mt-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-slate-400">Generate Code</button>
                        </>
                    )}
                     {mode === 'agent' && <p className="text-xs text-slate-500 dark:text-slate-400">Agent mode is active. The AI can now perform actions like writing files and running commands.</p>}
                </div>
                <h3 className="font-semibold text-lg p-4 pb-0">Chat</h3>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-sm lg:max-w-md p-3 rounded-2xl ${msg.isUser ? 'bg-indigo-600 text-white rounded-br-lg' : 'bg-slate-200 dark:bg-slate-700 rounded-bl-lg'}`}>
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                        // FIX: Added 'any' type to props to resolve TypeScript error for 'inline' property.
                                        code: ({node, inline, className, children, ...props}: any) => {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const codeText = String(children).replace(/\n$/, '');
                                            return !inline && !msg.isUser ? (
                                                <AICodeBlock code={codeText} language={match?.[1]} onInsert={onInsertCode} theme={theme} />
                                            ) : (
                                                <code className={className} {...props}>{children}</code>
                                            )
                                        }
                                    }}>{msg.text}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && <div className="flex justify-start"><div className="p-3 rounded-2xl bg-slate-200 dark:bg-slate-700">...</div></div>}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-2 border-t border-slate-200 dark:border-slate-700/50">
                    <ChatInput onSend={onSend} disabled={isLoading} />
                </div>
            </div>
        );
    };

    const PriorityIndicator: React.FC<{ priority: string }> = ({ priority }) => {
        const priorityClasses: { [key: string]: string } = {
            High: 'bg-red-500',
            Medium: 'bg-yellow-500',
            Low: 'bg-sky-500',
        };
        return (
            <span 
                className={`w-2.5 h-2.5 rounded-full mr-3 mt-1.5 inline-block flex-shrink-0 ${priorityClasses[priority] || 'bg-slate-400'}`} 
                title={`Priority: ${priority}`}
            ></span>
        );
    };

    const AIConsolePanel: React.FC<{
        explanation: string;
        nextSteps: NextStep[];
        isLoadingProject: boolean;
        messages: StudioChatMessage[];
        isChatLoading: boolean;
        onSend: (prompt: string) => void;
        onInsertCode: (code: string) => void;
    }> = ({ explanation, nextSteps, isLoadingProject, messages, isChatLoading, onSend, onInsertCode }) => {
        const messagesEndRef = useRef<HTMLDivElement>(null);
        useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

        return (
            <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoadingProject && !explanation ? (
                        <div className="flex items-center space-x-2 text-slate-500"><LogoIcon className="w-4 h-4 animate-spin"/><span>Generating project...</span></div>
                    ) : (
                        (explanation || nextSteps.length > 0) && (
                            <div className="prose prose-sm dark:prose-invert max-w-none mb-6 pb-4 border-b dark:border-slate-700">
                               {explanation && <><h4>Explanation</h4><ReactMarkdown remarkPlugins={[remarkGfm]}>{explanation}</ReactMarkdown></>}
                               {nextSteps.length > 0 && (
                                <>
                                  <h4 className="mt-6">Next Steps</h4>
                                  <ul className="list-none pl-0 space-y-2">
                                    {nextSteps.map((step, i) => (
                                      <li key={i} className="flex items-start">
                                        <PriorityIndicator priority={step.priority} />
                                        <div className="prose prose-sm dark:prose-invert max-w-none -mt-1"><ReactMarkdown remarkPlugins={[remarkGfm]}>{step.text}</ReactMarkdown></div>
                                      </li>
                                    ))}
                                  </ul>
                                </>
                               )}
                            </div>
                        )
                    )}
                    <div className="space-y-4">
                         {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs md:max-w-sm lg:max-w-md p-3 rounded-2xl ${msg.isUser ? 'bg-indigo-600 text-white rounded-br-lg' : 'bg-slate-200 dark:bg-slate-700 rounded-bl-lg'}`}>
                                     <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                            // FIX: Added 'any' type to props to resolve TypeScript error for 'inline' property.
                                            code: ({node, inline, className, children, ...props}: any) => {
                                                const match = /language-(\w+)/.exec(className || '');
                                                const codeText = String(children).replace(/\n$/, '');
                                                return !inline && !msg.isUser ? (
                                                    <AICodeBlock code={codeText} language={match?.[1]} onInsert={onInsertCode} theme={theme} />
                                                ) : (
                                                    <code className={className} {...props}>{children}</code>
                                                )
                                            }
                                        }}>{msg.text}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isChatLoading && <div className="flex justify-start"><div className="p-3 rounded-2xl bg-slate-200 dark:bg-slate-700">...</div></div>}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
                <div className="p-2 border-t border-slate-200 dark:border-slate-700/50">
                    <ChatInput onSend={onSend} disabled={isChatLoading} />
                </div>
            </div>
        );
    };
    
    const DiffViewer: React.FC<{ oldContent: string; newContent: string; theme: string }> = ({ oldContent, newContent, theme }) => {
      const diffLines = useMemo(() => {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        const result: { type: 'add' | 'del' | 'same'; line: string }[] = [];
        let oldIdx = 0, newIdx = 0;
        while (oldIdx < oldLines.length || newIdx < newLines.length) {
          if (oldIdx < oldLines.length && (newIdx >= newLines.length || oldLines[oldIdx] !== newLines[newIdx])) {
            if (newLines.includes(oldLines[oldIdx])) {
              while (newIdx < newLines.length && oldLines[oldIdx] !== newLines[newIdx]) {
                result.push({ type: 'add', line: newLines[newIdx++] });
              }
            } else {
              result.push({ type: 'del', line: oldLines[oldIdx++] });
            }
          } else if (newIdx < newLines.length && (oldIdx >= oldLines.length || oldLines[oldIdx] !== newLines[newIdx])) {
            result.push({ type: 'add', line: newLines[newIdx++] });
          } else {
            result.push({ type: 'same', line: oldLines[oldIdx] });
            oldIdx++; newIdx++;
          }
        }
        return result;
      }, [oldContent, newContent]);

      return (
        <div className={`h-full overflow-auto font-mono text-sm p-4 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
          {diffLines.map((item, index) => (
            <div key={index} className={`flex ${
                item.type === 'add' ? 'bg-green-500/20' : 
                item.type === 'del' ? 'bg-red-500/20' : ''
            }`}>
              <span className={`w-10 text-right pr-4 ${item.type === 'add' ? 'text-green-500' : item.type === 'del' ? 'text-red-500' : 'text-slate-500'}`}>
                {item.type === 'add' ? '+' : item.type === 'del' ? '-' : ' '}
              </span>
              <pre className="whitespace-pre-wrap">{item.line}</pre>
            </div>
          ))}
        </div>
      );
    };

    // --- DERIVED STATE ---
    const allChanges = useMemo(() => {
        const changesMap = new Map<string, 'untracked' | 'modified' | 'deleted'>();
        const allPaths = new Set([...localFiles.keys(), ...gitBase.keys()]);
        allPaths.forEach(path => {
            if (localFiles.has(path) && !gitBase.has(path)) changesMap.set(path, 'untracked');
            else if (!localFiles.has(path) && gitBase.has(path)) changesMap.set(path, 'deleted');
            else if (localFiles.has(path) && gitBase.has(path) && localFiles.get(path)?.content !== gitBase.get(path)) changesMap.set(path, 'modified');
        });
        return changesMap;
    }, [localFiles, gitBase]);

    const fileTree = useMemo(() => buildFileTree(localFiles), [localFiles]);
    const activeFile = useMemo(() => {
        const tab = openTabs.find(t => t.id === activeTabId);
        if (!tab?.path) return null;
        // FIX: Cast `tab.path` to string to resolve 'unknown' type error on 'startsWith'.
        if ((tab.path as string).startsWith('diff:')) {
            // FIX: Cast `tab.path` to string to resolve 'unknown' type error on 'substring'.
            const path = (tab.path as string).substring(5);
            return {
                path: tab.path,
                content: localFiles.get(path)?.content ?? '',
                language: 'diff',
                oldContent: gitBase.get(path) ?? ''
            };
        }
        if (localFiles.has(tab.path)) {
            return { path: tab.path, ...localFiles.get(tab.path)! };
        }
        return null;
    }, [activeTabId, openTabs, localFiles, gitBase]);


    // --- PERSISTENCE ---
    const saveStateToLocalStorage = useCallback(() => {
        try {
            const state = { projectName, files: Array.from(localFiles.entries()), base: Array.from(gitBase.entries()), staged: Array.from(stagedFiles), remote: gitRemoteUrl, tabs: openTabs, active: activeTabId, expanded: Array.from(expandedFolders) };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) { console.error("Failed to save project state:", error); }
    }, [projectName, localFiles, gitBase, stagedFiles, gitRemoteUrl, openTabs, activeTabId, expandedFolders]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const s = JSON.parse(saved);
                setProjectName(s.projectName || 'My Project'); setLocalFiles(new Map(s.files || [])); setGitBase(new Map(s.base || [])); setStagedFiles(new Set(s.staged || [])); setGitRemoteUrl(s.remote || null); setOpenTabs(s.tabs || []); setActiveTabId(s.active); setExpandedFolders(new Set(s.expanded || []));
            } else {
                const initialContent = '# Welcome!\n\nUse the AI assistant to start building.';
                setLocalFiles(new Map([['README.md', { language: 'markdown', content: initialContent }]]));
                setGitBase(new Map([['README.md', initialContent]]));
                const initialTab = { id: 'file:README.md', name: 'README.md', path: 'README.md', icon: DocumentTextIcon };
                setOpenTabs([initialTab]);
                setActiveTabId(initialTab.id);
            }
        } catch (error) { console.error("Failed to load project state:", error); localStorage.removeItem(STORAGE_KEY); }
    }, []);

    useEffect(() => { const h = setTimeout(saveStateToLocalStorage, 1500); return () => clearTimeout(h); }, [saveStateToLocalStorage]);


    // --- CORE LOGIC ---
    const handleProjectGeneration = useCallback(async (prompt: string, isClone = false) => {
        setIsLoading(true); setExplanation("Generating project structure..."); setNextSteps([]); setActiveBottomTab('explanation');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const responseSchema = { 
                type: Type.OBJECT, 
                properties: { 
                    projectName: { type: Type.STRING }, 
                    files: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { path: { type: Type.STRING }, language: { type: Type.STRING }, content: { type: Type.STRING } } } }, 
                    explanation: { type: Type.STRING }, 
                    nextSteps: { 
                        type: Type.ARRAY, 
                        items: { 
                            type: Type.OBJECT, 
                            properties: { 
                                text: { type: Type.STRING }, 
                                priority: { type: Type.STRING } 
                            } 
                        } 
                    } 
                } 
            };
            const fullPrompt = `Based on: "${prompt}", create a complete, runnable web app. Current files: ${isClone ? 'none' : Array.from(localFiles.keys()).join(', ')}. Generate all necessary files (package.json, index.html, JS/TS, CSS). For each next step, assign a priority ('High', 'Medium', or 'Low'). Return ONLY the JSON object matching the schema.`;

            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: fullPrompt, config: { responseMimeType: "application/json", responseSchema } });
            
            let parsed: StudioContent; try { let jsonStr = response.text.trim(); if (/```json/.test(jsonStr)) jsonStr = jsonStr.match(/```json\s*([\s\S]*?)\s*```/)![1]; parsed = JSON.parse(jsonStr); } catch (e) { console.error("JSON Parse Error:", e, "Raw:", response.text); setExplanation(`Studio AI error: Failed to process response.\n\nRaw:\n\`\`\`\n${response.text}\n\`\`\``); return; }

            setProjectName(parsed.projectName); setExplanation(parsed.explanation); setNextSteps(parsed.nextSteps || []);
            const newFileMap = new Map<string, Pick<StudioFile, 'content' | 'language'>>();
            const newBaseMap = new Map<string, string>();
            parsed.files.forEach(f => { newFileMap.set(f.path, { content: f.content, language: f.language }); newBaseMap.set(f.path, f.content); });
            setLocalFiles(newFileMap); setGitBase(newBaseMap);
            setStagedFiles(new Set());
            const newTabs = parsed.files.slice(0, 5).map(f => ({ id: `file:${f.path}`, name: f.path.split('/').pop()!, path: f.path, icon: DocumentTextIcon }));
            setOpenTabs(newTabs); setActiveTabId(newTabs[0]?.id || null);
            setExpandedFolders(new Set(parsed.files.map(f => f.path.substring(0, f.path.lastIndexOf('/'))).filter(Boolean)));
        } catch (error) { console.error("Error:", error); setExplanation("An AI error occurred. Please check console."); } finally { setIsLoading(false); }
    }, [localFiles]);

    useEffect(() => { if (initialPrompt) { handleProjectGeneration(initialPrompt); onClearInitialPrompt(); } }, [initialPrompt, handleProjectGeneration, onClearInitialPrompt]);
    
    // --- EVENT HANDLER REFACTOR ---
    const handleTabClose = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation();
        const tabIndex = openTabs.findIndex(t => t.id === tabId);
        const newTabs = openTabs.filter(t => t.id !== tabId);
        setOpenTabs(newTabs);
        if (activeTabId === tabId) setActiveTabId(newTabs[Math.max(0, tabIndex - 1)]?.id || null);
    };
    
    const toggleFolder = (path: string) => setExpandedFolders(prev => { const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n; });
    
    const handleCreateItem = (type: 'file' | 'folder') => {
        const promptText = type === 'file' ? "Enter new file path:" : "Enter new folder path (e.g., new-folder/):";
        const path = prompt(promptText);
        if (!path) return;
        const finalPath = type === 'folder' ? `${path.replace(/\/$/, '')}/.gitkeep` : path;
        if (!localFiles.has(finalPath)) {
            handleContentChange(finalPath, '', 'plaintext');
            if (type === 'file') handleFileClick(finalPath);
        }
    };
    
    const handleDelete = (path: string, type: 'file' | 'folder') => {
        if (!confirm(`Are you sure you want to delete this ${type}?\n${path}`)) return;
        setLocalFiles(prev => {
            const next = new Map(prev);
            if (type === 'file') {
                next.delete(path);
            } else {
                for (const p of next.keys()) if (p.startsWith(path + '/')) next.delete(p);
            }
            return next;
        });
        setStagedFiles(prev => { const next = new Set(prev); for (const p of next) if (p === path || (p as string).startsWith(path + '/')) next.delete(p); return next; });
        setOpenTabs(prev => prev.filter(t => t.path !== path && !(t.path as string)?.startsWith(path + '/')));
    };

    const handleStage = (path: string) => setStagedFiles(prev => new Set(prev).add(path));
    const handleUnstage = (path: string) => setStagedFiles(prev => { const next = new Set(prev); next.delete(path); return next; });

    const handleGitInit = () => {
        setGitBase(new Map(Array.from(localFiles.entries()).map(([k, v]) => [k, v.content])));
        setStagedFiles(new Set());
    };
    
    const handleGenerateCode = async (prompt: string) => {
        setIsAiChatLoading(true);
        const code = await runAiTask(prompt, "You are a code generation expert. Generate only the code for the following prompt. Do not include any explanation or markdown formatting.");
        const fileExtension = prompt.toLowerCase().includes('react') || prompt.toLowerCase().includes('jsx') ? 'tsx' : 'js';
        const newFilePath = `generated-code-${Date.now()}.${fileExtension}`;
        handleContentChange(newFilePath, code, 'javascript');
        handleFileClick(newFilePath);
        setIsAiChatLoading(false);
    };
    
    const handleInsertCode = useCallback((codeToInsert: string) => {
        if (activeFile && !(activeFile.path as string).startsWith('diff:')) {
            const currentContent = activeFile.content;
            handleContentChange(activeFile.path, currentContent + '\n' + codeToInsert);
        } else {
            alert('Please open a file in the editor first to insert code.');
        }
    }, [activeFile]);

    const handleContextMenu = (e: React.MouseEvent, path: string, type: 'file' | 'folder') => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.pageX, y: e.pageY, path, type });
    };

    const handleRenameOrMove = (oldPath: string, newPath: string, type: 'file' | 'folder') => {
        const updateState = (updateFn: (p: string) => string) => (prev: Map<string, any> | Set<string>) => {
            if (prev instanceof Map) {
                const next = new Map(prev);
                const toUpdate: [string, any][] = [];
                for (const [key, value] of next.entries()) {
                    if (key === oldPath || (type === 'folder' && key.startsWith(oldPath + '/'))) {
                        toUpdate.push([key, value]);
                    }
                }
                toUpdate.forEach(([key, value]) => {
                    next.delete(key);
                    next.set(updateFn(key), value);
                });
                return next;
            } else { // Set
                // FIX: Cast p to string as it's inferred as 'unknown' from the Set iterator.
                return new Set(Array.from(prev).map(p => updateFn(p as string)))
            }
        };

        const updatePath = (p: string) => p.startsWith(oldPath) ? newPath + p.substring(oldPath.length) : p;

        setLocalFiles(updateState(updatePath) as any);
        setGitBase(updateState(updatePath) as any);
        setStagedFiles(updateState(updatePath) as any);
        setOpenTabs(prev => prev.map(t => {
            // FIX: Cast t.path to string to resolve 'unknown' type error for startsWith.
            if (t.path === oldPath || (type === 'folder' && (t.path as string)?.startsWith(oldPath + '/'))) {
                const updatedPath = updatePath(t.path as string);
                return { ...t, path: updatedPath, name: updatedPath.split('/').pop()!, id: t.id.split(':')[0] + ':' + updatedPath };
            }
            return t;
        }));
        if (activeTabId?.includes(oldPath)) {
            const activeType = activeTabId.split(':')[0];
            setActiveTabId(activeType + ':' + updatePath(activeTabId.substring(activeType.length + 1)));
        }
        if (type === 'folder') {
            setExpandedFolders(prev => {
                // FIX: Cast p to string as it's inferred as 'unknown' from the Set iterator for startsWith and substring.
                const next = new Set(Array.from(prev).map(p => (p as string).startsWith(oldPath) ? newPath + (p as string).substring(oldPath.length) : p));
                if (next.has(oldPath)) { next.delete(oldPath); next.add(newPath); }
                return next;
            });
        }
    };

    const handleRename = (oldPath: string, type: 'file' | 'folder') => {
        const oldName = oldPath.split('/').pop()!;
        const newName = prompt(`Rename ${type}:`, oldName);
        if (!newName || newName === oldName) return;

        const newPath = oldPath.substring(0, oldPath.lastIndexOf('/')) + (oldPath.includes('/') ? '/' : '') + newName;
        handleRenameOrMove(oldPath, newPath, type);
    };

    const handleMove = (oldPath: string, type: 'file' | 'folder') => {
        const oldName = oldPath.split('/').pop()!;
        const currentDir = oldPath.substring(0, oldPath.lastIndexOf('/')) || '/';
        const newDir = prompt(`Enter the new directory path for "${oldName}":`, currentDir);
        if (newDir === null || newDir === currentDir) return;
        const newPath = `${newDir.replace(/\/$/, '')}/${oldName}`;
        handleRenameOrMove(oldPath, newPath, type);
    }
    
    const handleDuplicate = (path: string, type: 'file' | 'folder') => {
        if (type === 'folder') {
            alert("Duplicating folders is not supported yet.");
            return;
        }
        const parts = path.split('.');
        const ext = parts.length > 1 ? '.' + parts.pop() : '';
        const base = parts.join('.');
        let newPath = `${base}-copy${ext}`;
        let i = 2;
        while (localFiles.has(newPath)) {
            newPath = `${base}-copy-${i++}${ext}`;
        }
        const file = localFiles.get(path);
        if (file) {
            setLocalFiles(prev => new Map(prev).set(newPath, file));
        }
    };

    const SideNavItems = [
        { type: 'explorer', icon: FileIcon, name: 'Explorer' }, { type: 'git', icon: GitHubIcon, name: 'Source Control' }, 
        { type: 'debug', icon: BugAntIcon, name: 'Debugger' }, { type: 'extensions', icon: PuzzlePieceIcon, name: 'Extensions' },
        { type: 'ai', icon: LogoIcon, name: 'AI Assistant' }
    ];

    const BottomNavItems = [
        { type: 'terminal', icon: TerminalIcon, name: 'Terminal'}, { type: 'explanation', icon: DocumentTextIcon, name: 'AI Console' },
        { type: 'preview', icon: ComputerDesktopIcon, name: 'Live Preview'}, { type: 'deploy', icon: CloudArrowUpIcon, name: 'Deployments' },
    ];

    return (
        <div className="flex h-full w-full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 overflow-hidden">
            {contextMenu?.visible && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} onRename={handleRename} onDuplicate={handleDuplicate} onMove={handleMove} onDelete={handleDelete} />}

            {/* Mobile Sidebar Overlay */}
            <div className={`fixed inset-0 bg-black/30 z-30 lg:hidden transition-opacity ${isExplorerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsExplorerOpen(false)}></div>
            
            {/* Activity Bar */}
            <div className="w-14 bg-slate-200/50 dark:bg-black/20 flex flex-col items-center justify-between py-4">
                <div className="flex flex-col items-center gap-4">
                    <button onClick={() => setIsExplorerOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-300/50 dark:hover:bg-slate-700/50"><MenuIcon className="w-6 h-6"/></button>
                    {SideNavItems.map(item => <button key={item.type} onClick={() => setActiveSideView(item.type as SideViewType)} title={item.name} className={`p-2 rounded-lg transition-colors ${activeSideView === item.type ? 'bg-indigo-200 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-300/50 dark:hover:bg-slate-700/50'}`}><item.icon className="w-6 h-6" /></button>)}
                </div>
                <button title="Settings" className="p-2 rounded-lg hover:bg-slate-300/50 dark:hover:bg-slate-700/50"><PaintBrushIcon className="w-6 h-6" /></button>
            </div>
            
            {/* Sidebar */}
            <aside className={`absolute lg:static top-0 left-0 w-72 h-full bg-slate-100 dark:bg-slate-900 z-40 transform transition-transform lg:translate-x-0 ${isExplorerOpen ? 'translate-x-0' : '-translate-x-full'} lg:w-64 border-r dark:border-slate-700/50 flex flex-col`}>
                <header className="p-3 border-b dark:border-slate-700/50 shrink-0 flex items-center justify-between gap-2">
                    {activeSideView === 'explorer' ? (
                        isEditingProjectName ? (
                            <input
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                onBlur={() => setIsEditingProjectName(false)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setIsEditingProjectName(false); }}
                                className="w-full bg-slate-200 dark:bg-slate-700 border-0 rounded p-1 text-sm font-semibold outline-none ring-1 ring-indigo-500"
                                autoFocus
                            />
                        ) : (
                            <h2
                                className="font-semibold uppercase text-sm tracking-wider cursor-pointer hover:underline truncate"
                                onClick={() => setIsEditingProjectName(true)}
                                title="Click to rename project"
                            >
                                {projectName}
                            </h2>
                        )
                    ) : (
                         <h2 className="font-semibold uppercase text-sm tracking-wider">{activeSideView}</h2>
                    )}

                    {activeSideView === 'explorer' && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => handleCreateItem('file')} title="New File" className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><FilePlusIcon className="w-5 h-5"/></button>
                            <button onClick={() => handleCreateItem('folder')} title="New Folder" className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><FolderPlusIcon className="w-5 h-5"/></button>
                        </div>
                    )}
                     <button onClick={() => setIsExplorerOpen(false)} className="lg:hidden flex-shrink-0"><CloseIcon className="w-5 h-5"/></button>
                </header>
                <div className="flex-1 overflow-y-auto">
                    {activeSideView === 'explorer' && <FileTree nodes={fileTree} onFileClick={(path) => handleFileClick(path, 'file')} onDelete={handleDelete} onContextMenu={handleContextMenu} expandedFolders={expandedFolders} onToggleFolder={toggleFolder} allChanges={allChanges} stagedFiles={stagedFiles} />}
                    {activeSideView === 'git' && <GitPanel files={localFiles} base={gitBase} staged={stagedFiles} onStage={handleStage} onUnstage={handleUnstage} onCommit={handleCommit} onDiff={(path) => handleFileClick(path, 'diff')} allChanges={allChanges} />}
                    {activeSideView === 'debug' && <DebuggerPanel file={activeFile && !(activeFile.path as string).startsWith('diff:') ? activeFile : null} />}
                    {activeSideView === 'extensions' && <ExtensionsPanel />}
                    {activeSideView === 'ai' && <AIChatPanel messages={studioChatMessages} isLoading={isAiChatLoading} onSend={handleStudioChat} onGenerateCode={handleGenerateCode} mode={aiMode} onModeChange={setAiMode} onInsertCode={handleInsertCode} />}
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden" ref={mainContentAreaRef}>
                {/* Editor Tabs */}
                <div className="flex items-center border-b dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 overflow-x-auto no-scrollbar">
                    {openTabs.map(tab => <button key={tab.id} onClick={() => setActiveTabId(tab.id)} className={`flex items-center justify-between gap-2 text-sm p-2 border-r dark:border-slate-700/50 cursor-pointer whitespace-nowrap ${activeTabId === tab.id ? 'bg-white dark:bg-slate-800' : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}><div className="flex items-center gap-2"><tab.icon className="w-4 h-4"/><span>{tab.name}</span></div><div onClick={(e) => handleTabClose(e, tab.id)} className="p-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-600"><CloseIcon className="w-3.5 h-3.5"/></div></button>)}
                </div>
                
                {/* Editor / Diff Viewer */}
                <div className="flex-1 min-h-0">
                    {activeFile ? (
                        activeFile.language === 'diff' ? (
                            <DiffViewer oldContent={activeFile.oldContent!} newContent={activeFile.content} theme={theme} />
                        ) : (
                            <CodeEditor content={activeFile.content} language={activeFile.language} onContentChange={(c) => handleContentChange(activeFile.path!, c)} theme={theme} />
                        )
                    ) : <PlaceholderPanel icon={FileIcon} title="No File Open">Select a file from the explorer to begin editing.</PlaceholderPanel>}
                </div>
                
                {/* Bottom Panel Resizer */}
                {isBottomPanelOpen && <div ref={resizerRef} onMouseDown={startResize} className="w-full h-1.5 bg-slate-200 dark:bg-slate-700/50 cursor-row-resize hover:bg-indigo-400 transition-colors"></div>}

                {/* Bottom Panel */}
                <div className="w-full bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700/50" style={{ height: isBottomPanelOpen ? `${bottomPanelHeight}px` : 'auto' }}>
                    <div className="flex items-center border-b dark:border-slate-700/50 overflow-x-auto no-scrollbar">
                        {BottomNavItems.map(item => <button key={item.type} onClick={() => { setActiveBottomTab(item.type as BottomTabType); setIsBottomPanelOpen(true); }} className={`flex items-center gap-2 text-sm p-2 cursor-pointer whitespace-nowrap ${activeBottomTab === item.type && isBottomPanelOpen ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}><item.icon className="w-4 h-4"/><span>{item.name}</span></button>)}
                        <div className="flex-1"></div>
                        <button onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)} className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-700/50">{isBottomPanelOpen ? <ChevronDownIcon className="w-5 h-5"/> : <ChevronUpIcon className="w-5 h-5"/>}</button>
                    </div>
                    {isBottomPanelOpen && (
                        <div className="h-full pb-10">
                            {activeBottomTab === 'terminal' && <TerminalPanel ref={terminalRef} files={localFiles} onFileChange={handleContentChange} onFileDelete={(path) => handleDelete(path, 'file')} onStage={handleStage} onCommit={handleCommit} onClone={(url) => handleProjectGeneration(url, true)} onGitInit={handleGitInit} onSetRemote={setGitRemoteUrl} />}
                            {activeBottomTab === 'explanation' && <AIConsolePanel explanation={explanation} nextSteps={nextSteps} isLoadingProject={isLoading} messages={studioChatMessages} isChatLoading={isAiChatLoading} onSend={handleStudioChat} onInsertCode={handleInsertCode} />}
                            {activeBottomTab === 'preview' && <PreviewPanel files={localFiles} />}
                            {activeBottomTab === 'deploy' && <DeployPanel />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// A small helper icon that was missing from the generated code
const ChevronUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
);


export default StudioView;