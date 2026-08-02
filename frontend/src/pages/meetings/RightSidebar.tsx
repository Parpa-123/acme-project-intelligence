import { ChatPanel } from './ChatPanel';
import { TranscriptPanel } from './TranscriptPanel';
import { ParticipantsPanel } from './ParticipantsPanel';
import { MessageSquare, FileText, Users, X } from 'lucide-react';

export type SidebarTab = 'chat' | 'transcript' | 'participants';

export function RightSidebar({ 
  meetingId, 
  activeTab, 
  setActiveTab, 
  onClose 
}: { 
  meetingId: string; 
  activeTab: SidebarTab; 
  setActiveTab: (tab: SidebarTab) => void;
  onClose: () => void;
}) {
  return (
    <div className="w-80 h-full flex flex-col flex-shrink-0 z-10 border-l border-white/10 bg-[#111] text-white">
      {/* Tabs Header */}
      <div className="h-14 flex-shrink-0 border-b border-white/10 flex items-center justify-between px-3 bg-[#181818]">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setActiveTab('participants')}
            className={`p-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium ${
              activeTab === 'participants' ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-gray-400 hover:bg-[#222] hover:text-white'
            }`}
            title="Participants"
          >
            <Users className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setActiveTab('chat')}
            className={`p-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium ${
              activeTab === 'chat' ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-gray-400 hover:bg-[#222] hover:text-white'
            }`}
            title="Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setActiveTab('transcript')}
            className={`p-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium ${
              activeTab === 'transcript' ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-gray-400 hover:bg-[#222] hover:text-white'
            }`}
            title="Transcript"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
        
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-md hover:bg-[#222] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'participants' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <ParticipantsPanel />
        </div>
        <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <ChatPanel meetingId={meetingId} />
        </div>
        <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'transcript' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <TranscriptPanel meetingId={meetingId} />
        </div>
      </div>
    </div>
  );
}
