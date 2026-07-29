import { useState } from 'react';
import { useMeetingSpaces, useMeetingHistory } from '../../../api/meetings';
import { useProjectSearch, useProjectRetrieve } from '../../../api/retrieval';
import { Folder, ChevronRight, ChevronDown, Calendar, FileText, Search, X, Loader2, Database, Zap } from 'lucide-react';
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
  const { data: spaces, isLoading: isLoadingSpaces } = useMeetingSpaces(projectId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'search' | 'retrieve'>('search');
  
  const searchMutation = useProjectSearch(projectId);
  const retrieveMutation = useProjectRetrieve(projectId);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    if (searchMode === 'search') {
      searchMutation.mutate({ query: searchQuery });
    } else {
      retrieveMutation.mutate({ query: searchQuery });
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    searchMutation.reset();
    retrieveMutation.reset();
  };

  if (isLoadingSpaces) return <div className="p-4 animate-pulse text-gray-500">Loading spaces...</div>;

  const renderSearchResults = () => {
    if (searchMode === 'search') {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            Vector Search Results for "{searchMutation.variables?.query}"
          </h3>
          
          {searchMutation.isPending && (
            <div className="flex items-center justify-center p-12 text-indigo-600">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          
          {searchMutation.isError && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
              An error occurred while searching knowledge base.
            </div>
          )}
          
          {searchMutation.isSuccess && searchMutation.data.results.length === 0 && (
            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              No relevant knowledge chunks found for this query.
            </div>
          )}
          
          {searchMutation.isSuccess && searchMutation.data.results.length > 0 && (
            <div className="space-y-4">
              {searchMutation.data.results.map((candidate, idx) => {
                const spaceId = candidate.metadata?.space_id;
                return (
                  <div 
                    key={candidate.chunk_id + idx}
                    className="bg-white border border-gray-200 rounded-lg p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => {
                      if (spaceId) {
                        navigate(`/projects/${projectId}/spaces/${spaceId}/meetings/${candidate.meeting_id}/intelligence`);
                      } else {
                        alert("Could not determine space for this meeting to navigate.");
                      }
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {Math.round(candidate.score * 100)}% Match
                        </span>
                        <span className="text-xs text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {candidate.metadata?.start_timestamp ? new Date(candidate.metadata.start_timestamp).toLocaleDateString() : 'Unknown Date'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-gray-700 text-sm italic border-l-4 border-indigo-200 pl-3 py-1 bg-indigo-50/30 rounded-r-sm">
                      "{candidate.text}"
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    } else {
      // Deep Retrieval View
      return (
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-gray-700">
            LLM Context Builder Preview for "{retrieveMutation.variables?.query}"
          </h3>
          
          {retrieveMutation.isPending && (
            <div className="flex items-center justify-center p-12 text-indigo-600">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-3 text-sm font-medium">Assembling Context...</span>
            </div>
          )}
          
          {retrieveMutation.isError && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
              An error occurred while assembling context.
            </div>
          )}

          {retrieveMutation.isSuccess && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Token Budget Indicator */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Token Budget</span>
                  <span className="text-sm text-gray-500 font-mono">
                    {retrieveMutation.data.total_tokens.toLocaleString()} / {retrieveMutation.data.metadata.max_tokens_budget?.toLocaleString() || '6,000'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${retrieveMutation.data.total_tokens > 5000 ? 'bg-amber-500' : 'bg-indigo-600'}`} 
                    style={{ width: `${Math.min(100, (retrieveMutation.data.total_tokens / (retrieveMutation.data.metadata.max_tokens_budget || 6000)) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Citations / Sources */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Context Sources (Deduplicated)</h4>
                <div className="flex flex-wrap gap-2">
                  {retrieveMutation.data.sources.map((source, i) => (
                    <div key={`${source.chunk_id}-${i}`} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 border border-gray-200 text-gray-600">
                      <FileText className="w-3 h-3 mr-1.5 text-gray-400" />
                      Chunk {source.sequence_number}
                      <span className="ml-2 text-indigo-500 font-mono">{(source.rerank_score * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                  {retrieveMutation.data.sources.length === 0 && (
                    <span className="text-sm text-gray-400 italic">No highly relevant sources found.</span>
                  )}
                </div>
              </div>

              {/* Context Block Preview */}
              <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 shadow-lg">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                  </div>
                  <span className="text-xs font-mono text-gray-400">assembled_context.txt</span>
                </div>
                <div className="p-4 overflow-auto max-h-[500px]">
                  <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {retrieveMutation.data.context_text || "// Context string is empty."}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-lg font-semibold text-gray-900">Project Knowledge</h2>
        
        <form onSubmit={handleSearch} className="w-full sm:w-96 relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
            placeholder="Search decisions, action items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>
      
      {/* Search Mode Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => { setSearchMode('search'); setIsSearching(false); }}
            className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              searchMode === 'search' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database className="w-4 h-4 mr-2" />
            Vector Search
          </button>
          <button
            onClick={() => { setSearchMode('retrieve'); setIsSearching(false); }}
            className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              searchMode === 'retrieve' 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Zap className={`w-4 h-4 mr-2 ${searchMode === 'retrieve' ? 'text-indigo-600' : ''}`} />
            Deep Retrieval
          </button>
        </div>
      </div>

      {isSearching ? (
        renderSearchResults()
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
