import { useState } from 'react';
import { useMeetingSpaces, useCreateMeetingSpace } from '../../../api/meetings';
import { Video, Plus } from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput } from '../../../components/forms/FormInput';
import { Button } from '../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const createSpaceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().optional(),
});

import type { MeetingSpaceListResponse } from '../../../types';

type CreateSpaceFormValues = z.infer<typeof createSpaceSchema>;

function SpaceCard({ space, handleJoin }: { space: MeetingSpaceListResponse, handleJoin: (id: string) => void }) {

  return (
    <div className="glass-panel p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all flex flex-col h-full border border-white/10 hover:border-indigo-500/30 group cursor-pointer hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/20 rounded-xl ring-1 ring-indigo-500/30">
            <Video className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-md font-bold text-white text-glow-sm">{space.name}</h3>
        </div>
        {space.active_session && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
            Live
          </span>
        )}
      </div>
      
      {/* History moved to Knowledge Tab */}

      <div className="mt-auto pt-6">
        <Button
          onClick={() => handleJoin(space.id)}
          className="w-full"
        >
          Join Meeting
        </Button>
      </div>
    </div>
  );
}

export function ProjectMeetingsTab({ projectId }: { projectId: number }) {
  const { data: spaces, isLoading, error } = useMeetingSpaces(projectId);
  const createSpace = useCreateMeetingSpace(projectId);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const methods = useForm<CreateSpaceFormValues>({
    resolver: zodResolver(createSpaceSchema),
  });

  const { handleSubmit, formState: { isSubmitting }, reset } = methods;

  const onSubmit = (data: CreateSpaceFormValues) => {
    createSpace.mutate(data, {
      onSuccess: () => {
        setIsCreating(false);
        reset();
      },
    });
  };

  const handleJoin = (spaceId: string) => {
    navigate(`/projects/${projectId}/spaces/${spaceId}/join`);
  };

  if (isLoading) {
    return <div className="animate-pulse p-4">Loading meeting spaces...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Failed to load meeting spaces.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white text-glow-sm">Meeting Spaces</h2>
          <p className="text-sm text-gray-400 mt-1">Persistent video conferencing rooms for your team.</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          <span>New Space</span>
        </Button>
      </div>

      {isCreating && (
        <div className="glass-panel p-8 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] border border-white/10">
          <h3 className="text-xl font-bold text-white text-glow-md mb-6">Create New Meeting Space</h3>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormInput
                name="name"
                label="Space Name"
                placeholder="e.g. Daily Standup"
              />
              <FormInput
                name="description"
                label="Description (Optional)"
                placeholder="What is this space for?"
              />
              <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting || createSpace.isPending}
                >
                  Create Space
                </Button>
              </div>
            </form>
          </FormProvider>
        </div>
      )}

      {spaces?.length === 0 && !isCreating ? (
        <div className="text-center py-12 glass-panel rounded-2xl border border-dashed border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
          <div className="mx-auto h-16 w-16 bg-white/5 rounded-full flex items-center justify-center ring-1 ring-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] mb-4">
            <Video className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-white text-glow-md">No meeting spaces</h3>
          <p className="mt-2 text-sm text-gray-400">Get started by creating a new persistent meeting room.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces?.map((space) => (
            <SpaceCard key={space.id} space={space} handleJoin={handleJoin} />
          ))}
        </div>
      )}
    </div>
  );
}
