import { useState, useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useProjectDashboard } from '../../api/projects';
import { useCurrentUser } from '../../api/user';
import { Badge } from '../../components/ui/Badge';
import { FaUsers, FaEnvelope, FaCog, FaCalendar, FaBook, FaRobot } from 'react-icons/fa';
import { ProjectSettingsTab } from './tabs/ProjectSettingsTab';
import { ProjectMembersTab } from './tabs/ProjectMembersTab';
import { ProjectMeetingsTab } from './tabs/ProjectMeetingsTab';
import { ChatDrawer } from '../../features/ai-chat/ChatDrawer';
import { KnowledgeDrawer } from '../../features/knowledge/KnowledgeDrawer';
import { useSidebarStore } from '../../stores/useSidebarStore';
import { ProjectWorkspaceSkeleton } from '../../components/ui/Skeleton';
import { useChatStore } from '../../features/ai-chat/useChatStore';

export function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || '0', 10);
  
  const { data: dashboard, isLoading, error } = useProjectDashboard(projectId);
  const { data: currentUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'meetings' | 'archives' | 'settings'>('overview');
  const { isDrawerOpen: isCopilotOpen, setDrawerOpen: setIsCopilotOpen } = useChatStore();
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);
  const isSidebarOpen = useSidebarStore(state => state.isOpen);
  const setIsSidebarOpen = useSidebarStore(state => state.setIsOpen);
  const previousSidebarState = useRef(isSidebarOpen);

  useEffect(() => {
    // Only capture state when both are closed
    if (!isCopilotOpen && !isKnowledgeOpen) {
      previousSidebarState.current = isSidebarOpen;
    }
  }, [isCopilotOpen, isKnowledgeOpen, isSidebarOpen]);

  useEffect(() => {
    if (isCopilotOpen || isKnowledgeOpen) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(previousSidebarState.current);
    }
  }, [isCopilotOpen, isKnowledgeOpen, setIsSidebarOpen]);

  if (isNaN(projectId)) return <Navigate to="/projects" replace />;
  if (isLoading) return <ProjectWorkspaceSkeleton />;
  if (error || !dashboard) return <div className="text-red-400 text-glow-sm">Project not found or you don't have access.</div>;

  const { project, total_members, pending_invitations_count, current_user_role } = dashboard;
  
  // Determine current user's role in this project for UI permissions
  const userRole = current_user_role;
  const isOwner = userRole === 'owner';
  const isAdmin = isOwner || userRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight text-glow-md">{project.name}</h1>
            <Badge variant={project.visibility === 'public' ? 'secondary' : 'outline'}>{project.visibility}</Badge>
            {project.is_archived && <Badge variant="destructive" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Archived</Badge>}
            {project.is_global && <Badge variant="default" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">Global Knowledge</Badge>}
            {userRole && <Badge variant="default" className="capitalize">{userRole}</Badge>}
          </div>
          <p className="text-gray-400 text-sm max-w-2xl mt-2">{project.description || 'No description provided.'}</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsKnowledgeOpen(true)}
            className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 px-5 py-3 rounded-xl transition-all font-bold text-sm shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]"
          >
            <FaBook size={18} />
            Search
          </button>
          <button
            onClick={() => setIsCopilotOpen(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-xl transition-all font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:shadow-[0_0_30px_rgba(16,185,129,0.7)] animate-pulse hover:animate-none"
          >
            <FaRobot size={18} />
            AI Chat
          </button>
          <div className="flex items-center gap-6 text-sm bg-white/5 px-4 py-3 rounded-xl border border-white/10">
            <div className="flex flex-col items-center md:items-end">
              <span className="text-gray-400 font-medium flex items-center gap-1.5"><FaUsers className="text-indigo-400" /> Members</span>
              <span className="font-bold text-white text-glow-sm mt-1">{total_members}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center md:items-end">
              <span className="text-gray-400 font-medium flex items-center gap-1.5"><FaEnvelope className="text-emerald-400" /> Pending</span>
              <span className="font-bold text-white text-glow-sm mt-1">{pending_invitations_count}</span>
            </div>
          </div>
        </div>
      </div>

      {project.is_archived && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between text-yellow-200">
          <p className="text-sm">This project is currently archived. It is frozen and hidden from active views.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-white/10 overflow-x-auto no-scrollbar">
        <nav className="-mb-px flex space-x-8 min-w-max">
          {(['overview', 'members', 'meetings', 'settings'] as const).map((tab) => {
            // Hide settings tab if not admin
            if (tab === 'settings' && !isAdmin) return null;
            
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all capitalize flex items-center
                  ${activeTab === tab
                    ? 'border-indigo-400 text-white text-glow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20'
                  }
                `}
              >
                {tab === 'settings' && <FaCog className="mr-2" />}
                {tab === 'meetings' && <FaCalendar className="mr-2" />}
                {tab}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {activeTab === 'overview' && (
          <div className="glass-panel rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-white text-glow-sm mb-4">Workspace Activity</h2>
            <div className="text-sm text-gray-400">
              <p>Project created on {new Date(project.created_at).toLocaleDateString()}</p>
              <div className="mt-8 border border-dashed border-white/20 rounded-xl p-8 text-center bg-white/5 backdrop-blur-md">
                <p>Welcome to your project workspace.</p>
                <p className="text-xs text-gray-500 mt-2">More dashboard features coming soon.</p>
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

      <ChatDrawer 
        projectId={projectId} 
        isOpen={isCopilotOpen} 
        onClose={() => setIsCopilotOpen(false)} 
      />

      {/* Knowledge Drawer */}
      <KnowledgeDrawer 
        projectId={projectId} 
        isOpen={isKnowledgeOpen} 
        onClose={() => setIsKnowledgeOpen(false)} 
      />
    </div>
  );
}
