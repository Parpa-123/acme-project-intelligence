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
      onDisconnected={handleDisconnected}
      className="h-screen w-screen bg-gray-950 flex flex-col overflow-hidden"
    >
      <MeetingUI meetingId={meetingId} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function MeetingUI({ meetingId }: { meetingId: string }) {
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
        <div className="flex-1 p-4 flex items-center justify-center min-h-0 bg-gray-950">
          <div className="w-full h-full grid gap-4" style={{ 
          gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
          gridAutoRows: '1fr'
        }}>
          {tracks.map((trackRef) => (
            <div key={trackRef.participant.identity + trackRef.source} className="rounded-xl overflow-hidden bg-gray-900 ring-1 ring-gray-800 shadow-xl relative group">
              <ParticipantTile 
                trackRef={trackRef}
                className="w-full h-full object-cover"
                style={{ width: '100%', height: '100%' }}
              />
              <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-md px-3 py-1.5 rounded-md text-sm font-medium text-white flex items-center">
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
  meetingId
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

  useAudioStreamer(meetingId, isTranscriptionEnabled, sttLanguage, sttMode);

  return (
    <div className="h-24 bg-gray-900 border-t border-gray-800 flex items-center justify-center gap-4 px-6">
      <button 
        {...micProps}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-colors ${
          isMicMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'
        }`}
      >
        {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>

      <button 
        {...cameraProps}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-colors ${
          isCameraOff ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'
        }`}
      >
        {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
      </button>

      <button 
        {...screenShareProps}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-colors ${
          isScreenShareEnabled ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'
        }`}
      >
        <MonitorUp className="w-6 h-6" />
      </button>

      <div className="w-px h-10 bg-gray-800 mx-2" />

      <div className="flex items-center bg-gray-800 rounded-full pl-2 pr-4 h-14">
        <button 
          onClick={() => setIsTranscriptionEnabled(!isTranscriptionEnabled)}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            isTranscriptionEnabled ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
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
            className="text-xs bg-gray-900 text-gray-300 rounded border border-gray-700 px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
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
            className="text-xs bg-gray-900 text-gray-300 rounded border border-gray-700 px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
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

      <div className="w-px h-10 bg-gray-800 mx-2" />

      {/* Participants Toggle */}
      <button 
        onClick={() => toggleSidebar('participants')}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-colors ${
          isSidebarOpen && activeTab === 'participants' ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'
        }`}
        title="Participants"
      >
        <Users className="w-6 h-6" />
      </button>

      {/* Chat Toggle */}
      <button 
        onClick={() => toggleSidebar('chat')}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-colors ${
          isSidebarOpen && activeTab === 'chat' ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'
        }`}
        title="Chat"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Transcript Toggle */}
      <button 
        onClick={() => toggleSidebar('transcript')}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-colors ${
          isSidebarOpen && activeTab === 'transcript' ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'
        }`}
        title="Transcript"
      >
        <FileText className="w-6 h-6" />
      </button>

      <div className="w-px h-10 bg-gray-800 mx-2" />

      <button 
        {...disconnectProps}
        className="w-14 h-14 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
      >
        <PhoneOff className="w-6 h-6" />
      </button>
    </div>
  );
}
