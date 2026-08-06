import { useEffect, useRef } from 'react';

export function useAudioStreamer(meetingId: string, isEnabled: boolean, userName: string, userId: string, language: string = 'en-IN', mode: string = 'transcribe') {
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isEnabled || !meetingId) return;

    let isCleanedUp = false;

    const startStreaming = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        // Sarvam expects 16kHz
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        await audioContext.audioWorklet.addModule('/audio-processor.js');

        if (isCleanedUp) return;

        const source = audioContext.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
        workletNodeRef.current = workletNode;

        const WS_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');
        const wsUrl = `${WS_BASE_URL}/meetings/${meetingId}/stt/ws?language=${language}&mode=${mode}&user_name=${encodeURIComponent(userName)}&user_id=${encodeURIComponent(userId)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("STT WebSocket OPENED!");
          source.connect(workletNode);
          // Do not connect to destination to prevent echo
          
          workletNode.port.onmessage = (event) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(event.data);
            }
          };
        };

        ws.onclose = (event) => {
          console.log(`STT WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
        };

      } catch (err) {
        console.error("Failed to start audio streamer:", err);
      }
    };

    startStreaming();

    return () => {
      console.log("useAudioStreamer cleanup running! isEnabled:", isEnabled);
      isCleanedUp = true;
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: "close" }));
        }
        wsRef.current.close();
      }
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [meetingId, isEnabled, userName, userId, language, mode]);
}
