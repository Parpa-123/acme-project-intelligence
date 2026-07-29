import { useParticipants } from '@livekit/components-react';
import { ParticipantKind } from 'livekit-client';
import { Users } from 'lucide-react';

export function ParticipantsPanel() {
  const allParticipants = useParticipants();
  const participants = allParticipants.filter(p => p.kind !== ParticipantKind.AGENT && !p.identity.startsWith('agent-'));

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="h-[60px] flex-shrink-0 border-b border-white/10 flex items-center justify-between px-4 glass-panel text-white">
        <h3 className="font-bold flex items-center gap-2 text-glow-sm">
          <Users className="w-4 h-4 text-indigo-400" />
          Participants ({participants.length})
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-transparent space-y-4 no-scrollbar">
        {participants.map((p) => (
          <div key={p.identity} className="flex items-center gap-4 glass-panel p-4 rounded-xl shadow-sm border border-white/10 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-sm ring-1 ring-indigo-500/30">
              {(p.name || p.identity).substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white text-glow-sm">
                {p.name || p.identity}
              </span>
              <span className="text-xs text-gray-400 mt-0.5">
                {p.isSpeaking ? 'Speaking...' : 'Joined'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
