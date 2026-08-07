import React, { useState } from 'react';
import { 
  useGlobalDecisions, 
  useGlobalRequirements, 
  useGlobalActionItems, 
  useGlobalSearch
} from '../../api/global';
import type { GlobalCitation, GlobalDecision, GlobalRequirement, GlobalActionItem, GlobalSearchResult } from '../../api/global';
import { FaFolder, FaMicrophone, FaSearch, FaBrain, FaClipboardList, FaCheckSquare } from 'react-icons/fa';
import { GlobalChatWidget } from '../../features/global-chat/GlobalChatWidget';

function CitationBadge({ citation }: { citation: GlobalCitation }) {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-400 mt-4 p-2 bg-black/20 rounded-lg border border-white/5 w-fit">
      <div className="flex items-center gap-1.5">
        <FaFolder className="text-indigo-400" />
        <span className="font-medium text-gray-300">{citation.project_name || 'Unknown Project'}</span>
      </div>
      <span className="text-gray-600">•</span>
      <div className="flex items-center gap-1.5">
        <FaMicrophone className="text-emerald-400" />
        <span className="text-gray-300 truncate max-w-[200px]">{citation.meeting_title || 'Unknown Meeting'}</span>
      </div>
    </div>
  );
}

export function GlobalKnowledge() {
  const [activeTab, setActiveTab] = useState<'search' | 'decisions' | 'requirements' | 'action_items'>('decisions');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: decisions, isLoading: ld } = useGlobalDecisions();
  const { data: requirements, isLoading: lr } = useGlobalRequirements();
  const { data: actionItems, isLoading: la } = useGlobalActionItems();
  const { data: searchResults, isLoading: ls } = useGlobalSearch(debouncedQuery);

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto w-full relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0a0a0a] to-[#0a0a0a] -z-10" />
      
      <div className="max-w-5xl w-full mx-auto space-y-8">
        
        {/* Header / Hero */}
        <div className="text-center space-y-4 pt-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">
            Global Knowledge Library
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Search across all published insights, decisions, and transcripts company-wide.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative group max-w-2xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl transition-all opacity-50 group-hover:opacity-100" />
          <div className="relative flex items-center bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
            <FaSearch className="w-5 h-5 text-gray-400 ml-4" />
            <input 
              type="text"
              placeholder="Ask the organizational brain..."
              className="w-full bg-transparent text-white placeholder-gray-500 px-4 py-3 outline-none text-lg"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveTab('search');
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        {!searchQuery && (
          <div className="flex justify-center gap-2">
            {[
              { id: 'decisions', label: 'Decisions', icon: <FaBrain /> },
              { id: 'requirements', label: 'Requirements', icon: <FaClipboardList /> },
              { id: 'action_items', label: 'Action Items', icon: <FaCheckSquare /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white/10 text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content Feed */}
        <div className="space-y-4 pb-20">
          
          {/* SEARCH RESULTS */}
          {activeTab === 'search' && debouncedQuery && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Search Results</h3>
              {ls ? <p className="text-gray-400">Searching...</p> : 
                searchResults?.length === 0 ? <p className="text-gray-400">No results found.</p> :
                searchResults?.map((res: GlobalSearchResult) => (
                  <div key={res.chunk.id} className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all">
                    <p className="text-gray-200 text-sm leading-relaxed">{res.chunk.text}</p>
                    <CitationBadge citation={res} />
                  </div>
                ))
              }
            </div>
          )}

          {/* DECISIONS */}
          {activeTab === 'decisions' && !searchQuery && (
            <div className="space-y-4">
              {ld ? <p className="text-gray-400">Loading...</p> :
                decisions?.items.length === 0 ? <p className="text-gray-400">No published decisions yet.</p> :
                decisions?.items.map((d: GlobalDecision) => (
                  <div key={d.id} className="glass-panel p-5 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-transparent">
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-medium text-lg">{d.decision}</h4>
                      {d.confidence && (
                        <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 uppercase">
                          {d.confidence}
                        </span>
                      )}
                    </div>
                    <CitationBadge citation={d} />
                  </div>
                ))
              }
            </div>
          )}

          {/* REQUIREMENTS */}
          {activeTab === 'requirements' && !searchQuery && (
            <div className="space-y-4">
              {lr ? <p className="text-gray-400">Loading...</p> :
                requirements?.items.length === 0 ? <p className="text-gray-400">No published requirements yet.</p> :
                requirements?.items.map((r: GlobalRequirement) => (
                  <div key={r.id} className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-medium text-lg">{r.requirement}</h4>
                      {r.priority && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 uppercase">
                          {r.priority} Priority
                        </span>
                      )}
                    </div>
                    <CitationBadge citation={r} />
                  </div>
                ))
              }
            </div>
          )}

          {/* ACTION ITEMS */}
          {activeTab === 'action_items' && !searchQuery && (
            <div className="space-y-4">
              {la ? <p className="text-gray-400">Loading...</p> :
                actionItems?.items.length === 0 ? <p className="text-gray-400">No published action items yet.</p> :
                actionItems?.items.map((a: GlobalActionItem) => (
                  <div key={a.id} className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-medium text-lg">{a.description}</h4>
                      {a.status && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 uppercase">
                          {a.status}
                        </span>
                      )}
                    </div>
                    {a.assignee && <p className="text-sm text-gray-400 mt-2">Assignee: <span className="text-gray-200">{a.assignee}</span></p>}
                    <CitationBadge citation={a} />
                  </div>
                ))
              }
            </div>
          )}
          
        </div>
      </div>
      <GlobalChatWidget />
    </div>
  );
}
