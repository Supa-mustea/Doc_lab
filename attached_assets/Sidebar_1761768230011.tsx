import React from 'react';
import { NewChatIcon, SettingsIcon, SunIcon, MoonIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ConversationIcon, DownloadIcon, LogoIcon, CodeBracketSquareIcon, ChatBubbleLeftRightIcon } from './icons';

interface SidebarProps {
  onNewChat: () => void;
  model: string;
  onModelChange: (model: string) => void;
  theme: string;
  toggleTheme: () => void;
  responseMode: 'text' | 'voice';
  toggleResponseMode: () => void;
  isConversationMode: boolean;
  toggleConversationMode: () => void;
  onDownloadChat: () => void;
  currentView: 'chat' | 'studio';
  onSetView: (view: 'chat' | 'studio') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    onNewChat, model, onModelChange, theme, toggleTheme, responseMode, 
    toggleResponseMode, isConversationMode, toggleConversationMode, onDownloadChat,
    currentView, onSetView
}) => {
  return (
    <aside className="hidden md:flex w-72 h-screen bg-slate-50 dark:bg-black/20 flex-col justify-between p-4 border-r border-slate-200 dark:border-slate-800">
      <div>
        <div className="flex items-center gap-2 px-2 pb-6 mb-4 border-b border-slate-200 dark:border-slate-800">
          <LogoIcon className="w-8 h-8 text-indigo-500" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Dr's Lab AI</h1>
        </div>
        
        <div className="space-y-2 mb-6">
            <button 
              onClick={() => onSetView('chat')}
              className={`w-full flex items-center p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300 ${currentView === 'chat' ? 'bg-slate-200 dark:bg-slate-700/80' : 'hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}
              aria-label="Chat View"
              title="Switch to Chat View"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5 mr-3" />
              <span className="font-medium">Chat</span>
            </button>
            <button 
              onClick={() => onSetView('studio')}
              className={`w-full flex items-center p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300 ${currentView === 'studio' ? 'bg-slate-200 dark:bg-slate-700/80' : 'hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}
              aria-label="Studio View"
              title="Switch to Studio View"
            >
              <CodeBracketSquareIcon className="w-5 h-5 mr-3" />
              <span className="font-medium">Studio</span>
            </button>
        </div>


        <div className="mb-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button 
            onClick={onNewChat} 
            className="w-full flex items-center p-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300" 
            aria-label="New Chat"
            title="Start a new conversation"
          >
            <NewChatIcon className="w-5 h-5 mr-3" />
            <span className="font-medium">New Chat</span>
          </button>
           <div className="mt-4">
              <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
                Model
              </label>
              <select
                id="model-select"
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                aria-label="Select AI Model"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              </select>
            </div>
        </div>
      </div>
      
      <div className="space-y-2">
         <button
          onClick={toggleConversationMode}
          className={`w-full flex items-center p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300 ${isConversationMode ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}
          aria-label="Toggle conversation mode"
          title={isConversationMode ? "Exit conversation mode" : "Start conversation mode"}
        >
          <ConversationIcon className={`w-5 h-5 mr-3 ${isConversationMode ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
          <span className="font-medium">Conversation Mode</span>
        </button>
        <button
          onClick={toggleResponseMode}
          className="w-full flex items-center p-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300"
          aria-label="Toggle voice output"
          title={`Switch to ${responseMode === 'text' ? 'voice' : 'text'} responses`}
        >
          {responseMode === 'text' ? <SpeakerXMarkIcon className="w-5 h-5 mr-3" /> : <SpeakerWaveIcon className="w-5 h-5 mr-3" />}
          <span className="font-medium">Voice Output</span>
        </button>
        <button
          onClick={onDownloadChat}
          className="w-full flex items-center p-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300"
          aria-label="Download chat history"
          title="Download chat history"
        >
          <DownloadIcon className="w-5 h-5 mr-3" />
          <span className="font-medium">Download Chat</span>
        </button>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center p-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300"
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <MoonIcon className="w-5 h-5 mr-3" /> : <SunIcon className="w-5 h-5 mr-3" />}
          <span className="font-medium">{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
        </button>
        <button 
          className="w-full flex items-center p-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300" 
          aria-label="Settings"
          title="View application settings"
        >
          <SettingsIcon className="w-5 h-5 mr-3" />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;