import { create } from 'zustand';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status?: string;
  created_at?: string;
};

export type ChatSession = {
  id: string;
  project_id: number;
  user_id: number;
  title: string | null;
  created_at: string;
  updated_at: string;
};

interface ChatStore {
  activeSessionId: string | null;
  sessions: ChatSession[];
  messages: Record<string, ChatMessage[]>; // sessionId -> messages
  
  setActiveSession: (id: string | null) => void;
  setSessions: (sessions: ChatSession[]) => void;
  addSession: (session: ChatSession) => void;
  setMessages: (sessionId: string, messages: ChatMessage[]) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  clearMessages: (sessionId: string) => void;
  isDrawerOpen: boolean;
  setDrawerOpen: (isOpen: boolean) => void;
  pendingDiscussionText: string | null;
  setPendingDiscussionText: (text: string | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeSessionId: null,
  sessions: [],
  messages: {},
  isDrawerOpen: false,
  pendingDiscussionText: null,

  setDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),
  setPendingDiscussionText: (text) => set({ pendingDiscussionText: text }),

  setActiveSession: (id) => set({ activeSessionId: id }),
  
  setSessions: (sessions) => set({ sessions }),
  
  addSession: (session) => set((state) => ({ 
    sessions: [session, ...state.sessions] 
  })),

  setMessages: (sessionId, msgs) => set((state) => ({
    messages: { ...state.messages, [sessionId]: msgs }
  })),

  addMessage: (sessionId, message) => set((state) => {
    const sessionMessages = state.messages[sessionId] || [];
    return {
      messages: { ...state.messages, [sessionId]: [...sessionMessages, message] }
    };
  }),

  updateMessage: (sessionId, messageId, updates) => set((state) => {
    const sessionMessages = state.messages[sessionId] || [];
    return {
      messages: {
        ...state.messages,
        [sessionId]: sessionMessages.map(msg => 
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
      }
    };
  }),

  clearMessages: (sessionId) => set((state) => {
    const newMessages = { ...state.messages };
    delete newMessages[sessionId];
    return { messages: newMessages };
  }),
}));
