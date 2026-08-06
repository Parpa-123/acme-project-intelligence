import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useTracks,
  useConnectionState,
  ParticipantTile,
  TrackToggle,
  DisconnectButton,
  GridLayout,
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import { Loader2, PhoneOff, MessageSquare, FileText, Users, Bot, BotOff } from 'lucide-react';
import { useLeaveMeeting } from '../../api/meetings';
import { RightSidebar } from './RightSidebar';
import type { SidebarTab } from './RightSidebar';
import { useAudioStreamer } from '../../hooks/useAudioStreamer';
import { useCurrentUser } from '../../api/user';
import { fetcher } from '../../api/client';
import { useEffect } from 'react';



export function MeetingRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const leaveMeeting = useLeaveMeeting();
  
  // URL and Token passed from PreJoin
  const { token, url, meetingId, initialVideo, initialAudio } = location.state || {};

  if (!token || !url) {
    // If someone navigated directly to the room URL without going through PreJoin
    navigate(`/projects/${projectId}`, { replace: true });
    return null;
  }

  // Ensure the backend registers the leave event even if the browser tab is closed abruptly
  useEffect(() => {
    if (!meetingId) return;

    const fireLeaveBeacon = () => {
      // Use standard fetcher but with keepalive: true so it survives tab close.
      // This is crucial because SuperTokens intercepts fetch to add auth headers/cookies, 
      // which sendBeacon bypasses, leading to 401 Unauthorized.
      fetcher(`/meetings/${meetingId}/leave`, {
        method: 'POST',
        keepalive: true,
      }).catch(e => console.error("Keepalive leave failed", e));
    };

    window.addEventListener('beforeunload', fireLeaveBeacon);

    return () => {
      window.removeEventListener('beforeunload', fireLeaveBeacon);
      fireLeaveBeacon(); // Also fire on React unmount (SPA navigation)
    };
  }, [meetingId]);

  const handleDisconnected = async () => {
    // Notify backend that user left
    if (meetingId) {
      try {
        await leaveMeeting.mutateAsync(meetingId);
      } catch (e) {
        console.error('Failed to leave meeting cleanly', e);
      }
    }
    // Navigate back to the project when disconnected
    navigate(`/projects/${projectId}`);
  };

  return (
    <LiveKitRoom
      video={initialVideo}
      audio={initialAudio}
      token={token}
      serverUrl={url}
      data-lk-theme="default"
      style={{ height: '100dvh', width: '100vw', backgroundColor: '#111' }}
    >
      <MeetingUI meetingId={meetingId} onLeave={handleDisconnected} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function MeetingUI({ meetingId, onLeave }: { meetingId: string, onLeave: () => void }) {
  const { data: user } = useCurrentUser();
  const userName = user ? (user.full_name || user.email.split('@')[0]) : "Unknown User";
  const userId = user ? user.id.toString() : "";

  const connectionState = useConnectionState();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>('chat');
  
  const [isTranscriptionEnabled, setIsTranscriptionEnabled] = useState(false);
  const [sttMode, setSttMode] = useState('transcribe');
  const [sttLanguage, setSttLanguage] = useState('en-IN');
  
  // Transcription is handled entirely server-side by the LiveKit Agent now.
  // We keep the state here if we want to pass user preferences (mode, language) in the future
  // via a data message or explicit dispatch.

  // Get all camera and screenshare tracks
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  if (connectionState !== ConnectionState.Connected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="text-lg text-gray-400">Connecting to secure room...</p>
      </div>
    );
  }

  const toggleSidebar = (tab: SidebarTab) => {
    if (isSidebarOpen && activeTab === tab) {
      setIsSidebarOpen(false);
    } else {
      setActiveTab(tab);
      setIsSidebarOpen(true);
    }
  };

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-[#111]">
      <div className="flex-1 relative flex flex-col min-w-0">
        <GridLayout tracks={tracks} style={{ height: '100%', width: '100%' }}>
          <ParticipantTile />
        </GridLayout>

        {/* Persistent Call Cut Marker */}
        <div className="absolute top-4 right-4 z-50">
          <DisconnectButton stopTracks={true} onClick={onLeave} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-bold shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <PhoneOff className="w-5 h-5" />
            <span>Leave</span>
          </DisconnectButton>
        </div>

        {/* Control Bar */}
        <CustomControlBar 
          isSidebarOpen={isSidebarOpen} 
          activeTab={activeTab}
          toggleSidebar={toggleSidebar}
          isTranscriptionEnabled={isTranscriptionEnabled}
          setIsTranscriptionEnabled={setIsTranscriptionEnabled}
          sttMode={sttMode}
          setSttMode={setSttMode}
          sttLanguage={sttLanguage}
          setSttLanguage={setSttLanguage}
          meetingId={meetingId}
          userName={userName}
          userId={userId}
        />
      </div>

      {/* Right Sidebar */}
      {isSidebarOpen && (
        <RightSidebar 
          meetingId={meetingId} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onClose={() => setIsSidebarOpen(false)} 
        />
      )}
    </div>
  );
}

function CustomControlBar({ 
  isSidebarOpen, 
  activeTab,
  toggleSidebar,
  isTranscriptionEnabled,
  setIsTranscriptionEnabled,
  sttMode,
  setSttMode,
  sttLanguage,
  setSttLanguage,
  meetingId,
  userName,
  userId
}: { 
  isSidebarOpen: boolean; 
  activeTab: SidebarTab;
  toggleSidebar: (tab: SidebarTab) => void;
  isTranscriptionEnabled: boolean;
  setIsTranscriptionEnabled: (val: boolean | ((prev: boolean) => boolean)) => void;
  sttMode: string;
  setSttMode: (mode: string) => void;
  sttLanguage: string;
  setSttLanguage: (lang: string) => void;
  meetingId: string;
  userName: string;
  userId: string;
}) {
  
  useAudioStreamer(meetingId, isTranscriptionEnabled, userName, userId, sttLanguage, sttMode);

  return (
    <div className="lk-control-bar absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-xl border border-white/10 bg-[#111]/90 backdrop-blur">
      <div className="flex items-center gap-2">
        <TrackToggle source={Track.Source.Microphone} className="lk-button" />
        <TrackToggle source={Track.Source.Camera} className="lk-button" />
        <TrackToggle source={Track.Source.ScreenShare} className="lk-button" />
      </div>


      <div className="lk-button-group">
        <button 
          onClick={() => setIsTranscriptionEnabled(!isTranscriptionEnabled)}
          className="lk-button"
          title={isTranscriptionEnabled ? "Stop AI Transcription" : "Start AI Transcription"}
          aria-pressed={isTranscriptionEnabled}
        >
          {isTranscriptionEnabled ? <Bot className="w-5 h-5" /> : <BotOff className="w-5 h-5" />}
        </button>
        <div className="flex flex-col mx-2 gap-1 justify-center">
          <select 
            value={sttMode} 
            onChange={(e) => setSttMode(e.target.value)}
            disabled={isTranscriptionEnabled}
            className="text-xs bg-[#111] text-gray-300 rounded border border-white/10 px-2 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
          >
            <option value="transcribe">Transcribe</option>
            <option value="translate">Translate (EN)</option>
            <option value="codemix">Codemix</option>
            <option value="verbatim">Verbatim</option>
            <option value="translit">Translit</option>
          </select>
          <select 
            value={sttLanguage} 
            onChange={(e) => setSttLanguage(e.target.value)}
            disabled={isTranscriptionEnabled}
            className="text-xs bg-[#111] text-gray-300 rounded border border-white/10 px-2 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
          >
            <option value="en-IN">English (IN)</option>
            <option value="hi-IN">Hindi</option>
            <option value="bn-IN">Bengali</option>
            <option value="kn-IN">Kannada</option>
            <option value="ml-IN">Malayalam</option>
            <option value="mr-IN">Marathi</option>
            <option value="or-IN">Odia</option>
            <option value="pa-IN">Punjabi</option>
            <option value="ta-IN">Tamil</option>
            <option value="te-IN">Telugu</option>
            <option value="gu-IN">Gujarati</option>
          </select>
        </div>
      </div>

      <div className="lk-button-group">
        {/* Participants Toggle */}
        <button 
          onClick={() => toggleSidebar('participants')}
          className="lk-button"
          aria-pressed={isSidebarOpen && activeTab === 'participants'}
          title="Participants"
        >
          <Users className="w-5 h-5" />
        </button>

        {/* Chat Toggle */}
        <button 
          onClick={() => toggleSidebar('chat')}
          className="lk-button"
          aria-pressed={isSidebarOpen && activeTab === 'chat'}
          title="Chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Transcript Toggle */}
        <button 
          onClick={() => toggleSidebar('transcript')}
          className="lk-button"
          aria-pressed={isSidebarOpen && activeTab === 'transcript'}
          title="Transcript"
        >
          <FileText className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
