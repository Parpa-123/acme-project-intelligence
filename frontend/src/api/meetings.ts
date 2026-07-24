import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from './client';
import type { 
  MeetingSpaceListResponse, 
  MeetingSpaceDetailResponse,
  MeetingSpaceCreateResponse,
  MeetingJoinResponse 
} from '../types';

export const useMeetingSpaces = (projectId: number) => {
  return useQuery({
    queryKey: ['projects', projectId, 'meeting-spaces'],
    queryFn: () => fetcher<MeetingSpaceListResponse[]>(`/projects/${projectId}/meeting-spaces`),
    enabled: !!projectId,
  });
};

export const useMeetingSpaceDetail = (spaceId: string) => {
  return useQuery({
    queryKey: ['meeting-spaces', spaceId],
    queryFn: () => fetcher<MeetingSpaceDetailResponse>(`/meeting-spaces/${spaceId}`),
    enabled: !!spaceId,
  });
};

export const useCreateMeetingSpace = (projectId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => 
      fetcher<MeetingSpaceCreateResponse>(`/projects/${projectId}/meeting-spaces`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'meeting-spaces'] });
    },
  });
};

export const useJoinMeeting = () => {
  return useMutation({
    mutationFn: (spaceId: string) => 
      fetcher<MeetingJoinResponse>(`/meeting-spaces/${spaceId}/join`, {
        method: 'POST',
      }),
  });
};

export const useLeaveMeeting = () => {
  return useMutation({
    mutationFn: (meetingId: string) => 
      fetcher<{ status: string; message: string }>(`/meetings/${meetingId}/leave`, {
        method: 'POST',
      }),
  });
};

export interface ChatMessage {
  id: string;
  meeting_id: string;
  user_id: number;
  user_name: string;
  message: string;
  message_type: string;
  created_at: string;
}

export const useMeetingMessages = (meetingId: string | undefined) => {
  return useQuery({
    queryKey: ['meetings', meetingId, 'messages'],
    queryFn: () => fetcher<ChatMessage[]>(`/meetings/${meetingId}/messages`),
    enabled: !!meetingId,
    refetchInterval: false, // We'll rely on WebRTC for real-time updates
  });
};

export const useSendMeetingMessage = (meetingId: string | undefined) => {
  return useMutation({
    mutationFn: (data: { message: string; message_type?: string }) => 
      fetcher<ChatMessage>(`/meetings/${meetingId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
};

export interface TranscriptEvent {
  type: string;
  meeting_id: string;
  timestamp: string;
  payload: {
    speaker: string;
    user_name: string;
    text: string;
    is_final: boolean;
  };
}

export interface MeetingTranscriptResponse {
  id: string;
  meeting_id: string;
  user_id: number;
  user_name: string;
  text: string;
  is_final: boolean;
  created_at: string;
}

export const useMeetingTranscripts = (meetingId: string | undefined) => {
  return useQuery({
    queryKey: ['meetings', meetingId, 'transcripts'],
    queryFn: () => fetcher<MeetingTranscriptResponse[]>(`/meetings/${meetingId}/transcript`),
    enabled: !!meetingId,
    refetchInterval: false,
  });
};

export const useStartStt = () => {
  return useMutation({
    mutationFn: (meetingId: string) => 
      fetcher<{ status: string; message: string }>(`/meetings/${meetingId}/start-stt`, {
        method: 'POST',
      }),
  });
};
