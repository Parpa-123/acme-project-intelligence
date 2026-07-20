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

