import { useQuery } from '@tanstack/react-query';
import { fetcher } from './client';

export interface KnowledgeChunk {
  id: string;
  meeting_id: string;
  chunk_index: number;
  start_timestamp: string;
  end_timestamp: string;
  text: string;
  participant_ids: number[];
  entry_count: number;
  created_at: string;
  meeting_title?: string;
}

export interface ArtifactBase {
  id: string;
  meeting_id: string;
  knowledge_chunk_id?: string;
  created_at: string;
}

export interface Decision extends ArtifactBase {
  decision: string;
  confidence?: string;
}

export interface ActionItem extends ArtifactBase {
  assignee?: string;
  description: string;
  due_date?: string;
  status?: string;
}

export interface Requirement extends ArtifactBase {
  requirement: string;
  priority?: string;
}

export interface Concern extends ArtifactBase {
  concern: string;
  severity?: string;
}

export interface Topic extends ArtifactBase {
  topic: string;
}

export interface Summary extends ArtifactBase {
  summary: string;
  model?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  has_more: boolean;
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  score: number;
  meeting_title?: string;
}

// Hooks

export const useKnowledgeSearch = (projectId: number, query: string, meetingId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['knowledge', projectId, 'search', query, meetingId],
    queryFn: () => {
      let url = `/projects/${projectId}/knowledge/search?q=${encodeURIComponent(query)}`;
      if (meetingId) url += `&meeting_id=${meetingId}`;
      return fetcher<SearchResult[]>(url);
    },
    enabled: !!projectId && !!query && enabled,
  });
};

export const useKnowledgeChunks = (projectId: number, meetingId?: string, page = 1) => {
  return useQuery({
    queryKey: ['knowledge', projectId, 'chunks', meetingId, page],
    queryFn: () => {
      let url = `/projects/${projectId}/knowledge/chunks?page=${page}`;
      if (meetingId) url += `&meeting_id=${meetingId}`;
      return fetcher<PaginatedResponse<KnowledgeChunk>>(url);
    },
    enabled: !!projectId,
  });
};

export const useKnowledgeArtifacts = <T>(projectId: number, type: string, meetingId?: string, page = 1) => {
  return useQuery({
    queryKey: ['knowledge', projectId, type, meetingId, page],
    queryFn: () => {
      let url = `/projects/${projectId}/knowledge/${type}?page=${page}`;
      if (meetingId) url += `&meeting_id=${meetingId}`;
      return fetcher<PaginatedResponse<T>>(url);
    },
    enabled: !!projectId,
  });
};
