import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from './client';
import type { 
  ProjectResponse, 
  DashboardResponse, 
  ProjectDashboardResponse,
  ProjectMemberResponse,
  InvitationResponse,
  InvitationDetailsResponse,
  PaginatedResponse
} from '../types';

// Dashboard
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetcher<DashboardResponse>('/projects/dashboard'),
  });
}

// Project Workspace Dashboard
export function useProjectDashboard(projectId: number) {
  return useQuery({
    queryKey: ['projectDashboard', projectId],
    queryFn: () => fetcher<ProjectDashboardResponse>(`/projects/${projectId}/dashboard`),
    enabled: !!projectId,
  });
}

// All Projects
export function useProjects(page: number = 1, size: number = 20) {
  return useQuery({
    queryKey: ['projects', page, size],
    queryFn: () => fetcher<PaginatedResponse<ProjectResponse>>(`/projects?page=${page}&size=${size}`),
  });
}

// Create Project Mutation
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; visibility: string; invite_emails: string[] }) => 
      fetcher<ProjectResponse>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Edit Project Mutation
export function useUpdateProject(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; description?: string; visibility?: string }) => 
      fetcher<ProjectResponse>(`/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectDashboard', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Delete Project Mutation
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number) => 
      fetcher(`/projects/${projectId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Member Roles Mutation
export function useUpdateMemberRole(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) => 
      fetcher<ProjectMemberResponse>(`/projects/${projectId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectDashboard', projectId] });
    },
  });
}

// Remove Member Mutation
export function useRemoveMember(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => 
      fetcher(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectDashboard', projectId] });
    },
  });
}

// Create Invitation Mutation
export function useCreateInvitation(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => 
      fetcher<InvitationResponse>(`/projects/${projectId}/invitations`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectDashboard', projectId] });
    },
  });
}

// Delete Invitation Mutation
export function useDeleteInvitation(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => 
      fetcher(`/projects/${projectId}/invitations/${invitationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectDashboard', projectId] });
    },
  });
}

// Accept Invitation Details
export function useInvitationDetails(token: string) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: () => fetcher<InvitationDetailsResponse>(`/invitations/${token}`),
    enabled: !!token,
  });
}

// Accept Invitation Mutation
export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => 
      fetcher<ProjectResponse>(`/invitations/${token}/accept`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
