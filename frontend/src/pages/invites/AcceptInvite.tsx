import { useParams, useNavigate } from 'react-router-dom';
import { useInvitationDetails, useAcceptInvitation } from '../../api/projects';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FaUsers } from 'react-icons/fa';

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const { data: inv, isLoading, error } = useInvitationDetails(token || '');
  const acceptInvite = useAcceptInvitation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="animate-pulse text-gray-500">Loading invitation details...</div>
      </div>
    );
  }

  if (error || !inv) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid or Expired Invite</h2>
          <p className="text-gray-500 mb-6">This invitation link is no longer valid or you do not have permission.</p>
          <Button onClick={() => navigate('/dashboard')} className="w-full">Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  const handleAccept = () => {
    acceptInvite.mutate(token!, {
      onSuccess: (project) => {
        // Redirect to project workspace on success
        navigate(`/projects/${project.id}`, { replace: true });
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
            <FaUsers />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">You've been invited!</h1>
            <p className="text-gray-500 mt-2">
              <span className="font-medium text-gray-700">{inv.invited_by_user?.full_name || 'Someone'}</span> has invited you to join the project:
            </p>
          </div>

          <div className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-left">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">{inv.project.name}</h3>
              <Badge variant="outline">{inv.project.visibility}</Badge>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">{inv.project.description || 'No description'}</p>
          </div>

          <div className="w-full pt-4">
            <Button 
              className="w-full h-12 text-base" 
              onClick={handleAccept}
              isLoading={acceptInvite.isPending}
            >
              Accept Invitation
            </Button>
            <Button 
              variant="ghost" 
              className="w-full mt-2"
              onClick={() => navigate('/dashboard')}
              disabled={acceptInvite.isPending}
            >
              Decline & Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
