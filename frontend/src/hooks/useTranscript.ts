import { useState, useEffect } from 'react';
import { useMeetingTranscripts } from '../api/meetings';
import type { TranscriptEvent } from '../api/meetings';

export interface ProcessedTranscript {
  id: string; // can be uuid or participant_id-sequence
  participant_id: string;
  user_name: string;
  text: string;
  is_final: boolean;
  created_at: Date;
}

export const useTranscript = (meetingId: string | undefined) => {
  const [transcripts, setTranscripts] = useState<ProcessedTranscript[]>([]);
  const { data: initialTranscripts, isLoading } = useMeetingTranscripts(meetingId);

  // Hydrate initial history
  useEffect(() => {
    if (initialTranscripts && transcripts.length === 0) {
      setTranscripts(
        initialTranscripts.map(t => ({
          ...t,
          participant_id: String(t.user_id),
          created_at: new Date(t.created_at),
        }))
      );
    }
  }, [initialTranscripts]);

  // WebSocket Connection for Live Transcription
  useEffect(() => {
    if (!meetingId) return;

    // Use ws:// or wss:// based on current protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = baseUrl.replace(/^https?:\/\//, `${protocol}//`) + `/meetings/${meetingId}/transcript/ws`;

    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const event_data: TranscriptEvent = JSON.parse(event.data);
        
        // Skip non-transcript events
        if (event_data.type !== 'USER_TRANSCRIPT' && event_data.type !== 'AGENT_TRANSCRIPT') {
            return;
        }

        const data = event_data.payload;
        const speaker = data.speaker || "unknown";

        setTranscripts(prev => {
          // Find if we already have an active partial from this user
          // If the incoming message is partial, update the existing partial or create new
          // If the incoming message is final, update the existing partial to final or append
          
          const newTranscripts = [...prev];
          const lastIndex = newTranscripts.map(t => t.participant_id).lastIndexOf(speaker);
          const lastTranscript = lastIndex >= 0 ? newTranscripts[lastIndex] : null;

          if (lastTranscript && !lastTranscript.is_final) {
            // Replace the partial
            newTranscripts[lastIndex] = {
              ...lastTranscript,
              text: data.text,
              is_final: data.is_final
            };
          } else {
            // Append new
            newTranscripts.push({
              id: `${speaker}-${Date.now()}`,
              participant_id: speaker,
              user_name: data.user_name || "Unknown",
              text: data.text,
              is_final: data.is_final,
              created_at: new Date(),
            });
          }
          return newTranscripts;
        });
      } catch (err) {
        console.error("Failed to parse transcript event", err);
      }
    };

    ws.onclose = () => {
      console.log('Transcript WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [meetingId]);

  return { transcripts, isLoading };
};
