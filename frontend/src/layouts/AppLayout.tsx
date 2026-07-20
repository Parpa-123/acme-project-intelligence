import { Link, Outlet, useLocation } from 'react-router-dom';
import { signOut } from 'supertokens-auth-react/recipe/session';
import { FaProjectDiagram, FaHome, FaCog, FaSignOutAlt, FaBars } from 'react-icons/fa';
import { useUIStore } from '../store/uiStore';
import { useCurrentUser } from '../api/user';
import { DropdownMenu, DropdownMenuItem } from '../components/ui/DropdownMenu';

export function AppLayout() {
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const location = useLocation();
  const { data: user } = useCurrentUser();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <FaHome /> },
    { name: 'Projects', href: '/projects', icon: <FaProjectDiagram /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${
          isSidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
          {isSidebarOpen && <span className="font-semibold text-lg text-gray-900 tracking-tight">Acme Co.</span>}
          <button onClick={toggleSidebar} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md">
            <FaBars />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={!isSidebarOpen ? item.name : undefined}
              >
                <span className="text-gray-400 mr-3 text-base">{item.icon}</span>
                {isSidebarOpen && item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center text-sm text-gray-500">
            {/* Breadcrumbs can go here in the future */}
          </div>
          
          <div className="flex items-center gap-4">
            <DropdownMenu
              trigger={
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border border-gray-200 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                      {user?.email.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              }
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <DropdownMenuItem icon={<FaCog />} onClick={() => window.location.href = '/settings'}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem icon={<FaSignOutAlt />} onClick={handleLogout} destructive>
                Sign out
              </DropdownMenuItem>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
