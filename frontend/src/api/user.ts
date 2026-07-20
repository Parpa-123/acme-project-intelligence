import { useQuery } from '@tanstack/react-query';
import { fetcher } from './client';
import type { UserBasicInfo } from '../types';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => fetcher<UserBasicInfo>('/api/me'),
  });
}
