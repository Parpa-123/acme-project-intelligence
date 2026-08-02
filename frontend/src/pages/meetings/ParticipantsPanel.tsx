import { useParticipants } from '@livekit/components-react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

export function ParticipantsPanel() {
  const participants = useParticipants();

  return (
    <div className="flex flex-col h-full bg-[#111] overflow-y-auto p-4 space-y-4">
      {participants.map((p) => (
        <div key={p.identity} className="flex items-center gap-4 glass-panel p-4 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.3)] border border-white/10 hover:bg-white/5 transition-colors">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-sm ring-1 ring-indigo-500/30">
            {p.name ? p.name.charAt(0).toUpperCase() : p.identity.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white text-glow-sm">{p.name || p.identity}</p>
            <p className="text-xs text-gray-400">
              {p.isSpeaking ? 'Speaking...' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            {p.isMicrophoneEnabled ? <Mic className="w-4 h-4 text-green-400" /> : <MicOff className="w-4 h-4 text-red-400" />}
            {p.isCameraEnabled ? <Video className="w-4 h-4 text-green-400" /> : <VideoOff className="w-4 h-4 text-red-400" />}
          </div>
        </div>
      ))}
    </div>
  );
}
