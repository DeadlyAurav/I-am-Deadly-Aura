import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { ArrowUp, Loader2, Plus, Paperclip, Copy, RotateCcw, FileText, X, ChevronDown, Settings2, Brain, Globe, Sparkles, Map, User, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

interface Message {
  role: 'user' | 'assistant';
  text: string;
  file?: { name: string, mimeType: string };
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileData, setFileData] = useState<{name: string, mimeType: string, data: string} | null>(null);
  const [selectedModel, setSelectedModel] = useState("Hika Vibe");
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // AI Settings
  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [isWebSearch, setIsWebSearch] = useState(false);
  const [isCreative, setIsCreative] = useState(false);
  const [isGuide, setIsGuide] = useState(false);
  const [selectedBehaviour, setSelectedBehaviour] = useState("Normal");
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [apiErrorMessage, setApiErrorMessage] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Gemini
  const GEMINI_API_KEY = 'AIzaSyDGzSab7sxFc46XQIHXkMAYSX9cepMF_vs';
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Simple check by generating a tiny response
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: "hi",
        });
        if (response.text) {
          setApiStatus('ok');
        } else {
          setApiStatus('error');
          setApiErrorMessage('No response from Gemini');
        }
      } catch (e: any) {
        setApiStatus('error');
        setApiErrorMessage(e.message || 'Gemini connection failed');
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() && !fileData) return;

    const newMessages: Message[] = [...messages, { 
        role: 'user', 
        text: userMessage,
        file: fileData ? { name: fileData.name, mimeType: fileData.mimeType } : undefined
    }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
        const behaviourPrompts: Record<string, string> = {
            "Normal": "You are a helpful assistant.",
            "Friend": "Act as a friendly, supportive companion. Use casual language and emojis.",
            "Professional": "Act as a professional, concise, and formal assistant. Focus on efficiency and accuracy.",
            "Ruddy": "Act as a rude, sarcastic, and blunt assistant. Be sassy and slightly annoying.",
            "Teacher": "Act as a patient, encouraging teacher. Explain concepts clearly and ask follow-up questions to ensure understanding."
        };

        const deepThinkingPrompt = isDeepThinking ? "You are a deep thinking AI. Provide extremely detailed, step-by-step reasoning for your answers. Break down complex problems into logical components and explain your thought process thoroughly before providing the final answer." : "";
        const creativePrompt = isCreative ? "Be highly creative and imaginative in your responses. Think outside the box and use vivid descriptions." : "";
        const guidePrompt = isGuide ? "Act as a comprehensive guide. Provide structured information, tips, and step-by-step instructions. Use clear headings and bullet points." : "";
        const webSearchNote = isWebSearch ? "You have access to Google Search. Use it to provide up-to-date information when needed." : "";

        const systemInstruction = [
            behaviourPrompts[selectedBehaviour],
            deepThinkingPrompt,
            creativePrompt,
            guidePrompt,
            webSearchNote
        ].filter(Boolean).join("\n\n");

        // All models use Gemini 2.5 Flash as requested
        const modelName = "gemini-2.5-flash";

        const response = await ai.models.generateContent({
            model: modelName,
            contents: [
                ...messages.map(m => ({ 
                    role: m.role === 'user' ? 'user' : 'model', 
                    parts: [{ text: m.text }] 
                })),
                { role: "user", parts: [{ text: userMessage }] }
            ],
            config: {
                systemInstruction,
                temperature: isCreative ? 0.9 : 0.7,
                tools: isWebSearch ? [{ googleSearch: {} }] : undefined
            }
        });

        const assistantResponse = response.text || 'Sorry, I encountered an error.';
        
        setMessages(prev => [...prev, { role: 'assistant', text: assistantResponse }]);
        setFileData(null);
    } catch (error: any) {
        console.error(error);
        let errorMessage = 'Sorry, I encountered an error.';
        
        if (error.message?.includes('API_KEY_INVALID')) {
            errorMessage = `⚠️ **Invalid API Key**: The Google API key provided is invalid. \n\n**Server Response:** ${error.message}\n\n**To fix this:**\n1. Double check your key in the Google AI Studio Console.\n2. Ensure there are no extra spaces.\n3. Refresh the application.`;
        } else if (error.message?.includes('quota')) {
            errorMessage = "⚠️ **Rate Limit Exceeded**: You've reached the Gemini API quota. Please wait a moment before trying again.";
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        setMessages(prev => [...prev, { role: 'assistant', text: errorMessage }]);
        setFileData(null);
    } finally {
        setIsLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setFileData({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: base64
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const regenerateMessage = (index: number) => {
    const userPrompt = messages[index - 1].text;
    const newMessages = messages.slice(0, index);
    setMessages(newMessages);
    sendMessage(userPrompt);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="relative flex flex-col h-screen bg-[#1e1e1e] text-zinc-100">
      <button
        onClick={() => setIsModelSelectorOpen(true)}
        className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 text-sm font-medium z-20 flex items-center gap-2"
      >
        {selectedModel}
        <ChevronDown className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-[#1a1a1a] border-t border-zinc-800 rounded-t-[2.5rem] z-50 overflow-y-auto"
            >
              <div className="sticky top-0 bg-[#1a1a1a] p-6 border-b border-zinc-800/50 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">AI Configuration</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${
                      apiStatus === 'ok' ? 'bg-emerald-500' : 
                      apiStatus === 'checking' ? 'bg-zinc-500 animate-pulse' : 
                      'bg-red-500 animate-pulse'
                    }`} />
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                      {apiStatus === 'ok' ? 'System Ready' : 
                       apiStatus === 'checking' ? 'Checking Connection...' : 
                       'Connection Failed'}
                    </span>
                  </div>
                  {apiStatus === 'error' && (
                    <p className="text-[10px] text-red-400 mt-1 max-w-[200px] truncate">
                      {apiErrorMessage}
                    </p>
                  )}
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 rounded-full hover:bg-zinc-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-8 pb-12">
                {/* Toggles Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'deep', label: 'Deep Thinking', icon: Brain, state: isDeepThinking, setter: setIsDeepThinking, color: 'text-purple-400' },
                    { id: 'web', label: 'Web Search', icon: Globe, state: isWebSearch, setter: setIsWebSearch, color: 'text-blue-400' },
                    { id: 'creative', label: 'Creative', icon: Sparkles, state: isCreative, setter: setIsCreative, color: 'text-amber-400' },
                    { id: 'guide', label: 'Guide', icon: Map, state: isGuide, setter: setIsGuide, color: 'text-emerald-400' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => item.setter(!item.state)}
                      className={`flex flex-col items-start p-4 rounded-3xl border transition-all duration-300 ${
                        item.state 
                          ? 'bg-zinc-800/50 border-zinc-600 ring-1 ring-zinc-600' 
                          : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <item.icon className={`w-6 h-6 mb-3 ${item.state ? item.color : 'text-zinc-500'}`} />
                      <span className={`text-sm font-medium ${item.state ? 'text-zinc-100' : 'text-zinc-400'}`}>{item.label}</span>
                      <div className={`mt-2 w-8 h-1 rounded-full transition-all ${item.state ? 'bg-zinc-400 w-full' : 'bg-transparent'}`} />
                    </button>
                  ))}
                </div>

                {/* Behaviour Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <User className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">AI Behaviour</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {["Normal", "Friend", "Professional", "Ruddy", "Teacher"].map(behaviour => (
                      <button 
                        key={behaviour} 
                        onClick={() => setSelectedBehaviour(behaviour)} 
                        className={`flex items-center justify-between w-full p-4 rounded-2xl transition-all ${
                          selectedBehaviour === behaviour 
                            ? 'bg-zinc-100 text-black font-semibold' 
                            : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 border border-zinc-800/50'
                        }`}
                      >
                        <span>{behaviour}</span>
                        {selectedBehaviour === behaviour && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModelSelectorOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModelSelectorOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 h-1/2 bg-[#1e1e1e] border-t border-zinc-800 rounded-t-3xl z-50 p-6"
            >
              <h2 className="text-xl font-semibold mb-6">Select Model</h2>
              <div className="space-y-2">
                {[
                  { name: "Hika Vibe", desc: "Balanced & Versatile" },
                  { name: "Obo Pro", desc: "Advanced Reasoning" },
                  { name: "Geek", desc: "Technical & Precise" },
                  { name: "Heavenly", desc: "Creative & Fluid" }
                ].map(model => (
                  <button 
                    key={model.name} 
                    onClick={() => { setSelectedModel(model.name); setIsModelSelectorOpen(false); }} 
                    className={`w-full text-left p-4 rounded-2xl transition-all border ${
                      selectedModel === model.name 
                        ? 'bg-zinc-100 text-black border-zinc-100' 
                        : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold">{model.name}</div>
                        <div className={`text-[10px] uppercase tracking-widest mt-0.5 ${selectedModel === model.name ? 'text-black/60' : 'text-zinc-500'}`}>
                          {model.desc}
                        </div>
                      </div>
                      <div className={`text-[10px] font-bold px-2 py-1 rounded-md ${selectedModel === model.name ? 'bg-black/10' : 'bg-zinc-800 text-zinc-400'}`}>
                        Gemini 2.5 Flash
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <button
        onClick={() => setMessages([])}
        className="absolute top-4 right-4 p-2 rounded-lg bg-zinc-900/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 z-10 backdrop-blur-sm"
        title="New Chat"
      >
        <Plus className="w-6 h-6" />
      </button>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pt-20">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`p-4 rounded-2xl max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'bg-zinc-900/50' : 'bg-transparent'}`}>
              {msg.file && (
                <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-zinc-800/50 text-xs">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <span>{msg.file.name}</span>
                </div>
              )}
              <div className="prose prose-invert prose-zinc max-w-none text-sm md:text-base">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
              {msg.role === 'assistant' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => copyToClipboard(msg.text)} className="p-1 rounded text-zinc-500 hover:text-zinc-200" title="Copy">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => regenerateMessage(i)} className="p-1 rounded text-zinc-500 hover:text-zinc-200" title="Regenerate">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="p-4 rounded-2xl bg-transparent">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          </motion.div>
        )}
      </div>
      <div className="h-[150px] p-4 md:p-8">
        <div className="relative h-full max-w-4xl mx-auto">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          {fileData && (
              <div className="absolute left-4 -top-10 flex items-center gap-2 p-2 rounded-lg bg-zinc-800 text-xs">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <span>{fileData.name}</span>
                  <button onClick={() => setFileData(null)} className="hover:text-zinc-200"><X className="w-4 h-4" /></button>
              </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Ask anything..."
            className="w-full h-full p-4 pl-12 pr-16 rounded-2xl bg-zinc-900/30 backdrop-blur-md border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none"
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="absolute left-2 bottom-2 p-2 rounded-lg text-zinc-500 hover:text-zinc-200 z-10"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className={`absolute left-10 bottom-2 p-2 rounded-lg transition-colors z-10 ${isSettingsOpen ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'}`}
          >
            <Settings2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => sendMessage(input)} 
            className="absolute right-2 bottom-2 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 disabled:opacity-50 z-10"
            disabled={isLoading || (!input.trim() && !fileData)}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
