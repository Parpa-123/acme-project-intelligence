import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useProjectDashboard } from '../../api/projects';
import { useCurrentUser } from '../../api/user';
import { Badge } from '../../components/ui/Badge';
import { FaUsers, FaEnvelope, FaCog, FaCalendar } from 'react-icons/fa';
import { ProjectSettingsTab } from './tabs/ProjectSettingsTab';
import { ProjectMembersTab } from './tabs/ProjectMembersTab';
import { ProjectMeetingsTab } from './tabs/ProjectMeetingsTab';

export function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || '0', 10);
  
  const { data: dashboard, isLoading, error } = useProjectDashboard(projectId);
  const { data: currentUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'meetings' | 'settings'>('overview');

  if (isNaN(projectId)) return <Navigate to="/projects" replace />;
  if (isLoading) return <div className="animate-pulse text-gray-500">Loading workspace...</div>;
  if (error || !dashboard) return <div className="text-red-500">Project not found or you don't have access.</div>;

  const { project, total_members, pending_invitations_count, current_user_role } = dashboard;
  
  // Determine current user's role in this project for UI permissions
  const userRole = current_user_role;
  const isOwner = userRole === 'owner';
  const isAdmin = isOwner || userRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
            <Badge variant={project.visibility === 'public' ? 'secondary' : 'outline'}>{project.visibility}</Badge>
            {userRole && <Badge variant="default" className="capitalize">{userRole}</Badge>}
          </div>
          <p className="text-gray-500 text-sm max-w-2xl">{project.description || 'No description provided.'}</p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex flex-col items-end">
            <span className="text-gray-400 font-medium flex items-center gap-1.5"><FaUsers /> Members</span>
            <span className="font-semibold text-gray-900">{total_members}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-gray-400 font-medium flex items-center gap-1.5"><FaEnvelope /> Pending</span>
            <span className="font-semibold text-gray-900">{pending_invitations_count}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['overview', 'members', 'meetings', 'settings'] as const).map((tab) => {
            // Hide settings tab if not admin
            if (tab === 'settings' && !isAdmin) return null;
            
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors capitalize
                  ${activeTab === tab
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab === 'settings' && <FaCog className="inline mr-2 mb-0.5" />}
                {tab === 'meetings' && <FaCalendar className="inline mr-2 mb-0.5" />}
                {tab}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-2">
        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Workspace Activity</h2>
            <div className="text-sm text-gray-500">
              <p>Project created on {new Date(project.created_at).toLocaleDateString()}</p>
              <div className="mt-8 border border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                <p>Welcome to your project workspace.</p>
                <p className="text-xs text-gray-400 mt-2">More dashboard features coming soon.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <ProjectMembersTab 
            projectId={projectId} 
            isAdmin={isAdmin}
            isOwner={isOwner}
            currentUserId={currentUser?.id}
          />
        )}

        {activeTab === 'meetings' && (
          <ProjectMeetingsTab projectId={projectId} />
        )}

        {activeTab === 'settings' && isAdmin && (
          <ProjectSettingsTab project={project} />
        )}
      </div>
    </div>
  );
}
