export type ProjectVisibility = 'private' | 'public';
export type MemberRole = 'owner' | 'admin' | 'member';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export interface UserBasicInfo {
  id: number;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface ProjectResponse {
  id: number;
  owner_id: number;
  name: string;
  description: string | null;
  visibility: ProjectVisibility;
  created_at: string;
  updated_at: string | null;
}

export interface ProjectMemberResponse {
  id: number;
  project_id: number;
  user_id: number;
  role: MemberRole;
  created_at: string;
  user: UserBasicInfo | null;
}

export interface InvitationResponse {
  id: string;
  project_id: number;
  email: string;
  status: InvitationStatus;
  invited_by: number;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface DashboardResponse {
  total_projects: number;
  projects_owned: number;
  projects_joined: number;
  recent_projects: ProjectResponse[];
  pending_invitations: InvitationResponse[];
}

export interface ProjectDashboardResponse {
  project: ProjectResponse;
  total_members: number;
  pending_invitations_count: number;
  recent_members: ProjectMemberResponse[];
  current_user_role: 'owner' | 'admin' | 'member' | null;
}

export interface InvitationDetailsResponse {
  id: string;
  project: ProjectResponse;
  email: string;
  status: InvitationStatus;
  invited_by_user: UserBasicInfo | null;
  expires_at: string;
  created_at: string;
}

export interface MeetingSpaceListResponse {
  id: string;
  name: string;
  active_session: boolean;
}

export interface ActiveMeetingSummary {
  id: string;
  status: string;
  participant_count: number;
}

export interface UserSummary {
  id: number;
  display_name: string;
}

export interface MeetingSpaceDetailResponse {
  id: string;
  project_id: number;
  name: string;
  description: string | null;
  join_url: string;
  active_meeting: ActiveMeetingSummary | null;
  created_by: UserSummary;
  created_at: string;
  is_archived: boolean;
}

export interface MeetingSpaceCreateResponse {
  id: string;
  join_url: string;
}

export interface MeetingJoinResponse {
  meeting_id: string;
  room_name: string;
  livekit_url: string;
  access_token: string;
  expires_at: string;
}

export interface MeetingHistoryResponse {
  id: string;
  name: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
}

export interface KnowledgeChunkResponse {
  id: string;
  chunk_index: number;
  entry_count: number;
  participants: string[];
  text: string;
  start_timestamp: string;
  end_timestamp: string;
}

export interface MeetingSummaryResponse {
  summary: string | null;
  model?: string;
  created_at?: string;
}

export interface MeetingDecisionResponse {
  id: number;
  decision: string;
  confidence: string;
  knowledge_chunk_id: string;
}

export interface MeetingActionItemResponse {
  id: number;
  assignee: string;
  description: string;
  due_date: string | null;
  status: string;
  knowledge_chunk_id: string;
}

export interface MeetingRequirementResponse {
  id: number;
  requirement: string;
  priority: string;
  knowledge_chunk_id: string;
}

export interface MeetingConcernResponse {
  id: number;
  concern: string;
  severity: string;
  knowledge_chunk_id: string;
}

export interface MeetingTopicResponse {
  id: number;
  topic: string;
  knowledge_chunk_id: string;
}

export interface MeetingTranscriptResponse {
  id: string;
  meeting_id: string;
  user_id: number | string;
  user_name: string;
  text: string;
  is_final: boolean;
  created_at: string;
}

export interface RetrievalRequest {
  query: string;
  meeting_id?: string | null;
}

export interface RetrievalCandidate {
  chunk_id: string;
  meeting_id: string;
  score: number;
  text: string;
  metadata: Record<string, any>;
}

export interface RetrievalResponse {
  query: string;
  results: RetrievalCandidate[];
}

export interface ContextSource {
  chunk_id: string;
  meeting_id: string;
  sequence_number: number;
  score: number;
  rerank_score: number;
}

export interface ContextPackage {
  context_text: string;
  total_tokens: number;
  sources: ContextSource[];
  metadata: Record<string, any>;
}
