import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJoinMeeting, useMeetingSpaceDetail } from '../../api/meetings';
import { Video, Mic, MicOff, VideoOff, ChevronLeft, Loader2 } from 'lucide-react';
import { createLocalVideoTrack, LocalVideoTrack } from 'livekit-client';
import { Button } from '../../components/ui/Button';

export function MeetingPreJoin() {
  const { projectId, spaceId } = useParams<{ projectId: string; spaceId: string }>();
  const navigate = useNavigate();
  
  const { data: spaceDetail, isLoading: isLoadingSpace } = useMeetingSpaceDetail(spaceId!);
  const joinMeeting = useJoinMeeting();
  
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let track: LocalVideoTrack | null = null;
    if (videoEnabled) {
      createLocalVideoTrack({ facingMode: 'user' }).then((t) => {
        track = t;
        setVideoTrack(t);
        if (videoRef.current) {
          t.attach(videoRef.current);
        }
      }).catch(err => {
        console.error("Failed to acquire video track", err);
        setVideoEnabled(false);
      });
    }

    return () => {
      if (track) {
        track.stop();
        track.detach();
      }
    };
  }, [videoEnabled]);

  const handleJoin = () => {
    setJoinError(null);
    
    joinMeeting.mutate(spaceId!, {
      onSuccess: (data) => {
        if (videoTrack) {
          videoTrack.stop();
          videoTrack.detach();
        }
        
        // Pass the token and URL to the room component via history state
        navigate(`/projects/${projectId}/spaces/${spaceId}/room`, {
          state: {
            token: data.access_token,
            url: data.livekit_url,
            meetingId: data.meeting_id,
            initialVideo: videoEnabled,
            initialAudio: audioEnabled
          }
        });
      },
      onError: (err: any) => {
        console.error("Failed to join meeting", err);
        setJoinError(err.message || "Failed to join meeting. Please try again.");
      }
    });
  };

  if (isLoadingSpace) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      {/* Header */}
      <header className="px-6 py-4 flex items-center border-b border-white/10 glass-panel">
        <button 
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-gray-400 hover:text-white flex items-center transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Project
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 gap-12 max-w-6xl mx-auto w-full relative z-10">
        
        {/* Left: Video Preview */}
        <div className="flex-1 w-full max-w-2xl">
          <div className="relative aspect-video glass-panel rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
            {videoEnabled ? (
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform scale-x-[-1]" 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mb-4">
                  <VideoOff className="w-10 h-10" />
                </div>
                <p>Camera is off</p>
              </div>
            )}

            {/* In-video controls */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button 
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-4 rounded-full shadow-lg backdrop-blur-md transition-all cursor-pointer ${
                  audioEnabled ? 'bg-white/10 text-white hover:bg-white/20 ring-1 ring-white/20' : 'bg-red-500/80 text-white hover:bg-red-500 ring-1 ring-red-500/50'
                }`}
              >
                {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>
              
              <button 
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`p-4 rounded-full shadow-lg backdrop-blur-md transition-all cursor-pointer ${
                  videoEnabled ? 'bg-white/10 text-white hover:bg-white/20 ring-1 ring-white/20' : 'bg-red-500/80 text-white hover:bg-red-500 ring-1 ring-red-500/50'
                }`}
              >
                {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Join Form */}
        <div className="w-full lg:w-96 flex flex-col items-center lg:items-start text-center lg:text-left glass-panel p-8 rounded-2xl border border-white/10 shadow-xl">
          {spaceDetail?.active_meeting ? (
            <div className="inline-block px-3 py-1 mb-4 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold tracking-wider uppercase border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              Meeting is Live
            </div>
          ) : (
            <div className="inline-block px-3 py-1 mb-4 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold tracking-wider uppercase border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse">
              Waiting for Host...
            </div>
          )}
        
          <h1 className="text-3xl font-extrabold text-white mb-3 text-glow-md">{spaceDetail?.name || 'Meeting Room'}</h1>
          <p className="text-gray-400 mb-8">{spaceDetail?.description || 'Join the persistent meeting space for this project.'}</p>
          
          {joinError && (
            <div className="w-full p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              {joinError}
            </div>
          )}
          
          <Button
            onClick={handleJoin}
            disabled={joinMeeting.isPending}
            className="w-full py-6 text-lg cursor-pointer"
            isLoading={joinMeeting.isPending}
          >
            {joinMeeting.isPending ? 'Joining...' : 'Join Meeting'}
          </Button>
          
          <p className="mt-4 text-sm text-gray-500">
            Make sure your camera and microphone are configured correctly before joining.
          </p>
        </div>
      </main>
    </div>
  );
}
