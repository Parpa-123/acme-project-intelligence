

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useUpdateProject, useDeleteProject } from '../../../api/projects';
import { Button } from '../../../components/ui/Button';
import { FormInput } from '../../../components/forms/FormInput';
import { Dialog } from '../../../components/ui/Dialog';
import { FaGlobe, FaArchive, FaTrash, FaUndo } from 'react-icons/fa';
import type { ProjectResponse } from '../../../types';

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  visibility: z.enum(['private', 'public']),
});

type UpdateProjectFormValues = z.infer<typeof updateProjectSchema>;

export function ProjectSettingsTab({ project }: { project: ProjectResponse }) {
  const navigate = useNavigate();
  const updateGeneral = useUpdateProject(project.id);
  const updateGlobal = useUpdateProject(project.id);
  const updateArchive = useUpdateProject(project.id);
  const deleteProject = useDeleteProject();

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);

  const methods = useForm<UpdateProjectFormValues>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: project.name,
      description: project.description || '',
      visibility: project.visibility,
    }
  });

  const onSubmit = (data: UpdateProjectFormValues) => {
    updateGeneral.mutate(data);
  };

  const handleToggleGlobal = () => {
    updateGlobal.mutate({
      is_global: !project.is_global
    }, {
      onSuccess: () => setIsGlobalModalOpen(false)
    });
  };

  const handleToggleArchive = () => {
    updateArchive.mutate({
      is_archived: !project.is_archived
    }, {
      onSuccess: () => setIsArchiveModalOpen(false)
    });
  };

  const handleDelete = () => {
    deleteProject.mutate(project.id, {
      onSuccess: () => navigate('/projects', { replace: true })
    });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* General Settings */}
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
              <Button type="submit" isLoading={updateGeneral.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </FormProvider>
      </div>

      {/* Global Knowledge Settings */}
      <div className="glass-panel rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-8 shadow-[0_0_20px_rgba(99,102,241,0.1)] relative overflow-hidden space-y-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-transparent opacity-50" />
        <div>
          <h2 className="text-xl font-bold text-indigo-300 text-glow-sm flex items-center gap-2 mb-2">
            <FaGlobe /> Company-Wide Global Knowledge
          </h2>
          <p className="text-sm text-indigo-300/70">
            Manage how this project's insights and transcripts are shared. When enabled, data from this project becomes accessible to all other projects in the company's AI Copilot.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 pt-2 border-t border-indigo-500/20">
          <Button
            type="button"
            variant="default"
            className={project.is_global ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30" : "bg-indigo-600 hover:bg-indigo-700 text-white"}
            onClick={() => setIsGlobalModalOpen(true)}
          >
            {project.is_global ? (
              <>
                <FaGlobe className="mr-2" /> Manage Global Access (Enabled)
              </>
            ) : (
              <>
                <FaGlobe className="mr-2" /> Enable Global Knowledge
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-panel rounded-2xl border border-red-500/20 bg-red-500/5 p-8 shadow-[0_0_20px_rgba(239,68,68,0.1)] relative overflow-hidden space-y-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-transparent opacity-50" />
        <div>
          <h2 className="text-xl font-bold text-red-400 text-glow-md mb-2">Danger Zone</h2>
          <p className="text-sm text-red-400/70">
            Manage project lifecycle actions such as archiving or permanent deletion.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 pt-2 border-t border-red-500/10">
          <Button
            type="button"
            variant="outline"
            className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
            onClick={() => setIsArchiveModalOpen(true)}
          >
            {project.is_archived ? (
              <>
                <FaUndo className="mr-2" /> Unarchive Project
              </>
            ) : (
              <>
                <FaArchive className="mr-2" /> Archive Project
              </>
            )}
          </Button>

          <Button 
            variant="destructive" 
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <FaTrash className="mr-2" /> Delete Project
          </Button>
        </div>
      </div>

      {/* Archive Modal */}
      <Dialog
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title={project.is_archived ? "Unarchive Project?" : "Archive Project?"}
        description={
          project.is_archived
            ? "This will restore the project to the active projects dashboard."
            : "This will move the project to the Archived Projects view and freeze active changes. Knowledge from this project remains preserved."
        }
      >
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setIsArchiveModalOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="default"
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
            onClick={handleToggleArchive}
            isLoading={updateArchive.isPending}
          >
            {project.is_archived ? "Yes, Unarchive" : "Yes, Archive Project"}
          </Button>
        </div>
      </Dialog>

      {/* Delete Modal */}
      <Dialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Project?"
        description="Are you absolutely sure? This action cannot be undone and will permanently delete all meeting spaces, transcripts, and chat history."
      >
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDelete}
            isLoading={deleteProject.isPending}
          >
            Permanently Delete
          </Button>
        </div>
      </Dialog>

      {/* Global Knowledge Modal */}
      <Dialog
        isOpen={isGlobalModalOpen}
        onClose={() => setIsGlobalModalOpen(false)}
        title={project.is_global ? "Disable Global Knowledge?" : "Enable Global Knowledge?"}
        description={
          project.is_global
            ? "This project's transcripts and insights will no longer be shared with the company Copilot."
            : "Are you sure? This will share all meeting transcripts and insights from this project across all other projects in the company's AI Copilot."
        }
      >
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setIsGlobalModalOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="default"
            className={project.is_global ? "bg-red-600 hover:bg-red-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}
            onClick={handleToggleGlobal}
            isLoading={updateGlobal.isPending}
          >
            {project.is_global ? "Disable" : "Yes, Make Global"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
