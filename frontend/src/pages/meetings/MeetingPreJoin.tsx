import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJoinMeeting, useMeetingSpaceDetail } from '../../api/meetings';
import { Video, Mic, MicOff, VideoOff, ChevronLeft, Loader2 } from 'lucide-react';
import { createLocalVideoTrack, LocalVideoTrack } from 'livekit-client';

export function MeetingPreJoin() {
  const { projectId, spaceId } = useParams<{ projectId: string; spaceId: string }>();
  const navigate = useNavigate();
  
  const { data: spaceDetail, isLoading: isLoadingSpace } = useMeetingSpaceDetail(spaceId!);
  const joinMeeting = useJoinMeeting();
  
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack | null>(null);
  
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
    if (videoTrack) {
      videoTrack.stop();
      videoTrack.detach();
    }
    
    joinMeeting.mutate(spaceId!, {
      onSuccess: (data) => {
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
      onError: (err) => {
        console.error("Failed to join meeting", err);
        alert("Failed to join meeting. See console.");
      }
    });
  };

  if (isLoadingSpace) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center border-b border-gray-800">
        <button 
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-gray-400 hover:text-white flex items-center transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Project
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 gap-12 max-w-6xl mx-auto w-full">
        
        {/* Left: Video Preview */}
        <div className="flex-1 w-full max-w-2xl">
          <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-2xl ring-1 ring-gray-700">
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
                className={`p-4 rounded-full shadow-lg backdrop-blur-md transition-colors ${
                  audioEnabled ? 'bg-gray-900/60 text-white hover:bg-gray-900/80' : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>
              
              <button 
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`p-4 rounded-full shadow-lg backdrop-blur-md transition-colors ${
                  videoEnabled ? 'bg-gray-900/60 text-white hover:bg-gray-900/80' : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Join Form */}
        <div className="w-full lg:w-96 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-3xl font-bold text-white mb-2">{spaceDetail?.name || 'Meeting Room'}</h1>
          <p className="text-gray-400 mb-8">{spaceDetail?.description || 'Join the persistent meeting space for this project.'}</p>
          
          <button
            onClick={handleJoin}
            disabled={joinMeeting.isPending}
            className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-lg transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {joinMeeting.isPending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              'Join Meeting'
            )}
          </button>
          
          <p className="mt-4 text-sm text-gray-500">
            Make sure your camera and microphone are configured correctly before joining.
          </p>
        </div>
      </main>
    </div>
  );
}
