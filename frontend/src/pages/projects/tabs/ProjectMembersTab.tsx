import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetcher } from '../../../api/client';
import { 
  useUpdateMemberRole, 
  useRemoveMember, 
  useCreateInvitation, 
  useDeleteInvitation 
} from '../../../api/projects';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Dialog } from '../../../components/ui/Dialog';
import { FormInput } from '../../../components/forms/FormInput';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { FaUserShield, FaUserMinus, FaUserPlus, FaEllipsisV, FaTrash } from 'react-icons/fa';
import type { ProjectMemberResponse, InvitationResponse } from '../../../types';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export function ProjectMembersTab({ 
  projectId, 
  isAdmin, 
  isOwner, 
  currentUserId 
}: { 
  projectId: number; 
  isAdmin: boolean;
  isOwner: boolean;
  currentUserId?: number;
}) {
  // Fetch members and invitations individually for this tab (or use initial data from dashboard)
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['projectMembers', projectId],
    queryFn: () => fetcher<ProjectMemberResponse[]>(`/projects/${projectId}/members`),
  });

  const { data: invitations, isLoading: invLoading } = useQuery({
    queryKey: ['projectInvitations', projectId],
    queryFn: () => fetcher<InvitationResponse[]>(`/projects/${projectId}/invitations`),
    enabled: isAdmin, // Only admins can see invites usually
  });

  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  
  const updateRole = useUpdateMemberRole(projectId);
  const removeMember = useRemoveMember(projectId);
  const createInvite = useCreateInvitation(projectId);
  const deleteInvite = useDeleteInvitation(projectId);

  const inviteMethods = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' }
  });

  const onInvite = (data: { email: string }) => {
    createInvite.mutate(data.email, {
      onSuccess: () => {
        setInviteModalOpen(false);
        inviteMethods.reset();
      }
    });
  };

  const handleRoleChange = (userId: number, role: string) => {
    updateRole.mutate({ userId, role });
  };

  const isLoading = membersLoading || (isAdmin && invLoading);

  if (isLoading) return <div className="animate-pulse text-gray-500">Loading members...</div>;

  return (
    <div className="space-y-8">
      {/* Active Members */}
      <div className="glass-panel rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] overflow-hidden border border-white/10">
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-[#0A0A0A]">
          <h2 className="text-xl font-bold text-white text-glow-md">Active Members</h2>
          {isAdmin && (
            <Button size="sm" onClick={() => setInviteModalOpen(true)}>
              <FaUserPlus className="mr-2 h-3.5 w-3.5" /> Invite
            </Button>
          )}
        </div>
        <ul className="divide-y divide-white/10">
          {members?.map((member) => (
            <li key={member.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                {member.user?.avatar_url ? (
                  <img src={member.user.avatar_url} alt="" className="w-12 h-12 rounded-full bg-white/5 object-cover ring-1 ring-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] group-hover:ring-white/40 transition-all" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/5 text-white flex items-center justify-center font-bold text-lg ring-1 ring-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] group-hover:ring-white/40 transition-all">
                    {member.user?.email.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-white text-glow-sm">
                    {member.user?.full_name || (member.user?.email ? member.user.email.split('@')[0] : 'Unknown User')}
                    {member.user_id === currentUserId && <span className="ml-2 text-xs text-indigo-400 font-normal">(You)</span>}
                  </p>
                  <p className="text-xs text-gray-400">{member.user?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant={member.role === 'owner' ? 'default' : member.role === 'admin' ? 'secondary' : 'outline'} className="capitalize">
                  {member.role}
                </Badge>
                
                {/* Actions Menu */}
                {isOwner && member.user_id !== currentUserId && (
                  <DropdownMenu
                    trigger={
                      <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer">
                        <FaEllipsisV className="w-4 h-4" />
                      </button>
                    }
                  >
                    <DropdownMenuItem icon={<FaUserShield />} onClick={() => handleRoleChange(member.user_id, 'admin')}>Make Admin</DropdownMenuItem>
                    <DropdownMenuItem icon={<FaUserShield />} onClick={() => handleRoleChange(member.user_id, 'member')}>Make Member</DropdownMenuItem>
                    <DropdownMenuItem icon={<FaUserMinus />} destructive onClick={() => removeMember.mutate(member.user_id)}>Remove from project</DropdownMenuItem>
                  </DropdownMenu>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Pending Invitations */}
      {isAdmin && invitations && invitations.length > 0 && (
        <div className="glass-panel rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] overflow-hidden border border-white/10 mt-8">
          <div className="px-6 py-5 border-b border-white/10 bg-[#0A0A0A]">
            <h2 className="text-xl font-bold text-white text-glow-md">Pending Invitations</h2>
          </div>
          <ul className="divide-y divide-white/10">
            {invitations.map((inv) => (
              <li key={inv.id} className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white text-glow-sm">{inv.email}</p>
                  <p className="text-xs text-gray-400">Sent on {new Date(inv.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="warning">Pending</Badge>
                  <button 
                    onClick={() => deleteInvite.mutate(inv.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                    title="Revoke Invite"
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invite Modal */}
      <Dialog
        isOpen={isInviteModalOpen}
        onClose={() => !createInvite.isPending && setInviteModalOpen(false)}
        title="Invite Member"
        description="Send an email invitation to join this project."
      >
        <FormProvider {...inviteMethods}>
          <form onSubmit={inviteMethods.handleSubmit(onInvite)} className="space-y-4 mt-2">
            <FormInput name="email" label="Email Address" placeholder="colleague@example.com" type="email" />
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={createInvite.isPending}>Send Invite</Button>
            </div>
          </form>
        </FormProvider>
      </Dialog>
    </div>
  );
}
