import { useParticipants } from '@livekit/components-react';
import { ParticipantKind } from 'livekit-client';
import { Users } from 'lucide-react';

export function ParticipantsPanel() {
  const allParticipants = useParticipants();
  const participants = allParticipants.filter(p => p.kind !== ParticipantKind.AGENT && !p.identity.startsWith('agent-'));

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="h-[60px] flex-shrink-0 border-b border-gray-200 flex items-center justify-between px-4 bg-white text-gray-900">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          Participants ({participants.length})
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
        {participants.map((p) => (
          <div key={p.identity} className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
              {(p.name || p.identity).substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {p.name || p.identity}
              </span>
              <span className="text-xs text-gray-500">
                {p.isSpeaking ? 'Speaking...' : 'Joined'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
