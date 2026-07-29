import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useTracks,
  useConnectionState,
  ParticipantTile,
  useTrackToggle,
  useDisconnectButton,
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import { Video, Mic, MicOff, VideoOff, PhoneOff, MonitorUp, Loader2, MessageSquare, FileText, Users, Bot, BotOff } from 'lucide-react';
import { useLeaveMeeting } from '../../api/meetings';
import { RightSidebar } from './RightSidebar';
import type { SidebarTab } from './RightSidebar';
import { useAudioStreamer } from '../../hooks/useAudioStreamer';

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
      className="h-screen w-screen bg-[#050505] flex flex-col overflow-hidden relative"
    >
      {/* Background gradients for depth */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <MeetingUI meetingId={meetingId} onLeave={handleDisconnected} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function MeetingUI({ meetingId, onLeave }: { meetingId: string, onLeave: () => void }) {
  const connectionState = useConnectionState();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-6 flex items-center justify-center min-h-0 bg-transparent z-10">
          <div className="w-full h-full grid gap-6" style={{ 
          gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
          gridAutoRows: '1fr'
        }}>
          {tracks.map((trackRef) => (
            <div key={trackRef.participant.identity + trackRef.source} className="rounded-2xl overflow-hidden glass-panel border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative group">
              <ParticipantTile 
                trackRef={trackRef}
                className="w-full h-full object-cover"
                style={{ width: '100%', height: '100%' }}
              />
              <div className="absolute bottom-4 left-4 bg-[#0A0A0A]/80 border border-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center text-glow-sm shadow-lg">
                {trackRef.participant.name || trackRef.participant.identity}
              </div>
            </div>
          ))}
        </div>
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
        onLeave={onLeave}
      />
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
  onLeave
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
  onLeave: () => void;
}) {
  
  // Microphone Toggle
  const { buttonProps: micProps, enabled: isMicEnabled } = useTrackToggle({ source: Track.Source.Microphone });
  const isMicMuted = !isMicEnabled;

  // Camera Toggle
  const { buttonProps: cameraProps, enabled: isCameraEnabled } = useTrackToggle({ source: Track.Source.Camera });
  const isCameraOff = !isCameraEnabled;

  // Screen Share Toggle
  const { buttonProps: screenShareProps, enabled: isScreenShareEnabled } = useTrackToggle({ source: Track.Source.ScreenShare });

  // Disconnect Button
  const { buttonProps: disconnectProps } = useDisconnectButton({ stopTracks: true });

  const handleDisconnect = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disconnectProps.onClick) disconnectProps.onClick(e);
    onLeave();
  };

  useAudioStreamer(meetingId, isTranscriptionEnabled, sttLanguage, sttMode);

  return (
    <div className="h-24 bg-[#0A0A0A]/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-center gap-4 px-6 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
      <button 
        {...micProps}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-all cursor-pointer shadow-lg backdrop-blur-md ${
          isMicMuted ? 'bg-red-500/80 hover:bg-red-500 text-white ring-1 ring-red-500/50' : 'bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/20'
        }`}
      >
        {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>

      <button 
        {...cameraProps}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-all cursor-pointer shadow-lg backdrop-blur-md ${
          isCameraOff ? 'bg-red-500/80 hover:bg-red-500 text-white ring-1 ring-red-500/50' : 'bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/20'
        }`}
      >
        {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
      </button>

      <button 
        {...screenShareProps}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-all cursor-pointer shadow-lg backdrop-blur-md ${
          isScreenShareEnabled ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30' : 'bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/20'
        }`}
      >
        <MonitorUp className="w-6 h-6" />
      </button>

      <div className="w-px h-10 bg-white/10 mx-2" />

      <div className="flex items-center glass-panel rounded-full pl-2 pr-4 h-14 border border-white/10">
        <button 
          onClick={() => setIsTranscriptionEnabled(!isTranscriptionEnabled)}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-all cursor-pointer shadow-md ${
            isTranscriptionEnabled ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-white/10 hover:bg-white/20 text-gray-400 ring-1 ring-white/20'
          }`}
          title={isTranscriptionEnabled ? "Stop AI Transcription" : "Start AI Transcription"}
        >
          {isTranscriptionEnabled ? <Bot className="w-5 h-5" /> : <BotOff className="w-5 h-5" />}
        </button>
        <div className="flex flex-col ml-3 gap-1">
          <select 
            value={sttMode} 
            onChange={(e) => setSttMode(e.target.value)}
            disabled={isTranscriptionEnabled}
            className="text-xs bg-black/50 text-gray-300 rounded border border-white/10 px-2 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
          >
            <option value="transcribe" className="bg-[#1A1A1A]">Transcribe</option>
            <option value="translate" className="bg-[#1A1A1A]">Translate (EN)</option>
            <option value="codemix" className="bg-[#1A1A1A]">Codemix</option>
            <option value="verbatim" className="bg-[#1A1A1A]">Verbatim</option>
            <option value="translit" className="bg-[#1A1A1A]">Translit</option>
          </select>
          <select 
            value={sttLanguage} 
            onChange={(e) => setSttLanguage(e.target.value)}
            disabled={isTranscriptionEnabled}
            className="text-xs bg-black/50 text-gray-300 rounded border border-white/10 px-2 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
          >
            <option value="en-IN" className="bg-[#1A1A1A]">English (IN)</option>
            <option value="hi-IN" className="bg-[#1A1A1A]">Hindi</option>
            <option value="bn-IN" className="bg-[#1A1A1A]">Bengali</option>
            <option value="kn-IN" className="bg-[#1A1A1A]">Kannada</option>
            <option value="ml-IN" className="bg-[#1A1A1A]">Malayalam</option>
            <option value="mr-IN" className="bg-[#1A1A1A]">Marathi</option>
            <option value="or-IN" className="bg-[#1A1A1A]">Odia</option>
            <option value="pa-IN" className="bg-[#1A1A1A]">Punjabi</option>
            <option value="ta-IN" className="bg-[#1A1A1A]">Tamil</option>
            <option value="te-IN" className="bg-[#1A1A1A]">Telugu</option>
            <option value="gu-IN" className="bg-[#1A1A1A]">Gujarati</option>
          </select>
        </div>
      </div>

      <div className="w-px h-10 bg-white/10 mx-2" />

      {/* Participants Toggle */}
      <button 
        onClick={() => toggleSidebar('participants')}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-all cursor-pointer shadow-lg backdrop-blur-md ${
          isSidebarOpen && activeTab === 'participants' ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30' : 'bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/20'
        }`}
        title="Participants"
      >
        <Users className="w-6 h-6" />
      </button>

      {/* Chat Toggle */}
      <button 
        onClick={() => toggleSidebar('chat')}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-all cursor-pointer shadow-lg backdrop-blur-md ${
          isSidebarOpen && activeTab === 'chat' ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30' : 'bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/20'
        }`}
        title="Chat"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Transcript Toggle */}
      <button 
        onClick={() => toggleSidebar('transcript')}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-all cursor-pointer shadow-lg backdrop-blur-md ${
          isSidebarOpen && activeTab === 'transcript' ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30' : 'bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/20'
        }`}
        title="Transcript"
      >
        <FileText className="w-6 h-6" />
      </button>

      <div className="w-px h-10 bg-white/10 mx-2" />

      <button 
        {...disconnectProps}
        onClick={handleDisconnect}
        className="w-14 h-14 flex items-center justify-center rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.4)] ring-1 ring-red-500/50"
      >
        <PhoneOff className="w-6 h-6" />
      </button>
    </div>
  );
}
