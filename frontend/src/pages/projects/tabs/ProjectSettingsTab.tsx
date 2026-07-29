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
      <div className="glass-panel rounded-2xl border border-white/10 p-8 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
        <h2 className="text-xl font-bold text-white text-glow-md mb-6">General Settings</h2>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-5">
            <FormInput name="name" label="Project Name" />
            <FormInput name="description" label="Description" />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Visibility</label>
              <select 
                {...methods.register('visibility')}
                className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 transition-all shadow-inner cursor-pointer"
              >
                <option value="private" className="bg-[#1A1A1A]">Private (Invite-only)</option>
                <option value="public" className="bg-[#1A1A1A]">Public (Anyone can see)</option>
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

      <div className="glass-panel rounded-2xl border border-red-500/20 bg-red-500/5 p-8 shadow-[0_0_20px_rgba(239,68,68,0.1)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-transparent opacity-50" />
        <h2 className="text-xl font-bold text-red-400 text-glow-md mb-3">Danger Zone</h2>
        <p className="text-sm text-red-400/70 mb-6">
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
