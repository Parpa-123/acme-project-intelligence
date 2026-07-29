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
    <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden mb-4">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Folder className="h-5 w-5 text-indigo-400" />
          <span className="font-bold text-white text-glow-sm">{space.name}</span>
        </div>
        {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
      </button>

      {isExpanded && (
        <div className="p-5 border-t border-white/10">
          {isLoading ? (
            <div className="text-gray-400 text-sm animate-pulse p-2">Loading knowledge...</div>
          ) : !history || history.length === 0 ? (
            <div className="text-gray-500 text-sm p-2 italic">No meetings recorded in this space yet.</div>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedHistory || {}).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => (
                <div key={date} className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-400 flex items-center uppercase tracking-wider">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    {date}
                  </h4>
                  <div className="space-y-3 pl-6 border-l-2 border-white/10 ml-2">
                    {groupedHistory![date].map((m: MeetingHistoryResponse) => (
                      <div 
                        key={m.id}
                        onClick={() => navigate(`/projects/${projectId}/spaces/${space.id}/meetings/${m.id}/intelligence`)}
                        className="bg-white/5 border border-white/10 p-4 rounded-xl shadow-sm hover:shadow-lg hover:border-indigo-400/50 cursor-pointer transition-all group flex items-center justify-between hover:-translate-y-0.5"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 ring-1 ring-indigo-500/30">
                            <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white text-glow-sm group-hover:text-indigo-300">Meeting Session</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Started at {new Date(m.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors" />
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
          <h3 className="text-sm font-bold text-white text-glow-sm mb-4">
            Vector Search Results for "{searchMutation.variables?.query}"
          </h3>
          
          {searchMutation.isPending && (
            <div className="flex items-center justify-center p-12 text-indigo-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          
          {searchMutation.isError && (
            <div className="p-4 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
              An error occurred while searching knowledge base.
            </div>
          )}
          
          {searchMutation.isSuccess && searchMutation.data.results.length === 0 && (
            <div className="p-8 text-center text-gray-400 bg-white/5 rounded-xl border border-dashed border-white/20">
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
                    className="glass-panel border border-white/10 rounded-xl p-5 hover:border-indigo-400/50 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => {
                      if (spaceId) {
                        navigate(`/projects/${projectId}/spaces/${spaceId}/meetings/${candidate.meeting_id}/intelligence`);
                      } else {
                        alert("Could not determine space for this meeting to navigate.");
                      }
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30">
                          {Math.round(candidate.score * 100)}% Match
                        </span>
                        <span className="text-xs text-gray-400 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {candidate.metadata?.start_timestamp ? new Date(candidate.metadata.start_timestamp).toLocaleDateString() : 'Unknown Date'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </div>
                    <p className="text-gray-300 text-sm italic border-l-4 border-indigo-500/50 pl-4 py-2 bg-indigo-500/5 rounded-r-md">
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
          <h3 className="text-sm font-bold text-white text-glow-sm">
            LLM Context Builder Preview for "{retrieveMutation.variables?.query}"
          </h3>
          
          {retrieveMutation.isPending && (
            <div className="flex items-center justify-center p-12 text-indigo-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-3 text-sm font-bold">Assembling Context...</span>
            </div>
          )}
          
          {retrieveMutation.isError && (
            <div className="p-4 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
              An error occurred while assembling context.
            </div>
          )}

          {retrieveMutation.isSuccess && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Token Budget Indicator */}
              <div className="glass-panel border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-white text-glow-sm">Token Budget</span>
                  <span className="text-sm text-gray-400 font-mono">
                    {retrieveMutation.data.total_tokens.toLocaleString()} / {retrieveMutation.data.metadata.max_tokens_budget?.toLocaleString() || '6,000'}
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3 shadow-inner">
                  <div 
                    className={`h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)] ${retrieveMutation.data.total_tokens > 5000 ? 'bg-amber-500' : 'bg-indigo-500'}`} 
                    style={{ width: `${Math.min(100, (retrieveMutation.data.total_tokens / (retrieveMutation.data.metadata.max_tokens_budget || 6000)) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Citations / Sources */}
              <div className="glass-panel border border-white/10 rounded-2xl p-6">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Context Sources (Deduplicated)</h4>
                <div className="flex flex-wrap gap-3">
                  {retrieveMutation.data.sources.map((source, i) => (
                    <div key={`${source.chunk_id}-${i}`} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-gray-300 shadow-sm">
                      <FileText className="w-3 h-3 mr-2 text-indigo-400" />
                      Chunk {source.sequence_number}
                      <span className="ml-2 text-indigo-400 font-mono">{(source.rerank_score * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                  {retrieveMutation.data.sources.length === 0 && (
                    <span className="text-sm text-gray-500 italic">No highly relevant sources found.</span>
                  )}
                </div>
              </div>

              {/* Context Block Preview */}
              <div className="bg-[#0A0A0A] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
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
    <div className="max-w-5xl space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-xl font-bold text-white text-glow-sm">Project Knowledge</h2>
        
        <form onSubmit={handleSearch} className="w-full sm:w-96 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-11 py-3 border border-white/10 rounded-full leading-5 bg-[#0A0A0A] placeholder-gray-500 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 sm:text-sm transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] inset-shadow"
            placeholder="Search decisions, action items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>
      
      {/* Search Mode Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex glass-panel rounded-full p-1 border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.3)]">
          <button
            onClick={() => { setSearchMode('search'); setIsSearching(false); }}
            className={`flex items-center px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
              searchMode === 'search' 
                ? 'bg-white/10 text-white text-glow-sm ring-1 ring-white/20' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <Database className="w-4 h-4 mr-2" />
            Vector Search
          </button>
          <button
            onClick={() => { setSearchMode('retrieve'); setIsSearching(false); }}
            className={`flex items-center px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
              searchMode === 'retrieve' 
                ? 'bg-indigo-500/20 text-indigo-300 text-glow-sm ring-1 ring-indigo-500/30' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <Zap className={`w-4 h-4 mr-2 ${searchMode === 'retrieve' ? 'text-indigo-400' : ''}`} />
            Deep Retrieval
          </button>
        </div>
      </div>

      {isSearching ? (
        renderSearchResults()
      ) : (
        <>
          {!spaces || spaces.length === 0 ? (
            <div className="text-center p-12 glass-panel border border-dashed border-white/20 rounded-2xl text-gray-400">
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
