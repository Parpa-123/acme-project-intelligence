import { useCurrentUser } from '../../api/user';
import { Button } from '../../components/ui/Button';

export function SettingsPage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) return <div className="animate-pulse text-gray-400 text-glow-sm">Loading settings...</div>;
  if (!user) return <div className="text-red-400 text-glow-sm">Error loading profile.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight text-glow-md">Account Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your personal profile and preferences.</p>
      </div>

      <div className="glass-panel rounded-3xl border border-white/10 p-10 shadow-[0_0_30px_rgba(0,0,0,0.4)] max-w-2xl relative overflow-hidden">
        {/* Glow behind the card */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        <h2 className="text-xl font-bold text-white text-glow-md mb-8 relative z-10">Profile Information</h2>
        
        <div className="flex items-center gap-6 mb-8">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-24 h-24 rounded-full border border-white/20 object-cover shadow-lg" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-white text-3xl font-bold shadow-[0_0_15px_rgba(255,255,255,0.1)] ring-1 ring-white/20">
              {user.email.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <Button variant="outline" size="sm" disabled>Change Avatar (Coming Soon)</Button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="relative z-10">
            <label className="block text-sm font-bold text-gray-300 mb-2">Full Name</label>
            <input 
              type="text" 
              className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm text-gray-400 cursor-not-allowed shadow-[0_0_15px_rgba(0,0,0,0.5)] inset-shadow focus:outline-none focus:border-white/20 transition-all"
              value={user.full_name || ''}
              disabled
              title="Updating profile via UI is not implemented in the current scope."
            />
          </div>
          <div className="relative z-10">
            <label className="block text-sm font-bold text-gray-300 mb-2">Email Address</label>
            <input 
              type="email" 
              className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm text-gray-400 cursor-not-allowed shadow-[0_0_15px_rgba(0,0,0,0.5)] inset-shadow focus:outline-none focus:border-white/20 transition-all"
              value={user.email}
              disabled
            />
          </div>
          
          <div className="pt-8 mt-8 border-t border-white/10 flex justify-end relative z-10">
            <Button disabled>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
