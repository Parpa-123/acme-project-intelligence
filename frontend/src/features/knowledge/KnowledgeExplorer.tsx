import { useState } from 'react';
import { Search, Filter, Briefcase, FileText, CheckSquare, Target, AlertTriangle, MessageSquare, Presentation } from 'lucide-react';
import { 
  useKnowledgeChunks, 
  useKnowledgeArtifacts, 
  useKnowledgeSearch
} from '../../api/knowledgeApi';
import type {
  Decision, 
  ActionItem, 
  Requirement, 
  Concern, 
  Topic, 
  Summary,
} from '../../api/knowledgeApi';

interface KnowledgeExplorerProps {
  projectId: number;
}

const KNOWLEDGE_VIEWS = [
  { id: 'search', label: 'Semantic Search', icon: Search },
  { id: 'all', label: 'All Knowledge (Chunks)', icon: Presentation },
  { id: 'decisions', label: 'Decisions', icon: Briefcase },
  { id: 'action-items', label: 'Action Items', icon: CheckSquare },
  { id: 'requirements', label: 'Requirements', icon: Target },
  { id: 'concerns', label: 'Concerns', icon: AlertTriangle },
  { id: 'topics', label: 'Topics', icon: MessageSquare },
  { id: 'summaries', label: 'Summaries', icon: FileText },
];

export function KnowledgeExplorer({ projectId }: KnowledgeExplorerProps) {
  const [activeView, setActiveView] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [executeSearch, setExecuteSearch] = useState(false);

  // Queries
  const { data: chunksRes } = useKnowledgeChunks(projectId, undefined, 1);
  const { data: decisionsRes } = useKnowledgeArtifacts<Decision>(projectId, 'decisions', undefined, 1);
  const { data: actionItemsRes } = useKnowledgeArtifacts<ActionItem>(projectId, 'action-items', undefined, 1);
  const { data: requirementsRes } = useKnowledgeArtifacts<Requirement>(projectId, 'requirements', undefined, 1);
  const { data: concernsRes } = useKnowledgeArtifacts<Concern>(projectId, 'concerns', undefined, 1);
  const { data: topicsRes } = useKnowledgeArtifacts<Topic>(projectId, 'topics', undefined, 1);
  const { data: summariesRes } = useKnowledgeArtifacts<Summary>(projectId, 'summaries', undefined, 1);
  const { data: searchResults, isLoading: searchLoading } = useKnowledgeSearch(projectId, searchQuery, undefined, executeSearch);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) setExecuteSearch(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setExecuteSearch(false);
  };

  return (
    <div className="flex h-full bg-transparent border border-white/10 rounded-2xl overflow-hidden glass-panel">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl p-4 flex flex-col">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Views</h2>
        <nav className="flex flex-col space-y-1 flex-1">
          {KNOWLEDGE_VIEWS.map((view) => (
            <button
              key={view.id}
              onClick={() => { setActiveView(view.id); if(view.id !== 'search') clearSearch(); }}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeView === view.id 
                  ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <view.icon className="w-4 h-4" />
              <span>{view.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-transparent overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b border-white/10 flex items-center px-6 justify-between bg-black/20">
          <h2 className="text-lg font-bold text-white text-glow-sm">
            {KNOWLEDGE_VIEWS.find(v => v.id === activeView)?.label}
          </h2>
          <div className="flex items-center space-x-3">
            <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Scroll */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          
          {/* SEARCH VIEW */}
          {activeView === 'search' && (
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSearch} className="relative mb-8">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setExecuteSearch(false); }}
                  placeholder="Ask a question or search for concepts across the project..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </form>

              {searchLoading && <div className="text-center py-10 text-indigo-400 animate-pulse">Searching knowledge base...</div>}
              
              {!searchLoading && executeSearch && searchResults && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-400 mb-4">{searchResults.length} Results Found</h3>
                  {searchResults.map((res, i) => (
                    <div key={i} className="glass-panel p-5 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">
                          Score: {(res.score * 100).toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-500">{res.meeting_title}</span>
                      </div>
                      <p className="text-gray-300 text-sm mt-3 group-hover:text-white transition-colors">{res.chunk.text}</p>
                    </div>
                  ))}
                  {searchResults.length === 0 && (
                    <div className="text-center py-10 text-gray-500">No highly relevant results found. Try rephrasing your search.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CHUNKS VIEW */}
          {activeView === 'all' && (
            <div className="grid gap-4">
              {chunksRes?.items.map(chunk => (
                <div key={chunk.id} className="glass-panel p-4 rounded-xl border border-white/10">
                  <p className="text-sm text-gray-300">{chunk.text}</p>
                  <div className="mt-3 text-xs text-gray-500 flex justify-between">
                    <span>Meeting: {chunk.meeting_title || 'Unknown'}</span>
                    <span>{new Date(chunk.start_timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DECISIONS VIEW */}
          {activeView === 'decisions' && (
            <div className="grid gap-4 md:grid-cols-2">
              {decisionsRes?.items.map(d => (
                <div key={d.id} className="glass-panel p-5 rounded-xl border border-white/10">
                  <h3 className="font-bold text-white mb-2">{d.decision}</h3>
                  <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">Conf: {d.confidence}</span>
                </div>
              ))}
            </div>
          )}

          {/* ACTION ITEMS VIEW */}
          {activeView === 'action-items' && (
            <div className="grid gap-4 md:grid-cols-2">
              {actionItemsRes?.items.map(a => (
                <div key={a.id} className="glass-panel p-5 rounded-xl border border-white/10">
                  <h3 className="font-bold text-white mb-2">{a.description}</h3>
                  <div className="flex space-x-2 text-xs">
                    <span className="text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md">Assignee: {a.assignee || 'Unassigned'}</span>
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">Status: {a.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* REQUIREMENTS VIEW */}
          {activeView === 'requirements' && (
            <div className="grid gap-4 md:grid-cols-2">
              {requirementsRes?.items.map(r => (
                <div key={r.id} className="glass-panel p-5 rounded-xl border border-white/10">
                  <h3 className="font-bold text-white mb-2">{r.requirement}</h3>
                  <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md">Priority: {r.priority}</span>
                </div>
              ))}
            </div>
          )}

          {/* CONCERNS VIEW */}
          {activeView === 'concerns' && (
            <div className="grid gap-4 md:grid-cols-2">
              {concernsRes?.items.map(c => (
                <div key={c.id} className="glass-panel p-5 rounded-xl border border-white/10 border-l-2 border-l-red-500">
                  <h3 className="font-bold text-white mb-2">{c.concern}</h3>
                  <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-md">Severity: {c.severity}</span>
                </div>
              ))}
            </div>
          )}

          {/* TOPICS VIEW */}
          {activeView === 'topics' && (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {topicsRes?.items.map(t => (
                <div key={t.id} className="glass-panel p-4 rounded-xl border border-white/10 flex items-center justify-center text-center">
                  <span className="font-bold text-white text-glow-sm">{t.topic}</span>
                </div>
              ))}
            </div>
          )}

          {/* SUMMARIES VIEW */}
          {activeView === 'summaries' && (
            <div className="space-y-6">
              {summariesRes?.items.map(s => (
                <div key={s.id} className="glass-panel p-6 rounded-xl border border-white/10">
                  <div className="mb-4 text-xs text-gray-500">Meeting Summary</div>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{s.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
