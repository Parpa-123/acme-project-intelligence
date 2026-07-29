import { useCurrentUser } from '../../api/user';
import { Button } from '../../components/ui/Button';

export function SettingsPage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) return <div className="animate-pulse text-gray-500">Loading settings...</div>;
  if (!user) return <div className="text-red-500">Error loading profile.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your personal profile and preferences.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Profile Information</h2>
        
        <div className="flex items-center gap-6 mb-8">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-20 h-20 rounded-full border border-gray-200 object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center text-white text-3xl font-medium shadow-sm">
              {user.email.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <Button variant="outline" size="sm" disabled>Change Avatar (Coming Soon)</Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input 
              type="text" 
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              value={user.full_name || ''}
              disabled
              title="Updating profile via UI is not implemented in the current scope."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input 
              type="email" 
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              value={user.email}
              disabled
            />
          </div>
          
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <Button disabled>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
