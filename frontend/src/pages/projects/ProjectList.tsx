import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProjects, useCreateProject } from '../../api/projects';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { FormInput } from '../../components/forms/FormInput';
import { FaPlus, FaFolderOpen } from 'react-icons/fa';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  visibility: z.enum(['private', 'public']),
  invite_emails: z.string().min(1, 'At least one email is required to create a project')
    .refine((val) => {
      const emails = val.split(',').map(e => e.trim()).filter(Boolean);
      if (emails.length === 0) return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emails.every(e => emailRegex.test(e));
    }, { message: 'Must be a valid comma-separated list of emails' }),
});

type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

export function ProjectList() {
  const { data: projects, isLoading } = useProjects();
  const [isModalOpen, setModalOpen] = useState(false);
  const createProject = useCreateProject();

  const methods = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      visibility: 'private',
    }
  });

  const onSubmit = (data: CreateProjectFormValues) => {
    // Process comma separated emails
    const emails = data.invite_emails.split(',').map(e => e.trim()).filter(Boolean);
    
    createProject.mutate(
      { ...data, invite_emails: emails },
      {
        onSuccess: () => {
          setModalOpen(false);
          methods.reset();
        }
      }
    );
  };

  if (isLoading) return <div className="animate-pulse text-gray-500">Loading projects...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your team's workspaces and collaborations.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <FaPlus className="mr-2 h-3.5 w-3.5" /> New Project
        </Button>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <FaFolderOpen className="text-gray-400 text-2xl" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No projects found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">Get started by creating a new project. You can invite your team members right away.</p>
          <Button onClick={() => setModalOpen(true)} className="mt-6">
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Link 
              key={project.id} 
              to={`/projects/${project.id}`}
              className="group bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                <Badge variant={project.visibility === 'public' ? 'secondary' : 'outline'}>{project.visibility}</Badge>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 flex-1">{project.description || 'No description provided.'}</p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                {/* ID could be useful for debugging or referencing */}
                <span className="font-mono">#{project.id}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => !createProject.isPending && setModalOpen(false)}
        title="Create a New Project"
        description="Set up a workspace and invite your team."
      >
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
            <FormInput 
              name="name" 
              label="Project Name" 
              placeholder="e.g. Acme Marketing Redesign" 
            />
            
            <FormInput 
              name="description" 
              label="Description (Optional)" 
              placeholder="Brief overview of the project..." 
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Visibility</label>
              <select 
                {...methods.register('visibility')}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="private">Private (Invite-only)</option>
                <option value="public">Public (Anyone can see)</option>
              </select>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <FormInput 
                name="invite_emails" 
                label="Initial Invites (Required)" 
                placeholder="alice@example.com, bob@example.com" 
              />
              <p className="text-xs text-gray-500 mt-1">Enter comma-separated emails. The backend requires at least one invite email on creation.</p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setModalOpen(false)}
                disabled={createProject.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={createProject.isPending}>
                Create Project
              </Button>
            </div>
          </form>
        </FormProvider>
      </Dialog>
    </div>
  );
}
