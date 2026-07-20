import { useDashboard } from '../../api/projects';
import { Badge } from '../../components/ui/Badge';
import { Link } from 'react-router-dom';
import { FaProjectDiagram, FaEnvelopeOpenText } from 'react-icons/fa';

export function DashboardPage() {
  const { data: dashboard, isLoading, error } = useDashboard();

  if (isLoading) return <div className="text-gray-500 animate-pulse">Loading dashboard...</div>;
  if (error || !dashboard) return <div className="text-red-500">Failed to load dashboard</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back. Here is what's happening across your projects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <FaProjectDiagram /> Total Projects
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{dashboard.total_projects}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Owned by you</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{dashboard.projects_owned}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Joined</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{dashboard.projects_joined}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
          {dashboard.recent_projects.length === 0 ? (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-500">You don't have any projects yet.</p>
              <Link to="/projects" className="text-sm text-blue-600 hover:underline mt-2 inline-block">View Projects</Link>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100">
              {dashboard.recent_projects.map((project) => (
                <Link key={project.id} to={`/projects/${project.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{project.name}</h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{project.description || 'No description'}</p>
                  </div>
                  <Badge variant={project.visibility === 'public' ? 'secondary' : 'outline'}>
                    {project.visibility}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pending Invitations */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Pending Invitations</h2>
          {dashboard.pending_invitations.length === 0 ? (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center flex flex-col items-center">
               <FaEnvelopeOpenText className="text-gray-400 text-3xl mb-3" />
              <p className="text-sm text-gray-500">No pending invitations.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100">
              {dashboard.pending_invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Invitation for Project #{inv.project_id}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Expires: {new Date(inv.expires_at).toLocaleDateString()}</p>
                  </div>
                  {/* Ideally, we'd have the token here, but the backend InvitationResponse 
                      doesn't expose the token. The user receives the token via email. 
                      So we just display the invitation status. */}
                  <Badge variant="warning">Pending</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
