import { useState } from 'react';
import { Search, Filter, FileText, AlertTriangle, MessageSquare, Presentation } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBrain, faList, faCheck } from '@fortawesome/free-solid-svg-icons';
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
import { EmptyState } from '../../components/ui/EmptyState';
import { useChatStore } from '../ai-chat/useChatStore';
import { FaThumbtack } from 'react-icons/fa';

interface KnowledgeExplorerProps {
  projectId: number;
}

const BrainWrapper = (props: any) => <FontAwesomeIcon icon={faBrain} {...props} />;
const ListWrapper = (props: any) => <FontAwesomeIcon icon={faList} {...props} />;
const CheckWrapper = (props: any) => <FontAwesomeIcon icon={faCheck} {...props} />;

const KNOWLEDGE_VIEWS = [
  { id: 'search', label: 'Semantic Search', icon: Search },
  { id: 'all', label: 'All Knowledge (Chunks)', icon: Presentation },
  { id: 'decisions', label: 'Decisions', icon: BrainWrapper },
  { id: 'action-items', label: 'Action Items', icon: CheckWrapper },
  { id: 'requirements', label: 'Requirements', icon: ListWrapper },
  { id: 'concerns', label: 'Concerns', icon: AlertTriangle },
  { id: 'topics', label: 'Topics', icon: MessageSquare },
  { id: 'summaries', label: 'Summaries', icon: FileText },
];

export function KnowledgeExplorer({ projectId }: KnowledgeExplorerProps) {
  const [activeView, setActiveView] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [executeSearch, setExecuteSearch] = useState(false);
  const { setDrawerOpen, setPendingDiscussionText } = useChatStore();

  const handleDiscuss = (text: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setPendingDiscussionText(text);
    setDrawerOpen(true);
  };

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
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => handleDiscuss(res.chunk.text, e)} className="text-emerald-400/70 hover:text-emerald-400 transition-colors" title="Discuss with AI">
                            <FaThumbtack />
                          </button>
                          <span className="text-xs text-gray-500">{res.meeting_title}</span>
                        </div>
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
              {chunksRes?.items.length === 0 ? (
                <EmptyState icon={Presentation} title="No Knowledge Chunks" description="No transcripts or knowledge chunks found in this project." />
              ) : (
                chunksRes?.items.map(chunk => (
                  <div key={chunk.id} className="glass-panel p-4 rounded-xl border border-white/10 transition-all hover:bg-white/5 relative group">
                    <p className="text-sm text-gray-300 pr-8">{chunk.text}</p>
                    <button onClick={(e) => handleDiscuss(chunk.text, e)} className="absolute top-4 right-4 text-emerald-400/50 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100" title="Discuss with AI">
                      <FaThumbtack />
                    </button>
                    <div className="mt-3 text-xs text-gray-500 flex justify-between">
                      <span>Meeting: {chunk.meeting_title || 'Unknown'}</span>
                      <span>{new Date(chunk.start_timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* DECISIONS VIEW */}
          {activeView === 'decisions' && (
            <div className="grid gap-4 md:grid-cols-2">
              {decisionsRes?.items.length === 0 ? (
                <EmptyState icon={BrainWrapper} title="No Decisions" description="AI hasn't extracted any decisions yet." className="col-span-full" />
              ) : (
                decisionsRes?.items.map(d => (
                  <div key={d.id} className="glass-panel p-5 rounded-xl border border-white/10 transition-all hover:-translate-y-1 hover:shadow-lg relative group">
                    <h3 className="font-bold text-white mb-2 pr-6">{d.decision}</h3>
                    <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">Conf: {d.confidence}</span>
                    <button onClick={(e) => handleDiscuss(`Decision: ${d.decision}`, e)} className="absolute top-4 right-4 text-emerald-400/50 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100" title="Discuss with AI">
                      <FaThumbtack />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ACTION ITEMS VIEW */}
          {activeView === 'action-items' && (
            <div className="grid gap-4 md:grid-cols-2">
              {actionItemsRes?.items.length === 0 ? (
                <EmptyState icon={CheckWrapper} title="No Action Items" description="AI hasn't extracted any action items yet." className="col-span-full" />
              ) : (
                actionItemsRes?.items.map(a => (
                  <div key={a.id} className="glass-panel p-5 rounded-xl border border-white/10 transition-all hover:-translate-y-1 hover:shadow-lg relative group">
                    <h3 className="font-bold text-white mb-2 pr-6">{a.description}</h3>
                    <div className="flex space-x-2 text-xs">
                      <span className="text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md">Assignee: {a.assignee || 'Unassigned'}</span>
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">Status: {a.status}</span>
                    </div>
                    <button onClick={(e) => handleDiscuss(`Action Item: ${a.description}`, e)} className="absolute top-4 right-4 text-emerald-400/50 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100" title="Discuss with AI">
                      <FaThumbtack />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* REQUIREMENTS VIEW */}
          {activeView === 'requirements' && (
            <div className="grid gap-4 md:grid-cols-2">
              {requirementsRes?.items.length === 0 ? (
                <EmptyState icon={ListWrapper} title="No Requirements" description="AI hasn't extracted any requirements yet." className="col-span-full" />
              ) : (
                requirementsRes?.items.map(r => (
                  <div key={r.id} className="glass-panel p-5 rounded-xl border border-white/10 transition-all hover:-translate-y-1 hover:shadow-lg relative group">
                    <h3 className="font-bold text-white mb-2 pr-6">{r.requirement}</h3>
                    <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md">Priority: {r.priority}</span>
                    <button onClick={(e) => handleDiscuss(`Requirement: ${r.requirement}`, e)} className="absolute top-4 right-4 text-emerald-400/50 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100" title="Discuss with AI">
                      <FaThumbtack />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* CONCERNS VIEW */}
          {activeView === 'concerns' && (
            <div className="grid gap-4 md:grid-cols-2">
              {concernsRes?.items.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="No Concerns" description="AI hasn't extracted any concerns yet." className="col-span-full" />
              ) : (
                concernsRes?.items.map(c => (
                  <div key={c.id} className="glass-panel p-5 rounded-xl border border-white/10 border-l-2 border-l-red-500 transition-all hover:-translate-y-1 hover:shadow-lg relative group">
                    <h3 className="font-bold text-white mb-2 pr-6">{c.concern}</h3>
                    <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-md">Severity: {c.severity}</span>
                    <button onClick={(e) => handleDiscuss(`Concern: ${c.concern}`, e)} className="absolute top-4 right-4 text-emerald-400/50 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100" title="Discuss with AI">
                      <FaThumbtack />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TOPICS VIEW */}
          {activeView === 'topics' && (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {topicsRes?.items.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No Topics" description="AI hasn't extracted any topics yet." className="col-span-full" />
              ) : (
                topicsRes?.items.map(t => (
                  <div key={t.id} className="glass-panel p-4 rounded-xl border border-white/10 flex items-center justify-between transition-all hover:bg-white/5 group">
                    <span className="font-bold text-white text-glow-sm">{t.topic}</span>
                    <button onClick={(e) => handleDiscuss(`Topic: ${t.topic}`, e)} className="text-emerald-400/50 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100" title="Discuss with AI">
                      <FaThumbtack />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SUMMARIES VIEW */}
          {activeView === 'summaries' && (
            <div className="space-y-6">
              {summariesRes?.items.length === 0 ? (
                <EmptyState icon={FileText} title="No Summaries" description="AI hasn't generated any summaries yet." />
              ) : (
                summariesRes?.items.map(s => (
                  <div key={s.id} className="glass-panel p-6 rounded-xl border border-white/10 transition-all hover:bg-white/5 relative group">
                    <div className="mb-4 text-xs text-gray-500">Meeting Summary</div>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap pr-6">{s.summary}</p>
                    <button onClick={(e) => handleDiscuss(`Summary: ${s.summary}`, e)} className="absolute top-6 right-6 text-emerald-400/50 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100" title="Discuss with AI">
                      <FaThumbtack />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
