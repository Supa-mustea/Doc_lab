

import React, { useState, useRef, useEffect } from 'react';
import { 
    PlusIcon, ToolsIcon, SendIcon, CloseIcon, StudioIcon, ResearchIcon, ImageIcon, 
    VideoIcon, MusicIcon, LearningIcon, ConsultIcon, MicrophoneIcon, FigmaIcon, CloudArrowUpIcon
} from './icons';

interface ChatInputProps {
    onSend: (prompt: string, image?: { data: string; mimeType: string }) => void;
    disabled?: boolean;
    isConversationMode?: boolean;
    autoListenTrigger?: number;
}

const tools = [
  { 
    name: 'Studio', 
    description: 'Workspace for development, GitHub integration, and CI/CD.', 
    icon: StudioIcon 
  },
  { 
    name: 'Deep Research', 
    description: 'Conduct in-depth research on any topic.', 
    icon: ResearchIcon 
  },
  { 
    name: 'Create Images', 
    description: 'Generate high-quality images from text descriptions.', 
    icon: ImageIcon 
  },
  { 
    name: 'Create Videos', 
    description: 'Create videos from text prompts or images.', 
    icon: VideoIcon 
  },
  { 
    name: 'Create Music', 
    description: 'Compose original music in various genres.', 
    icon: MusicIcon 
  },
  { 
    name: 'Guided Learning', 
    description: 'Receive personalized tutoring on any subject.', 
    icon: LearningIcon 
  },
  { 
    name: 'Consult Dr', 
    description: 'Synchronize for personalized assistance in your daily life.', 
    icon: ConsultIcon 
  },
];

const CONVERSATION_MODE_SEND_DELAY = 1200; // ms

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false, isConversationMode = false, autoListenTrigger = 0 }) => {
  const [prompt, setPrompt] = useState('');
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; previewUrl: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [isMicSupported, setIsMicSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);

  const finalTranscriptRef = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const inactivityTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setIsProcessingSpeech(false);
        setMicError(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (inactivityTimeoutRef.current) {
            clearTimeout(inactivityTimeoutRef.current);
            inactivityTimeoutRef.current = null;
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        let errorMessage = 'An unknown microphone error occurred. Please try again.';
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          errorMessage = 'Microphone access was denied. Please allow microphone permissions in your browser settings and refresh the page.';
        } else if (event.error === 'no-speech') {
          errorMessage = 'No speech was detected. Please make sure your microphone is working.';
        } else if (event.error === 'network') {
            errorMessage = 'A network error occurred with speech recognition. Please check your connection.';
        } else if (event.error === 'audio-capture') {
            errorMessage = 'Could not capture audio. Please check your microphone hardware.';
        }
        setMicError(errorMessage);
        setIsListening(false);
        setIsProcessingSpeech(false);
      };

      recognition.onresult = (event: any) => {
        if (inactivityTimeoutRef.current) {
            clearTimeout(inactivityTimeoutRef.current);
        }

        let interimTranscript = '';
        let lastFinalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            lastFinalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        const trimmedFinal = lastFinalTranscript.trim();
        if (trimmedFinal) {
            finalTranscriptRef.current += trimmedFinal + ' ';
        }
        const currentText = (finalTranscriptRef.current + interimTranscript).trim();
        setPrompt(currentText);

        if (isConversationMode) {
          inactivityTimeoutRef.current = window.setTimeout(() => {
            const transcriptToSend = finalTranscriptRef.current.trim();
            if (transcriptToSend) {
                setIsProcessingSpeech(true);
                recognition.stop();
                finalTranscriptRef.current = ''; 
                setPrompt('');
                onSend(transcriptToSend);
            }
          }, CONVERSATION_MODE_SEND_DELAY);
        }
      };
      
      recognitionRef.current = recognition;
    } else {
        setIsMicSupported(false);
        setMicError("Speech recognition is not supported by your browser.");
    }

    return () => {
        if (inactivityTimeoutRef.current) {
            clearTimeout(inactivityTimeoutRef.current);
        }
        recognitionRef.current?.abort();
    };
  }, [isConversationMode, onSend]);

  useEffect(() => {
    if (isConversationMode) {
        finalTranscriptRef.current = '';
        recognitionRef.current?.start();
    } else {
      recognitionRef.current?.stop();
    }
  }, [isConversationMode]);

  useEffect(() => {
      if (isConversationMode && autoListenTrigger > 0) {
          finalTranscriptRef.current = '';
          recognitionRef.current?.start();
      }
  }, [autoListenTrigger, isConversationMode]);


  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 200; // Max height for 5 lines approx.
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [prompt]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolMenuRef.current && !toolMenuRef.current.contains(event.target as Node)) {
        setIsToolMenuOpen(false);
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setIsUploadMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [toolMenuRef, uploadMenuRef]);
  
  const handleMicClick = () => {
    if (!recognitionRef.current || isConversationMode || !isMicSupported) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      finalTranscriptRef.current = '';
      setPrompt('');
      recognitionRef.current.start();
    }
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // FIX: Explicitly type 'f' as File to prevent it from being inferred as 'unknown'.
      const fileNames = Array.from(files).map((f: File) => f.name).slice(0, 5); // show max 5 names
      let summary = `You have uploaded ${files.length} item(s): ${fileNames.join(', ')}`;
      if (files.length > 5) {
          summary += `, and ${files.length - 5} more.`;
      }
      
      // FIX: Explicitly type 'f' as File to prevent it from being inferred as 'unknown'.
      const zipFile = Array.from(files).find((f: File) => f.name.toLowerCase().endsWith('.zip'));
      if (zipFile) {
        // FIX: The type of zipFile is now correctly inferred as File | undefined, so no error here.
        summary += `\n\n(Note: The content of '${zipFile.name}' would be automatically extracted and processed.)`;
      }
      
      onSend(`[User uploaded files] ${summary}`);
      setIsUploadMenuOpen(false);
    }
    if(event.target) event.target.value = '';
  };
  
  const handleFigmaUpload = () => {
      // FIX: The local `prompt` state variable was shadowing the global `window.prompt` function.
      // Using `window.prompt` explicitly resolves the "not callable" error.
      const figmaUrl = window.prompt("Please enter your Figma file URL to import:", "");
      if (figmaUrl) {
          onSend(`[User wants to import from Figma] URL: ${figmaUrl}`);
      }
      setIsUploadMenuOpen(false);
  };
  
  const handleImageButtonClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              const base64Data = (e.target?.result as string).split(',')[1];
              setSelectedImage({
                  data: base64Data,
                  mimeType: file.type,
                  previewUrl: URL.createObjectURL(file)
              });
          };
          reader.readAsDataURL(file);
      }
      if(event.target) event.target.value = '';
  };

  const removeSelectedImage = () => {
      if (selectedImage) {
          URL.revokeObjectURL(selectedImage.previewUrl);
          setSelectedImage(null);
      }
  };

  const handleSend = () => {
    const textPrompt = prompt.trim();
    if ((textPrompt || selectedImage) && !disabled) {
      const finalPrompt = selectedTool
        ? `[Using Tool: ${selectedTool}] ${textPrompt}`
        : textPrompt;
      
      let imagePayload;
      if (selectedImage) {
        imagePayload = { data: selectedImage.data, mimeType: selectedImage.mimeType };
      }

      onSend(finalPrompt, imagePayload);
      
      setPrompt('');
      setSelectedTool(null);
      removeSelectedImage();
    }
  };

  const handleSelectTool = (toolName: string) => {
    setSelectedTool(toolName);
    setIsToolMenuOpen(false);
    textareaRef.current?.focus();
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className={`relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-2 transition-all duration-200 ${disabled || isConversationMode ? 'opacity-70' : 'focus-within:ring-2 focus-within:ring-indigo-500 dark:focus-within:ring-indigo-400 focus-within:border-transparent'}`}>
        {selectedImage && (
            <div className="px-2 pt-2">
                <div className="relative inline-block">
                    <img src={selectedImage.previewUrl} alt="Selected preview" className="h-20 w-auto rounded-lg border border-slate-300 dark:border-slate-600" />
                    <button onClick={removeSelectedImage} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                        <CloseIcon className="w-3 h-3" />
                    </button>
                </div>
            </div>
        )}
        <div className="flex items-start space-x-2 sm:space-x-4">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled ? "Waiting for response..."
              : isConversationMode ? (isProcessingSpeech ? "Processing..." : "Listening... start speaking to the AI")
              : isListening ? "Listening..."
              : selectedImage ? "Describe the image or ask a question..."
              : selectedTool ? `Ask me to use ${selectedTool}...`
              : "Send a message or click the mic to talk..."
            }
            className="flex-1 bg-transparent focus:outline-none resize-none text-base text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 w-full max-h-[200px] p-2"
            rows={1}
            disabled={disabled || isConversationMode}
          />
          <button
            onClick={handleSend}
            disabled={(!prompt.trim() && !selectedImage) || disabled || isConversationMode}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Send message"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 flex items-center space-x-1 sm:space-x-2 flex-wrap">
           <div className="relative" ref={uploadMenuRef}>
              {isUploadMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 z-10 p-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white px-2 pt-1 pb-2">Upload & Import</h3>
                      <div className="space-y-1">
                          <button onClick={handleFigmaUpload} className="w-full flex items-center text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                              <FigmaIcon className="w-5 h-5 text-slate-600 dark:text-slate-300 mr-3" />
                              <div>
                                  <p className="font-medium text-sm text-slate-800 dark:text-slate-200">Import from Figma</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Embed Figma designs.</p>
                              </div>
                          </button>
                          <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                              <CloudArrowUpIcon className="w-5 h-5 text-slate-600 dark:text-slate-300 mr-3" />
                              <div>
                                  <p className="font-medium text-sm text-slate-800 dark:text-slate-200">Upload from Computer</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Files, folders, or zip archives.</p>
                              </div>
                          </button>
                      </div>
                  </div>
              )}
              <button 
                  onClick={() => setIsUploadMenuOpen(prev => !prev)}
                  className="p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  aria-label="Add attachment" 
                  disabled={disabled || isConversationMode}
                  title="Attach a file"
              >
                  <PlusIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
          </div>

          <div className="relative" ref={toolMenuRef}>
            {isToolMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 z-10 p-2 max-h-[50vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white px-3 pt-2 pb-4">Select a Tool</h3>
                <div className="space-y-2 p-1">
                  {tools.map((tool) => (
                    <button
                      key={tool.name}
                      onClick={() => handleSelectTool(tool.name)}
                      className="w-full flex items-center text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg mr-4 flex-shrink-0">
                          <tool.icon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
                      </div>
                      <div>
                          <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{tool.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tool.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={() => setIsToolMenuOpen(prev => !prev)}
              className="flex items-center space-x-1.5 py-2 px-3 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              aria-label="Use tools" 
              disabled={disabled || isConversationMode}
              title="Select a tool to use"
            >
              <ToolsIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="hidden sm:inline text-sm font-medium text-slate-600 dark:text-slate-400">Tools</span>
            </button>
          </div>
          
          <button 
            onClick={handleImageButtonClick}
            className="p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            aria-label="Upload an image for analysis" 
            disabled={disabled || isConversationMode}
            title="Analyze an image"
          >
              <ImageIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>

          <button
              onClick={handleMicClick}
              disabled={disabled || isConversationMode || !isMicSupported}
              className={`p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 relative disabled:opacity-50 disabled:cursor-not-allowed ${isListening && !isProcessingSpeech ? 'animate-pulse' : ''}`}
              aria-label={isListening ? 'Stop listening' : 'Use microphone'}
              title={micError || (isListening ? 'Stop listening' : 'Use microphone')}
          >
              <MicrophoneIcon className={`w-5 h-5 ${!isMicSupported ? 'text-slate-400 dark:text-slate-600' : (isListening || (isConversationMode && !isProcessingSpeech)) ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`} />
          </button>

          {selectedTool && (
            <div className="flex items-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 text-sm font-medium px-3 py-1.5 rounded-lg my-1">
              <span>{selectedTool}</span>
              <button
                onClick={() => setSelectedTool(null)}
                className="ml-2 -mr-1 p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-700/50 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200"
                aria-label={`Clear ${selectedTool} tool`}
                title={`Clear ${selectedTool} tool`}
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        {micError && (
            <p className="text-xs text-red-500 mt-2 px-1 text-center sm:text-left">{micError}</p>
        )}
      </div>
      <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
      />
      <input
          type="file"
          ref={imageInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          className="hidden"
      />
    </>
  );
};

export default ChatInput;