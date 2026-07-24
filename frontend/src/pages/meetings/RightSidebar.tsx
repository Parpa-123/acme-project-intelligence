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
    <div className="w-80 h-full bg-white flex flex-col flex-shrink-0 z-10 border-l border-gray-200">
      {/* Tabs Header */}
      <div className="h-[60px] flex-shrink-0 border-b border-gray-200 flex items-center justify-between px-2 bg-gray-50 text-gray-600">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setActiveTab('participants')}
            className={`p-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium ${
              activeTab === 'participants' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:bg-gray-200 hover:text-gray-900'
            }`}
            title="Participants"
          >
            <Users className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setActiveTab('chat')}
            className={`p-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium ${
              activeTab === 'chat' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:bg-gray-200 hover:text-gray-900'
            }`}
            title="Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setActiveTab('transcript')}
            className={`p-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium ${
              activeTab === 'transcript' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:bg-gray-200 hover:text-gray-900'
            }`}
            title="Transcript"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
        
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200 transition-colors">
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
