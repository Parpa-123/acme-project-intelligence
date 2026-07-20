import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useUpdateProject, useDeleteProject } from '../../../api/projects';
import { Button } from '../../../components/ui/Button';
import { FormInput } from '../../../components/forms/FormInput';
import type { ProjectResponse } from '../../../types';

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  visibility: z.enum(['private', 'public']),
});

type UpdateProjectFormValues = z.infer<typeof updateProjectSchema>;

export function ProjectSettingsTab({ project }: { project: ProjectResponse }) {
  const navigate = useNavigate();
  const updateProject = useUpdateProject(project.id);
  const deleteProject = useDeleteProject();

  const methods = useForm<UpdateProjectFormValues>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: project.name,
      description: project.description || '',
      visibility: project.visibility,
    }
  });

  const onSubmit = (data: UpdateProjectFormValues) => {
    updateProject.mutate(data);
  };

  const handleDelete = () => {
    if (window.confirm('Are you absolutely sure? This action cannot be undone.')) {
      deleteProject.mutate(project.id, {
        onSuccess: () => navigate('/projects', { replace: true })
      });
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">General Settings</h2>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-5">
            <FormInput name="name" label="Project Name" />
            <FormInput name="description" label="Description" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Visibility</label>
              <select 
                {...methods.register('visibility')}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="private">Private (Invite-only)</option>
                <option value="public">Public (Anyone can see)</option>
              </select>
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" isLoading={updateProject.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </FormProvider>
      </div>

      <div className="bg-red-50 rounded-xl border border-red-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
        <p className="text-sm text-red-700 mb-4">
          Once you delete a project, there is no going back. Please be certain.
        </p>
        <Button 
          variant="destructive" 
          onClick={handleDelete}
          isLoading={deleteProject.isPending}
        >
          Delete Project
        </Button>
      </div>
    </div>
  );
}
