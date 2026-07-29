import { useState } from 'react';
import { useMeetingSpaces, useMeetingHistory } from '../../../api/meetings';
import { Folder, ChevronRight, ChevronDown, Calendar, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MeetingSpaceListResponse, MeetingHistoryResponse } from '../../../types';

function SpaceKnowledge({ space, projectId }: { space: MeetingSpaceListResponse, projectId: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: history, isLoading } = useMeetingHistory(isExpanded ? space.id : undefined);
  const navigate = useNavigate();

  // Group history by date
  const groupedHistory = history?.reduce((acc: Record<string, MeetingHistoryResponse[]>, meeting: MeetingHistoryResponse) => {
    const date = new Date(meeting.started_at).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(meeting);
    return acc;
  }, {} as Record<string, MeetingHistoryResponse[]>);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Folder className="h-5 w-5 text-indigo-500" />
          <span className="font-semibold text-gray-900">{space.name}</span>
        </div>
        {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-gray-200">
          {isLoading ? (
            <div className="text-gray-500 text-sm animate-pulse p-2">Loading knowledge...</div>
          ) : !history || history.length === 0 ? (
            <div className="text-gray-500 text-sm p-2 italic">No meetings recorded in this space yet.</div>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedHistory || {}).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => (
                <div key={date} className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-600 flex items-center uppercase tracking-wider">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    {date}
                  </h4>
                  <div className="space-y-2 pl-6 border-l-2 border-gray-100 ml-2">
                    {groupedHistory![date].map((m: MeetingHistoryResponse) => (
                      <div 
                        key={m.id}
                        onClick={() => navigate(`/projects/${projectId}/spaces/${space.id}/meetings/${m.id}/intelligence`)}
                        className="bg-white border border-gray-100 p-3 rounded-md shadow-sm hover:shadow hover:border-indigo-200 cursor-pointer transition-all group flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 bg-indigo-50 rounded text-indigo-600">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">Meeting Session</p>
                            <p className="text-xs text-gray-500">
                              Started at {new Date(m.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectKnowledgeTab({ projectId }: { projectId: number }) {
  const { data: spaces, isLoading } = useMeetingSpaces(projectId);

  if (isLoading) return <div className="p-4 animate-pulse text-gray-500">Loading spaces...</div>;

  return (
    <div className="max-w-4xl space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Project Knowledge</h2>
      
      {!spaces || spaces.length === 0 ? (
        <div className="text-center p-8 bg-white border border-dashed border-gray-300 rounded-lg text-gray-500">
          No meeting spaces created yet. Create a space in the Meetings tab first.
        </div>
      ) : (
        <div className="space-y-4">
          {spaces.map((space: MeetingSpaceListResponse) => (
            <SpaceKnowledge key={space.id} space={space} projectId={projectId} />
          ))}
        </div>
      )}
    </div>
  );
}
