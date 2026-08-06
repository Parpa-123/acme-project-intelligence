import { Link, Outlet, useLocation } from 'react-router-dom';
import { signOut } from 'supertokens-auth-react/recipe/session';
import { FaProjectDiagram, FaHome, FaCog, FaSignOutAlt, FaGlobe } from 'react-icons/fa';
import { useCurrentUser } from '../api/user';
import { DropdownMenu, DropdownMenuItem } from '../components/ui/DropdownMenu';
import { useSidebarStore } from '../stores/useSidebarStore';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export function AppLayout() {
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const { isOpen, toggle } = useSidebarStore();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <FaHome className="w-5 h-5" /> },
    { name: 'Projects', href: '/projects', icon: <FaProjectDiagram className="w-5 h-5" /> },
    { name: 'Global Library', href: '/global-knowledge', icon: <FaGlobe className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans bg-transparent">
      
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col glass-panel z-30 transition-all duration-300 ease-in-out sticky top-0 h-screen ${isOpen ? 'w-20 lg:w-64 border-r border-white/10' : 'w-0 border-none'}`}>
        
        {/* Sidebar Content (hidden when collapsed) */}
        <div className={`flex flex-col h-full overflow-hidden transition-all duration-300 whitespace-nowrap ${isOpen ? 'w-20 lg:w-64 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
          <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/10 shrink-0">
          <span className="font-bold text-xl text-white tracking-tight text-glow-md hidden lg:block">Acme Co.</span>
          <span className="font-bold text-xl text-white tracking-tight text-glow-md lg:hidden">A</span>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center justify-center lg:justify-start px-3 py-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-white/10 text-white text-glow-sm shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
                title={item.name}
              >
                <span>{item.icon}</span>
                <span className="hidden lg:block ml-3 font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
          </nav>
        </div>

        {/* Toggle Button */}
        <button
          onClick={toggle}
          className="absolute top-5 right-0 translate-x-1/2 w-8 h-8 flex items-center justify-center bg-[#1A1A1A] border border-white/20 rounded-full text-gray-400 hover:text-white z-50 shadow-lg transition-all hover:bg-white/10 hover:border-white/40"
          title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isOpen ? <FaChevronLeft size={12} /> : <FaChevronRight size={12} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 min-h-screen">
        
        {/* Top Header */}
        <header className="sticky top-0 h-16 glass-panel border-b border-white/10 flex items-center justify-between px-4 md:px-8 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center md:hidden">
              <span className="font-bold text-lg text-white tracking-tight text-glow-sm">Acme Co.</span>
            </div>
          </div>
          <div className="hidden md:flex items-center text-sm text-gray-400">
            {/* Desktop breadcrumbs can go here */}
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            <DropdownMenu
              trigger={
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none ring-2 ring-white/10 rounded-full p-0.5">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                      {user?.email.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              }
            >
              <div className="px-4 py-3 border-b border-white/10 bg-[#1A1A1A]">
                <p className="text-sm font-medium text-white truncate text-glow-sm">{user?.full_name || 'User'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <div className="bg-[#1A1A1A] p-1">
                <DropdownMenuItem icon={<FaCog />} onClick={() => window.location.href = '/settings'}>
                  <span className="text-gray-200">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem icon={<FaSignOutAlt />} onClick={handleLogout} destructive>
                  <span className="text-red-400">Sign out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 pb-safe z-30">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
                  isActive ? 'text-white text-glow-sm' : 'text-gray-500'
                }`}
              >
                <span className={isActive ? 'scale-110 transition-transform' : ''}>{item.icon}</span>
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
