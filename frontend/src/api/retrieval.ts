import { useMutation } from '@tanstack/react-query';
import { fetcher } from './client';
import type { RetrievalRequest, RetrievalResponse, ContextPackage } from '../types';

export const useProjectSearch = (projectId: number) => {
  return useMutation({
    mutationFn: (request: RetrievalRequest) => 
      fetcher<RetrievalResponse>(`/projects/${projectId}/search`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
  });
};

export const useProjectRetrieve = (projectId: number) => {
  return useMutation({
    mutationFn: (request: RetrievalRequest) => 
      fetcher<ContextPackage>(`/projects/${projectId}/retrieve`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
  });
};
