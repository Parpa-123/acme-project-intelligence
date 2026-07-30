import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useMeetingProcessingStatus,
} from '../../api/meetings';
import {
  useKnowledgeChunks,
  useKnowledgeArtifacts
} from '../../api/knowledgeApi';
import type {
  Decision,
  ActionItem,
  Requirement,
  Concern,
  Topic,
  Summary
} from '../../api/knowledgeApi';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

const tabs = ['Summary', 'Action Items', 'Decisions', 'Requirements', 'Concerns', 'Topics'];

export function MeetingIntelligence() {
  const { meetingId, projectId } = useParams<{ meetingId: string, projectId: string }>();
  const [activeTab, setActiveTab] = useState('Summary');
  const projIdNum = Number(projectId);

  const { data: status } = useMeetingProcessingStatus(meetingId);
  const { data: chunksRes } = useKnowledgeChunks(projIdNum, meetingId);
  const { data: summaryRes } = useKnowledgeArtifacts<Summary>(projIdNum, 'summaries', meetingId);
  const { data: actionItemsRes } = useKnowledgeArtifacts<ActionItem>(projIdNum, 'action-items', meetingId);
  const { data: decisionsRes } = useKnowledgeArtifacts<Decision>(projIdNum, 'decisions', meetingId);
  const { data: requirementsRes } = useKnowledgeArtifacts<Requirement>(projIdNum, 'requirements', meetingId);
  const { data: concernsRes } = useKnowledgeArtifacts<Concern>(projIdNum, 'concerns', meetingId);
  const { data: topicsRes } = useKnowledgeArtifacts<Topic>(projIdNum, 'topics', meetingId);

  const chunks = chunksRes?.items;
  const summaryResponse = summaryRes?.items?.[0];
  const actionItems = actionItemsRes?.items;
  const decisions = decisionsRes?.items;
  const requirements = requirementsRes?.items;
  const concerns = concernsRes?.items;
  const topics = topicsRes?.items;

  // Trace mechanism
  const handleTrace = (chunkId: string) => {
    const el = document.getElementById(`chunk-${chunkId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-indigo-500/20', 'border-indigo-500/50');
      setTimeout(() => el.classList.remove('bg-indigo-500/20', 'border-indigo-500/50'), 2000);
    }
  };

  const enrichmentStatus = status?.enrichment_status?.toLowerCase();
  const isProcessing = enrichmentStatus && enrichmentStatus !== 'completed' && enrichmentStatus !== 'failed';

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="glass-panel border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white text-glow-sm">Meeting Intelligence</h1>
        
        {/* Pipeline Status Bar */}
        <div className="flex items-center space-x-6">
          <StatusStep label="Transcript" status={status?.transcript_status || 'pending'} />
          <StatusStep label="Knowledge Processing" status={status?.knowledge_status || 'pending'} />
          <StatusStep label="AI Enrichment" status={status?.enrichment_status || 'pending'} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left Pane: Transcript */}
        <div className="w-full md:w-1/3 border-r border-white/10 bg-white/5 backdrop-blur-md overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-white text-glow-sm mb-4">Transcript Timeline</h2>
          <div className="space-y-6">
            {chunks?.map((chunk) => (
              <div 
                key={chunk.id} 
                id={`chunk-${chunk.id}`}
                className="p-4 rounded-xl glass-panel shadow-[0_0_15px_rgba(0,0,0,0.2)] border border-white/10 hover:border-indigo-500/30 transition-colors duration-500 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span className="font-bold text-indigo-400">{chunk.participant_ids.length} Participants</span>
                  <span>{new Date(chunk.start_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {chunk.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Intelligence */}
        <div className="w-full md:w-2/3 flex flex-col bg-transparent overflow-hidden">
          {/* Tabs */}
          <div className="glass-panel border-b border-white/10 px-6 pt-2 overflow-x-auto no-scrollbar">
            <nav className="-mb-px flex space-x-8 min-w-max" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm transition-all
                    ${activeTab === tab 
                      ? 'border-indigo-400 text-white text-glow-sm' 
                      : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20'
                    }
                  `}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {isProcessing ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                <p className="text-lg font-bold text-white text-glow-md">AI is processing this meeting...</p>
                <p className="text-sm mt-2 text-gray-300">Generating intelligent insights, summaries, and action items.</p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                {enrichmentStatus === 'failed' && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    <h3 className="text-sm font-bold text-glow-sm">AI Enrichment Failed</h3>
                    <p className="text-sm mt-1">There was an error generating intelligent insights for this meeting. Please try again later or check system logs.</p>
                  </div>
                )}
                {activeTab === 'Summary' && (
                  <div className="glass-panel rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] border border-white/10 p-8">
                    <h3 className="text-xl font-bold text-white text-glow-md mb-6">Executive Summary</h3>
                    <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-md">
                      {summaryResponse?.summary || "No summary available."}
                    </p>
                  </div>
                )}
                
                {activeTab === 'Action Items' && (
                  <div className="space-y-4">
                    {actionItems && actionItems.length > 0 ? actionItems.map((item) => (
                      <IntelligenceCard 
                        key={item.id} 
                        title={item.description}
                        badge={item.assignee}
                        chunkId={item.knowledge_chunk_id || ''}
                        onTrace={handleTrace}
                      />
                    )) : (
                      <div className="text-center p-8 text-gray-400 glass-panel rounded-2xl border border-white/10">No action items found in this meeting.</div>
                    )}
                  </div>
                )}
                
                {activeTab === 'Decisions' && (
                  <div className="space-y-4">
                    {decisions && decisions.length > 0 ? decisions.map((item) => (
                      <IntelligenceCard 
                        key={item.id} 
                        title={item.decision}
                        badge={`Confidence: ${item.confidence}`}
                        chunkId={item.knowledge_chunk_id || ''}
                        onTrace={handleTrace}
                      />
                    )) : (
                      <div className="text-center p-8 text-gray-400 glass-panel rounded-2xl border border-white/10">No decisions were recorded in this meeting.</div>
                    )}
                  </div>
                )}
                
                {activeTab === 'Requirements' && (
                  <div className="space-y-4">
                    {requirements && requirements.length > 0 ? requirements.map((item) => (
                      <IntelligenceCard 
                        key={item.id} 
                        title={item.requirement}
                        badge={`Priority: ${item.priority}`}
                        chunkId={item.knowledge_chunk_id || ''}
                        onTrace={handleTrace}
                      />
                    )) : (
                      <div className="text-center p-8 text-gray-400 glass-panel rounded-2xl border border-white/10">No requirements found in this meeting.</div>
                    )}
                  </div>
                )}
                
                {activeTab === 'Concerns' && (
                  <div className="space-y-4">
                    {concerns && concerns.length > 0 ? concerns.map((item) => (
                      <IntelligenceCard 
                        key={item.id} 
                        title={item.concern}
                        badge={`Severity: ${item.severity}`}
                        chunkId={item.knowledge_chunk_id || ''}
                        onTrace={handleTrace}
                      />
                    )) : (
                      <div className="text-center p-8 text-gray-400 glass-panel rounded-2xl border border-white/10">No concerns or risks identified.</div>
                    )}
                  </div>
                )}
                
                {activeTab === 'Topics' && (
                  <div className="space-y-4">
                    {topics && topics.length > 0 ? topics.map((item) => (
                      <IntelligenceCard 
                        key={item.id} 
                        title={item.topic}
                        chunkId={item.knowledge_chunk_id || ''}
                        onTrace={handleTrace}
                      />
                    )) : (
                      <div className="text-center p-8 text-gray-400 glass-panel rounded-2xl border border-white/10">No specific topics extracted.</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusStep({ label, status }: { label: string, status: string }) {
  return (
    <div className="flex items-center space-x-2">
      {status === 'completed' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
      {status === 'processing' && <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />}
      {status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-gray-500" />}
      {status === 'failed' && <div className="h-5 w-5 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 flex items-center justify-center font-bold text-xs">!</div>}
      <span className={`text-sm font-bold ${status === 'completed' ? 'text-white text-glow-sm' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

function IntelligenceCard({ title, badge, chunkId, onTrace }: { title: string, badge?: string, chunkId: string, onTrace: (id: string) => void }) {
  return (
    <div 
      onClick={() => onTrace(chunkId)}
      className="group glass-panel rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.2)] border border-white/10 p-5 cursor-pointer hover:border-indigo-400/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all flex items-start justify-between hover:-translate-y-1"
    >
      <div>
        <p className="text-white font-bold text-glow-sm group-hover:text-indigo-300 transition-colors">{title}</p>
        {badge && (
          <span className="inline-flex items-center mt-3 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-gray-300 ring-1 ring-white/20">
            {badge}
          </span>
        )}
      </div>
      <div className="text-gray-500 group-hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100 flex items-center space-x-1 text-sm mt-1">
        <span className="font-bold">View transcript</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </div>
  );
}
