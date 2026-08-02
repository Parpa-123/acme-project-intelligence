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
    <div className="flex flex-col h-full bg-[#111]">
      <div className="h-14 flex-shrink-0 border-b border-white/10 flex items-center justify-between px-4 bg-[#181818] text-white">
        <h3 className="font-bold flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          Chat
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#111] no-scrollbar">
        {isLoading ? (
          <div className="text-center text-gray-500 text-sm mt-4 animate-pulse">Loading history...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-10">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id.toString() === localParticipant.identity;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[11px] text-gray-500 mb-1 mx-1">{isMe ? 'You' : msg.user_name}</span>
                <div 
                  className={`px-3 py-2 rounded-xl max-w-[90%] text-[13px] shadow-sm leading-relaxed
                    ${isMe 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-[#222] text-gray-200 border border-white/5 rounded-tl-sm'
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

      <div className="p-4 bg-[#181818] border-t border-white/10 flex-shrink-0">
        <form onSubmit={handleSend} className="relative h-full">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            disabled={sendMessageToDb.isPending}
            className="w-full h-10 pl-4 pr-10 bg-[#222] border border-white/10 focus:bg-[#2a2a2a] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-full text-sm text-white transition-all outline-none placeholder-gray-500"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || sendMessageToDb.isPending}
            className="absolute right-1 top-1 bottom-1 w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:opacity-50 disabled:bg-[#333] disabled:text-gray-500 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4 ml-[-2px]" />
          </button>
        </form>
      </div>
    </div>
  );
}
