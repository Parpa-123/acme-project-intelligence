import { useState, useEffect, useRef } from 'react';
import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { useMeetingMessages, useSendMeetingMessage } from '../../api/meetings';
import type { ChatMessage } from '../../api/meetings';
import { Send, MessageSquare } from 'lucide-react';

export function ChatPanel({ meetingId }: { meetingId: string }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [inputText, setInputText] = useState('');
  
  // 1. Fetch historical messages from backend
  const { data: initialMessages, isLoading } = useMeetingMessages(meetingId);
  const sendMessageToDb = useSendMeetingMessage(meetingId);
  
  // 2. Local state for all messages (history + new)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hydrate history once loaded
  useEffect(() => {
    if (initialMessages && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Listen for incoming WebRTC messages
  useEffect(() => {
    const handleData = (
      payload: Uint8Array,
      _participant?: unknown,
      _kind?: unknown,
      topic?: string
    ) => {
      if (topic === 'chat') {
        const text = new TextDecoder().decode(payload);
        try {
          const incomingMsg = JSON.parse(text) as ChatMessage;
          setMessages(prev => {
            if (prev.some(m => m.id === incomingMsg.id)) return prev;
            return [...prev, incomingMsg];
          });
        } catch (e) {
          console.error("Failed to parse chat message", e);
        }
      }
    };

    room.on('dataReceived', handleData);
    return () => {
      room.off('dataReceived', handleData);
    };
  }, [room]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');

    sendMessageToDb.mutate({ message: text, message_type: 'text' }, {
      onSuccess: async (savedMessage) => {
        setMessages(prev => [...prev, savedMessage]);
        
        const payload = new TextEncoder().encode(JSON.stringify(savedMessage));
        await localParticipant.publishData(payload, {
          reliable: true,
          topic: 'chat'
        });
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="h-[60px] flex-shrink-0 border-b border-white/10 flex items-center justify-between px-4 glass-panel text-white">
        <h3 className="font-bold flex items-center gap-2 text-glow-sm">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          Chat
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent no-scrollbar">
        {isLoading ? (
          <div className="text-center text-gray-400 text-sm mt-4 animate-pulse">Loading history...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-10">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id.toString() === localParticipant.identity;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-gray-400 mb-1 mx-1">{isMe ? 'You' : msg.user_name}</span>
                <div 
                  className={`px-3 py-2 rounded-2xl max-w-[90%] text-[13px] shadow-sm leading-relaxed
                    ${isMe 
                      ? 'bg-indigo-500/20 text-indigo-300 rounded-tr-sm ring-1 ring-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)]' 
                      : 'bg-white/10 text-gray-200 border border-white/10 rounded-tl-sm'
                    }`
                  }
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 glass-panel border-t border-white/10 flex-shrink-0 h-[72px]">
        <form onSubmit={handleSend} className="relative h-full">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            disabled={sendMessageToDb.isPending}
            className="w-full h-10 pl-4 pr-10 bg-white/5 border border-white/10 focus:bg-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-full text-sm text-white transition-all outline-none placeholder-gray-500 shadow-inner"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || sendMessageToDb.isPending}
            className="absolute right-1 top-1 bottom-1 w-8 h-8 flex items-center justify-center bg-indigo-500/20 text-indigo-300 rounded-full hover:bg-indigo-500/40 hover:text-white ring-1 ring-indigo-500/30 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4 ml-[-2px]" />
          </button>
        </form>
      </div>
    </div>
  );
}
