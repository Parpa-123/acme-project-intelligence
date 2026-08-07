import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStreamingChat } from './useStreamingChat';
import { useChatStore } from './useChatStore';
import type { ChatSession } from './useChatStore';
import { FaPaperPlane, FaRobot, FaUser, FaCircleNotch, FaPlus, FaComment, FaTimes, FaExpandAlt, FaCompressAlt, FaCopy, FaCheck, FaThumbtack, FaTrash } from 'react-icons/fa';
import { usePinKnowledge, useUnpinKnowledge } from '../../api/knowledgeApi';
import { toast } from 'react-hot-toast';

const MessageActions = ({ text, projectId, role }: { text: string, projectId?: number, role: string }) => {
  const [copied, setCopied] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const pinMutation = usePinKnowledge(projectId ?? 0);
  const unpinMutation = useUnpinKnowledge(projectId ?? 0);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePinToggle = () => {
    if (projectId === undefined) return;
    if (isPinned) {
      unpinMutation.mutate(text, {
        onSuccess: () => setIsPinned(false)
      });
    } else {
      pinMutation.mutate(text, {
        onSuccess: () => setIsPinned(true)
      });
    }
  };

  return (
    <div className={`flex items-center gap-2 mt-2 pt-2 border-t border-white/5 opacity-50 hover:opacity-100 transition-opacity ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <button onClick={handleCopy} className="text-gray-400 hover:text-emerald-400 transition-colors p-1" title="Copy to clipboard">
        {copied ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
      </button>
      {role === 'assistant' && projectId !== undefined && (
        <button 
          onClick={handlePinToggle} 
          disabled={pinMutation.isPending || unpinMutation.isPending}
          className={`transition-colors p-1 ${isPinned ? 'text-emerald-400' : 'text-gray-400 hover:text-indigo-400'}`} 
          title={isPinned ? "Unpin from Knowledge Base" : "Pin to Knowledge Base"}
        >
          {pinMutation.isPending || unpinMutation.isPending ? <FaCircleNotch className="animate-spin" /> : <FaThumbtack />}
        </button>
      )}
    </div>
  );
};


interface ChatDrawerProps {
  projectId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatDrawer({ projectId, isOpen, onClose }: ChatDrawerProps) {
  const { sendMessage, isStreaming } = useStreamingChat(projectId);
  const { activeSessionId, setActiveSession, messages, setMessages, pendingDiscussionText, setPendingDiscussionText } = useChatStore();
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
      const endpoint = projectId !== undefined 
          ? `/projects/${projectId}/chat/sessions/${sessionId}`
          : `/global-knowledge/chat/sessions/${sessionId}`;
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete session');
      return sessionId;
    },
    onSuccess: (deletedSessionId) => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions', projectId ?? 'global'] });
      if (activeSessionId === deletedSessionId) {
        setActiveSession(null);
      }
      setSessionToDelete(null);
      toast.success('Chat deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete chat');
      setSessionToDelete(null);
    }
  });

  // Fetch Sessions
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['chatSessions', projectId ?? 'global'],
    queryFn: async () => {
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
      const endpoint = projectId !== undefined ? `/projects/${projectId}/chat/sessions` : `/global-knowledge/chat/sessions`;
      const res = await fetch(`${API_URL}${endpoint}`);
      if (!res.ok) throw new Error('Failed to load sessions');
      return res.json() as Promise<ChatSession[]>;
    },
    enabled: isOpen
  });

  // Fetch Messages for active session
  const { isLoading: loadingMessages } = useQuery({
    queryKey: ['chatMessages', projectId ?? 'global', activeSessionId],
    queryFn: async () => {
      if (!activeSessionId || activeSessionId === 'new') return [];
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
      const endpoint = projectId !== undefined 
          ? `/projects/${projectId}/chat/sessions/${activeSessionId}/messages`
          : `/global-knowledge/chat/sessions/${activeSessionId}/messages`;
      const res = await fetch(`${API_URL}${endpoint}`);
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

  // Handle auto-submission of pending knowledge discussion
  useEffect(() => {
    if (isOpen && pendingDiscussionText && !isStreaming) {
      // If we don't have an active session (or it's 'new'), we want to send it so the hook can create one
      // The sendMessage function handles creating a new session.
      sendMessage(`Let's discuss this project knowledge:

"${pendingDiscussionText}"`);
      setPendingDiscussionText(null);
    }
  }, [isOpen, pendingDiscussionText, isStreaming, sendMessage, setPendingDiscussionText]);

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

  return (
    <Transition show={isOpen} as={Fragment}>
      <HeadlessDialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>
        
        {/* Drawer */}
        <Transition.Child
          as={Fragment}
          enter="transform transition ease-in-out duration-300"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="transform transition ease-in-out duration-300"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
        >
          <HeadlessDialog.Panel className={`fixed right-0 top-0 h-screen bg-black/80 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${isExpanded ? 'w-full md:w-[80vw]' : 'w-full md:w-[45vw] lg:w-[40vw]'}`}>
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <FaRobot className="text-emerald-400 text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white text-glow-sm">AI Copilot</h2>
              <p className="text-xs text-emerald-400 font-medium">
                {projectId !== undefined ? 'Project Intelligence' : 'Global Knowledge Base'}
              </p>
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
                    className={`w-full text-left p-2 md:p-3 rounded-xl transition-colors flex flex-col gap-1 group ${
                      activeSessionId === session.id 
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-white' 
                        : 'hover:bg-white/5 border border-transparent text-gray-400'
                    }`}
                    title={session.title || 'Chat Session'}
                  >
                    <div className="flex items-center justify-between font-medium text-sm w-full">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FaComment className={activeSessionId === session.id ? 'text-emerald-400' : 'text-gray-500'} />
                        <span className="truncate hidden md:inline">{session.title || 'Chat Session'}</span>
                      </div>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionToDelete(session.id);
                        }}
                        className={`p-1.5 rounded-lg opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-red-400 hover:text-red-300 ${activeSessionId === session.id ? 'opacity-100' : ''}`}
                        title="Delete chat"
                      >
                        <FaTrash className="text-xs" />
                      </div>
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
                          <div className={`px-4 py-3 rounded-2xl shadow-md ${msg.role === 'user' ? 'bg-emerald-500 text-white rounded-br-sm border border-emerald-400/30' : 'glass-panel bg-[#242424] border border-white/10 text-gray-200 rounded-bl-sm'}`}>
                            <div className={`prose prose-sm max-w-none prose-a:text-emerald-400 hover:prose-a:text-emerald-300 ${msg.role === 'user' ? 'prose-invert' : 'prose-invert'}`}>
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          </div>
                          <MessageActions text={msg.content} projectId={projectId} role={msg.role} />
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
                {isStreaming && currentMessages.length > 0 && currentMessages[currentMessages.length - 1].role === 'user' && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] md:max-w-[85%] flex gap-3 flex-row">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-white/10 border border-white/20">
                        <FaRobot className="text-emerald-400 text-sm" />
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="px-4 py-3 rounded-2xl shadow-md glass-panel bg-[#242424] border border-white/10 rounded-bl-sm">
                          <div className="flex space-x-1 items-center h-5">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
          </HeadlessDialog.Panel>
        </Transition.Child>

        {/* Delete Confirmation Modal */}
        <Transition show={!!sessionToDelete} as={Fragment}>
          <HeadlessDialog as="div" className="relative z-[60]" onClose={() => setSessionToDelete(null)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <HeadlessDialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1A1A1A] p-6 text-left align-middle shadow-xl transition-all border border-white/10">
                    <HeadlessDialog.Title as="h3" className="text-lg font-bold leading-6 text-white flex items-center gap-2">
                      <FaTrash className="text-red-400" /> Delete Chat Session
                    </HeadlessDialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-400">
                        Are you sure you want to delete this chat session? This action cannot be undone.
                      </p>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 transition-colors"
                        onClick={() => setSessionToDelete(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-xl border border-transparent bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 border-red-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 transition-colors"
                        onClick={() => {
                          if (sessionToDelete) deleteSessionMutation.mutate(sessionToDelete);
                        }}
                        disabled={deleteSessionMutation.isPending}
                      >
                        {deleteSessionMutation.isPending ? <FaCircleNotch className="animate-spin" /> : 'Delete Chat'}
                      </button>
                    </div>
                  </HeadlessDialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </HeadlessDialog>
        </Transition>
      </HeadlessDialog>
    </Transition>
  );
}
