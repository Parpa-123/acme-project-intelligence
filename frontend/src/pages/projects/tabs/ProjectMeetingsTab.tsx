import { useState } from 'react';
import { useMeetingSpaces, useCreateMeetingSpace } from '../../../api/meetings';
import { Video, Plus, Loader2 } from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput } from '../../../components/forms/FormInput';
import { useNavigate } from 'react-router-dom';

const createSpaceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().optional(),
});

import type { MeetingSpaceListResponse } from '../../../types';

type CreateSpaceFormValues = z.infer<typeof createSpaceSchema>;

function SpaceCard({ space, handleJoin }: { space: MeetingSpaceListResponse, handleJoin: (id: string) => void }) {

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Video className="h-5 w-5 text-indigo-600" />
          </div>
          <h3 className="text-md font-semibold text-gray-900">{space.name}</h3>
        </div>
        {space.active_session && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
            Live
          </span>
        )}
      </div>
      
      {/* History moved to Knowledge Tab */}

      <div className="mt-auto pt-4">
        <button
          onClick={() => handleJoin(space.id)}
          className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Join Meeting
        </button>
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
          <h2 className="text-lg font-semibold text-gray-900">Meeting Spaces</h2>
          <p className="text-sm text-gray-500">Persistent video conferencing rooms for your team.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center space-x-2 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Space</span>
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-4">Create New Meeting Space</h3>
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
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || createSpace.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                >
                  {(isSubmitting || createSpace.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Space
                </button>
              </div>
            </form>
          </FormProvider>
        </div>
      )}

      {spaces?.length === 0 && !isCreating ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <Video className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No meeting spaces</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new persistent meeting room.</p>
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
