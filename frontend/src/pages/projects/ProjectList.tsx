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
import { ProjectCardSkeleton } from '../../components/ui/Skeleton';
import toast from 'react-hot-toast';

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
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const { data: projects, isLoading } = useProjects(1, 20, statusFilter);
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
          toast.success('Project created successfully!');
        },
        onError: (err: any) => {
          toast.error(err.message || 'Failed to create project');
        }
      }
    );
  };

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-64 bg-white/10 rounded mt-2 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => <ProjectCardSkeleton key={i} />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight text-glow-md">Projects</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your team's workspaces and collaborations.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Status Filters */}
          <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex gap-1">
            {(['active', 'archived', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  statusFilter === s
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <Button onClick={() => setModalOpen(true)}>
            <FaPlus className="mr-2 h-3.5 w-3.5" /> New Project
          </Button>
        </div>
      </div>

      {!projects || !projects.items || projects.items.length === 0 ? (
        <div className="glass-panel border border-dashed border-white/20 rounded-2xl p-12 text-center flex flex-col items-center shadow-[0_0_20px_rgba(0,0,0,0.3)]">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 ring-1 ring-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <FaFolderOpen className="text-gray-400 text-2xl" />
          </div>
          <h3 className="text-lg font-bold text-white text-glow-sm">No projects found</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-sm">
            {statusFilter === 'archived' ? 'No archived projects found.' : 'Get started by creating a new project.'}
          </p>
          {statusFilter === 'active' && (
            <Button onClick={() => setModalOpen(true)} className="mt-6">
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.items.map(project => (
            <Link 
              key={project.id} 
              to={`/projects/${project.id}`}
              className="group glass-panel rounded-2xl p-6 shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all flex flex-col h-full hover:-translate-y-1 border border-white/10 hover:border-indigo-500/30 cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors text-glow-sm">{project.name}</h3>
                <div className="flex gap-1.5">
                  <Badge variant={project.visibility === 'public' ? 'secondary' : 'outline'}>{project.visibility}</Badge>
                  {project.is_archived && <Badge variant="destructive" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Archived</Badge>}
                  {project.is_global && <Badge variant="default" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">Global</Badge>}
                </div>
              </div>
              <p className="text-sm text-gray-400 line-clamp-2 flex-1 mt-1">{project.description || 'No description provided.'}</p>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
                <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                <span className="font-mono text-gray-600">#{project.id}</span>
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
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Visibility</label>
              <select 
                {...methods.register('visibility')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
              >
                <option value="private" className="bg-[#1A1A1A]">Private (Invite-only)</option>
                <option value="public" className="bg-[#1A1A1A]">Public (Anyone can see)</option>
              </select>
            </div>

            <div className="pt-4 border-t border-white/10 mt-6">
              <FormInput 
                name="invite_emails" 
                label="Initial Invites (Required)" 
                placeholder="alice@example.com, bob@example.com" 
              />
              <p className="text-xs text-gray-500 mt-2">Enter comma-separated emails. The backend requires at least one invite email on creation.</p>
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
