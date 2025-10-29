
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LogoIcon, UserIcon, CopyIcon, CheckIcon } from './icons';
import { CodeBlock } from './CodeBlock';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  isLoading?: boolean;
  imageUrl?: string;
  uploadedImageUrl?: string;
  theme: string;
  timestamp?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser, isLoading = false, imageUrl, uploadedImageUrl, theme, timestamp }) => {
  const [isCopied, setIsCopied] = useState(false);
  
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }, (err) => {
      console.error('Failed to copy message: ', err);
    });
  };

  const LoadingDots = () => (
    <div className="flex items-center space-x-1 p-2">
        <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce"></div>
    </div>
  );

  const messageAlignment = isUser ? 'justify-end' : 'justify-start';
  const bubbleStyles = isUser
    ? 'bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl rounded-br-lg'
    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl rounded-bl-lg';
  
  const avatar = (
      <div className={`w-9 h-9 p-0.5 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-slate-300 dark:bg-slate-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
        {isUser 
          ? <UserIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" /> 
          : <LogoIcon className="w-8 h-8 text-slate-600 dark:text-slate-300" />
        }
      </div>
  );
  
  const formattedTimestamp = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <div className={`flex items-start gap-3 w-full max-w-4xl mx-auto ${messageAlignment}`}>
      {!isUser && avatar}
      <div className={`relative group max-w-2xl ${isUser ? 'order-1' : ''}`}>
        <div className={`${bubbleStyles} px-4 py-3 shadow-md`}>
          {uploadedImageUrl && (
            <div className="mb-2">
                <img 
                    src={uploadedImageUrl} 
                    alt="User upload" 
                    className="rounded-lg border border-slate-300 dark:border-slate-600 max-w-xs h-auto shadow-md"
                />
            </div>
          )}
          <div className="prose prose-slate dark:prose-invert prose-p:my-2 prose-headings:font-semibold prose-a:text-indigo-600 hover:prose-a:text-indigo-500 dark:prose-a:text-indigo-400 prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none max-w-none">
            {isLoading ? <LoadingDots /> : (
              <>
                {message && (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                          code: (props) => <CodeBlock {...props} theme={theme} children={props.children ?? ''} />,
                      }}
                    >
                        {message}
                    </ReactMarkdown>
                )}

                {imageUrl && (
                  <div className="mt-2 -mx-1">
                    <img 
                      src={imageUrl} 
                      alt="Generated content" 
                      className="rounded-lg border border-slate-300 dark:border-slate-600 max-w-full h-auto shadow-md"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {!isLoading && message && !isUser && (
          <button
            onClick={handleCopyMessage}
            className="absolute -top-2 -right-2 p-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Copy message"
            title="Copy message"
          >
            {isCopied ? (
              <CheckIcon className="w-4 h-4 text-green-500" />
            ) : (
              <CopyIcon className="w-4 h-4" />
            )}
          </button>
        )}
         {!isLoading && timestamp && (
            <div className={`absolute top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isUser ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'}`}>
                {formattedTimestamp}
            </div>
        )}
      </div>
       {isUser && avatar}
    </div>
  );
};

export default ChatMessage;
