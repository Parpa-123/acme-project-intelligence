import { useDashboard } from '../../api/projects';
import { Badge } from '../../components/ui/Badge';
import { Link } from 'react-router-dom';
import { FaProjectDiagram, FaEnvelopeOpenText } from 'react-icons/fa';
import { Skeleton } from '../../components/ui/Skeleton';

export function DashboardPage() {
  const { data: dashboard, isLoading, error } = useDashboard();

  if (isLoading) return (
    <div className="space-y-8 pb-12">
      <div>
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-4 w-96 mt-2 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-panel p-6 rounded-2xl h-32">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 w-12 mt-4 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32 rounded" />
          <div className="glass-panel rounded-2xl h-64" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-40 rounded" />
          <div className="glass-panel rounded-2xl h-64" />
        </div>
      </div>
    </div>
  );
  if (error || !dashboard) return <div className="text-red-400 text-glow-sm">Failed to load dashboard</div>;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight text-glow-md">Overview</h1>
        <p className="text-sm text-gray-400 mt-1">Welcome back. Here is what's happening across your projects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-1">
          <div className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <FaProjectDiagram className="text-indigo-400" /> Total Projects
          </div>
          <div className="mt-2 text-3xl font-bold text-white text-glow-md">{dashboard.total_projects}</div>
        </div>
        <div className="glass-panel p-6 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-1">
          <div className="text-sm font-medium text-gray-400">Owned by you</div>
          <div className="mt-2 text-3xl font-bold text-white text-glow-md">{dashboard.projects_owned}</div>
        </div>
        <div className="glass-panel p-6 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-1">
          <div className="text-sm font-medium text-gray-400">Joined</div>
          <div className="mt-2 text-3xl font-bold text-white text-glow-md">{dashboard.projects_joined}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white text-glow-sm">Recent Projects</h2>
          {dashboard.recent_projects.length === 0 ? (
            <div className="bg-white/5 border border-dashed border-white/20 rounded-2xl p-8 text-center backdrop-blur-md">
              <p className="text-sm text-gray-400">You don't have any projects yet.</p>
              <Link to="/projects" className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline mt-2 inline-block transition-colors">View Projects</Link>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl shadow-sm divide-y divide-white/10">
              {dashboard.recent_projects.map((project) => (
                <Link key={project.id} to={`/projects/${project.id}`} className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors group">
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">{project.name}</h3>
                    <p className="text-xs text-gray-400 truncate mt-1">{project.description || 'No description'}</p>
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
          <h2 className="text-lg font-bold text-white text-glow-sm">Pending Invitations</h2>
          {dashboard.pending_invitations.length === 0 ? (
            <div className="bg-white/5 border border-dashed border-white/20 rounded-2xl p-8 text-center flex flex-col items-center backdrop-blur-md">
               <FaEnvelopeOpenText className="text-gray-500 text-3xl mb-3" />
              <p className="text-sm text-gray-400">No pending invitations.</p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl shadow-sm divide-y divide-white/10">
              {dashboard.pending_invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-5">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Invitation for Project #{inv.project_id}</h3>
                    <p className="text-xs text-gray-400 mt-1">Expires: {new Date(inv.expires_at).toLocaleDateString()}</p>
                  </div>
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
