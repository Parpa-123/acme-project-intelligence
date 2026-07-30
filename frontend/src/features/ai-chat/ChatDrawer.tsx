import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useQuery } from '@tanstack/react-query';
import { useStreamingChat } from './useStreamingChat';
import { useChatStore } from './useChatStore';
import type { ChatSession } from './useChatStore';
import { FaPaperPlane, FaRobot, FaUser, FaCircleNotch, FaPlus, FaComment, FaTimes, FaExpandAlt, FaCompressAlt } from 'react-icons/fa';

interface ChatDrawerProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatDrawer({ projectId, isOpen, onClose }: ChatDrawerProps) {
  const { sendMessage, isStreaming } = useStreamingChat(projectId);
  const { activeSessionId, setActiveSession, messages, setMessages } = useChatStore();
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Sessions
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['chatSessions', projectId],
    queryFn: async () => {
      const res = await fetch(`http://localhost:8000/projects/${projectId}/chat/sessions`);
      if (!res.ok) throw new Error('Failed to load sessions');
      return res.json() as Promise<ChatSession[]>;
    },
    enabled: isOpen
  });

  // Fetch Messages for active session
  const { isLoading: loadingMessages } = useQuery({
    queryKey: ['chatMessages', projectId, activeSessionId],
    queryFn: async () => {
      if (!activeSessionId || activeSessionId === 'new') return [];
      const res = await fetch(`http://localhost:8000/projects/${projectId}/chat/sessions/${activeSessionId}/messages`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      setMessages(activeSessionId, data);
      return data;
    },
    enabled: isOpen && !!activeSessionId && activeSessionId !== 'new'
  });

  const currentMessages = activeSessionId ? (messages[activeSessionId] || []) : (messages['new'] || []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [currentMessages, isStreaming, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isStreaming) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-screen bg-black/80 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 flex flex-col transition-all duration-300 ease-in-out ${isExpanded ? 'w-full md:w-[80vw]' : 'w-full md:w-[45vw] lg:w-[40vw]'}`}>
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <FaRobot className="text-emerald-400 text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white text-glow-sm">AI Copilot</h2>
              <p className="text-xs text-emerald-400 font-medium">Project Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              {isExpanded ? <FaCompressAlt /> : <FaExpandAlt />}
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* History Sidebar */}
          <div className="w-16 md:w-56 border-r border-white/10 bg-white/5 flex flex-col transition-all duration-300">
            <div className="p-3 border-b border-white/10 flex justify-center md:justify-start">
              <button 
                onClick={() => setActiveSession(null)}
                className="flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30 p-2 md:py-2 md:px-4 rounded-xl transition-colors font-medium text-sm w-full"
                title="New Chat"
              >
                <FaPlus /> <span className="hidden md:inline">New Chat</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {loadingSessions ? (
                <div className="text-center text-emerald-400/50 p-4">
                  <FaCircleNotch className="animate-spin mx-auto" />
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSession(session.id)}
                    className={`w-full text-left p-2 md:p-3 rounded-xl transition-colors flex flex-col gap-1 ${
                      activeSessionId === session.id 
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-white' 
                        : 'hover:bg-white/5 border border-transparent text-gray-400'
                    }`}
                    title={session.title || 'Chat Session'}
                  >
                    <div className="flex items-center justify-center md:justify-start gap-2 font-medium text-sm truncate">
                      <FaComment className={activeSessionId === session.id ? 'text-emerald-400' : 'text-gray-500'} />
                      <span className="truncate hidden md:inline">{session.title || 'Chat Session'}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col bg-transparent relative">
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center text-emerald-400">
                <FaCircleNotch className="animate-spin text-4xl" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth custom-scrollbar">
                {currentMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 px-4">
                    <FaRobot className="text-5xl text-emerald-400/50" />
                    <p className="text-lg font-medium text-glow-sm text-white/80 text-center">I'm your AI Copilot</p>
                    <p className="text-sm text-center max-w-xs text-gray-500">Ask me to summarize meetings, find decisions, or draft requirements.</p>
                  </div>
                ) : (
                  currentMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] md:max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-emerald-600/50' : 'bg-white/10 border border-white/20'}`}>
                          {msg.role === 'user' ? <FaUser className="text-white text-sm" /> : <FaRobot className="text-emerald-400 text-sm" />}
                        </div>
                        <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-emerald-600/50 border border-emerald-400/50 text-white' : 'glass-panel bg-white/5 border border-white/10 text-gray-200'}`}>
                            <div className="prose prose-invert prose-sm max-w-none prose-a:text-emerald-400 hover:prose-a:text-emerald-300">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          </div>
                          {msg.status && (
                            <div className="mt-2 text-xs text-emerald-400/70 flex items-center gap-2">
                              <FaCircleNotch className="animate-spin" />
                              {msg.status}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
            
            {/* Input Box */}
            <div className="p-4 bg-white/5 border-t border-white/10 backdrop-blur-md">
              <form onSubmit={handleSubmit} className="relative flex items-center">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask the copilot... (Shift+Enter for new line)"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/50 resize-none overflow-hidden text-sm shadow-inner"
                  rows={1}
                  style={{ minHeight: '46px', maxHeight: '150px' }}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isStreaming}
                  className="absolute right-3 p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <FaPaperPlane className="text-sm" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
