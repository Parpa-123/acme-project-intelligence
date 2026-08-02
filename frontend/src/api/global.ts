import { useQuery } from '@tanstack/react-query';
import { fetcher } from './client';

export interface GlobalCitation {
  project_name: string | null;
  project_id: number | null;
  meeting_title: string | null;
}

export interface GlobalDecision extends GlobalCitation {
  id: string;
  decision: string;
  confidence: string | null;
  created_at: string;
}

export interface GlobalRequirement extends GlobalCitation {
  id: string;
  requirement: string;
  priority: string | null;
  created_at: string;
}

export interface GlobalActionItem extends GlobalCitation {
  id: string;
  description: string;
  assignee: string | null;
  due_date: string | null;
  status: string | null;
  created_at: string;
}

export interface GlobalSearchResult extends GlobalCitation {
  chunk: {
    id: string;
    text: string;
    created_at: string;
  };
  score: number;
}

export function useGlobalDecisions(page: number = 1) {
  return useQuery({
    queryKey: ['global-decisions', page],
    queryFn: async () => {
      return await fetcher<{ items: GlobalDecision[] }>(`/global-knowledge/decisions?page=${page}`);
    },
  });
}

export function useGlobalRequirements(page: number = 1) {
  return useQuery({
    queryKey: ['global-requirements', page],
    queryFn: async () => {
      return await fetcher<{ items: GlobalRequirement[] }>(`/global-knowledge/requirements?page=${page}`);
    },
  });
}

export function useGlobalActionItems(page: number = 1) {
  return useQuery({
    queryKey: ['global-action-items', page],
    queryFn: async () => {
      return await fetcher<{ items: GlobalActionItem[] }>(`/global-knowledge/action-items?page=${page}`);
    },
  });
}

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ['global-search', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      return await fetcher<GlobalSearchResult[]>(`/global-knowledge/search?q=${encodeURIComponent(query)}`);
    },
    enabled: !!query.trim()
  });
}
