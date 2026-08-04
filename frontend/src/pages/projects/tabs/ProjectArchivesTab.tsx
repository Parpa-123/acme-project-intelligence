import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaArchive, FaUndo, FaSearch, FaCircleNotch } from 'react-icons/fa';

import { fetcher } from '../../../api/client';

interface MeetingSpace {
  id: string;
  name: string;
  active_session: boolean;
}

interface ProjectArchivesTabProps {
  projectId: number;
  isAdmin: boolean;
  isOwner?: boolean;
}

export function ProjectArchivesTab({ projectId, isAdmin }: ProjectArchivesTabProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: archivedSpaces = [], isLoading } = useQuery({
    queryKey: ['meetingSpaces', projectId, 'archived'],
    queryFn: () => fetcher<MeetingSpace[]>(`/projects/${projectId}/meeting-spaces?status=archived`),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (spaceId: string) =>
      fetcher<{ status: string }>(`/meeting-spaces/${spaceId}/unarchive`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'meeting-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['meetingSpaces', projectId, 'archived'] });
    },
  });

  const filteredSpaces = archivedSpaces.filter(space => 
    space.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 shadow-sm border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 text-glow-sm">
              <FaArchive className="text-gray-400" /> Archived Spaces
            </h2>
            <p className="text-sm text-gray-400 mt-1">Read-only history of past meeting spaces.</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search archives..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8 text-indigo-400">
            <FaCircleNotch className="animate-spin text-2xl" />
          </div>
        ) : filteredSpaces.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-white/10 rounded-xl bg-white/5">
            <FaArchive className="mx-auto text-4xl text-gray-500 mb-3" />
            <h3 className="text-lg font-medium text-white mb-1">No archived spaces</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Spaces that are archived will appear here. They are hidden from the active meetings list but their knowledge is preserved.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSpaces.map((space) => (
              <div key={space.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors flex flex-col justify-between h-32">
                <div>
                  <h3 className="font-bold text-white text-lg truncate">{space.name}</h3>
                  <span className="inline-block mt-2 text-xs font-medium bg-gray-500/20 text-gray-300 px-2 py-1 rounded-md">
                    Archived
                  </span>
                </div>
                
                <div className="flex justify-end mt-4">
                  {isAdmin ? (
                    <button
                      onClick={() => unarchiveMutation.mutate(space.id)}
                      disabled={unarchiveMutation.isPending}
                      className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                    >
                      <FaUndo size={12} /> {unarchiveMutation.isPending ? 'Restoring...' : 'Restore Space'}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500" title="Only Admins can restore spaces">Read Only</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
