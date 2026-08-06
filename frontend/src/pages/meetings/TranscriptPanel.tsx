import { useEffect, useRef, useState } from 'react';
import { useMeetingTranscripts } from '../../api/meetings';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { MeetingTranscriptResponse } from '../../types';

export function TranscriptPanel({ meetingId }: { meetingId: string }) {
  const { data: transcripts, isLoading } = useMeetingTranscripts(meetingId);
  const [activeSpeech, setActiveSpeech] = useState<Record<string, boolean>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!meetingId) return;

    const WS_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');
    const ws = new WebSocket(`${WS_BASE_URL}/meetings/${meetingId}/transcript/ws`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'USER_ACTION') {
        const payload = data.payload;
        if (payload.action === 'speaking_start') {
          setActiveSpeech(prev => ({ ...prev, [payload.speaker]: true }));
        } else if (payload.action === 'speaking_stop') {
          setActiveSpeech(prev => ({ ...prev, [payload.speaker]: false }));
        }
      } else if (data.type === 'USER_TRANSCRIPT') {
        const payload = data.payload;
        // Optimistically update the cache without invalidating, since backend might not have saved it yet
        queryClient.setQueryData(['meetings', meetingId, 'transcripts'], (oldData: MeetingTranscriptResponse[] | undefined) => {
          const newData = oldData ? [...oldData] : [];
          newData.push({
            id: Date.now().toString(),
            meeting_id: meetingId,
            user_id: "client",
            user_name: payload.user_name,
            text: payload.text,
            is_final: payload.is_final,
            created_at: data.timestamp
          });
          return newData;
        });
        
        // Also clear the speaking state since they finished their sentence
        setActiveSpeech(prev => ({ ...prev, [payload.speaker]: false }));
      }
    };

    return () => {
      ws.close();
    };
  }, [meetingId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, activeSpeech]);

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500 flex-1 h-full flex items-center justify-center bg-[#111]">Loading transcripts...</div>;
  }

  const activeSpeakers = Object.entries(activeSpeech)
    .filter(([_, isSpeaking]) => isSpeaking)
    .map(([speaker]) => speaker);

  return (
    <div className="flex flex-col h-full bg-[#111] relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {transcripts?.length === 0 && activeSpeakers.length === 0 ? (
          <div className="text-center text-sm text-gray-500 mt-10">
            No transcripts yet. Start speaking to see live captions.
          </div>
        ) : (
          transcripts?.map((t) => (
            <div key={t.id} className="flex flex-col">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-bold text-gray-200">{t.user_name}</span>
                <span className="text-[10px] text-gray-500">
                  {format(new Date(t.created_at), 'HH:mm')}
                </span>
              </div>
              <p className="text-[13px] text-gray-300 leading-relaxed bg-[#222] p-3 rounded-xl rounded-tl-none border border-white/5 shadow-sm">
                {t.text}
              </p>
            </div>
          ))
        )}
        
        {/* Active speakers indicator */}
        {activeSpeakers.length > 0 && (
          <div className="flex flex-col opacity-50 animate-pulse mt-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs font-bold text-gray-400">
                Someone is speaking...
              </span>
            </div>
            <p className="text-[13px] text-gray-400 italic bg-[#222] p-3 rounded-xl rounded-tl-none border border-white/5 shadow-inner">
              Capturing audio...
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
