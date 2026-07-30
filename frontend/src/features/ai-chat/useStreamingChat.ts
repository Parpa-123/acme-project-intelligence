import { useState, useCallback } from 'react';
import { useChatStore } from './useChatStore';

export function useStreamingChat(projectId: number) {
  const [isStreaming, setIsStreaming] = useState(false);
  const { activeSessionId, setActiveSession, addMessage, updateMessage } = useChatStore();

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    // Generate local IDs for optimistic UI updates
    const userMessageId = Math.random().toString(36).substring(7);
    const assistantMessageId = Math.random().toString(36).substring(7);
    
    // If no active session, we use a temporary placeholder 'new' until backend gives us an ID
    const currentSessionId = activeSessionId || 'new';

    addMessage(currentSessionId, { id: userMessageId, role: 'user', content: text });
    addMessage(currentSessionId, { id: assistantMessageId, role: 'assistant', content: '', status: 'Connecting...' });

    setIsStreaming(true);

    try {
      const response = await fetch(`http://localhost:8000/projects/${projectId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          session_id: activeSessionId // null if new session
        }),
      });

      if (!response.body) throw new Error("ReadableStream not yet supported in this browser.");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let actualSessionId = currentSessionId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.type === 'session') {
                // Backend created a new session. We need to update our store.
                if (actualSessionId === 'new') {
                  const newSessionId = data.session_id;
                  actualSessionId = newSessionId;
                  
                  // Move messages from 'new' to actualSessionId
                  const store = useChatStore.getState();
                  const newMsgs = store.messages['new'] || [];
                  store.setMessages(newSessionId, newMsgs);
                  store.clearMessages('new');
                  
                  setActiveSession(newSessionId);
                }
              } else if (data.type === 'status') {
                updateMessage(actualSessionId, assistantMessageId, { status: data.content });
              } else if (data.type === 'token') {
                const store = useChatStore.getState();
                const msgs = store.messages[actualSessionId] || [];
                const msg = msgs.find(m => m.id === assistantMessageId);
                if (msg) {
                  updateMessage(actualSessionId, assistantMessageId, { 
                    content: msg.content + data.content, 
                    status: undefined 
                  });
                }
              } else if (data.type === 'error') {
                const store = useChatStore.getState();
                const msgs = store.messages[actualSessionId] || [];
                const msg = msgs.find(m => m.id === assistantMessageId);
                if (msg) {
                  updateMessage(actualSessionId, assistantMessageId, { 
                    content: msg.content + `\n\n**Error**: ${data.content}`, 
                    status: undefined 
                  });
                }
              }
            } catch (e) {
              console.error("Error parsing SSE JSON", e, line);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      updateMessage(activeSessionId || 'new', assistantMessageId, { status: 'Error connecting to chat server.' });
    } finally {
      setIsStreaming(false);
    }
  }, [projectId, activeSessionId, isStreaming, addMessage, updateMessage, setActiveSession]);

  return { sendMessage, isStreaming };
}
