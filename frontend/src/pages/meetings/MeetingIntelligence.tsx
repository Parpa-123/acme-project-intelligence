import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useMeetingProcessingStatus,
  useMeetingKnowledge,
  useMeetingSummary,
  useMeetingActionItems,
  useMeetingDecisions,
  useMeetingRequirements,
  useMeetingConcerns,
  useMeetingTopics
} from '../../api/meetings';
import type { 
  MeetingActionItemResponse, 
  MeetingDecisionResponse, 
  MeetingRequirementResponse, 
  MeetingConcernResponse, 
  MeetingTopicResponse 
} from '../../types';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

const tabs = ['Summary', 'Action Items', 'Decisions', 'Requirements', 'Concerns', 'Topics'];

export function MeetingIntelligence() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [activeTab, setActiveTab] = useState('Summary');

  const { data: status } = useMeetingProcessingStatus(meetingId);
  const { data: chunks } = useMeetingKnowledge(meetingId);
  const { data: summaryResponse } = useMeetingSummary(meetingId);
  const { data: actionItems } = useMeetingActionItems(meetingId);
  const { data: decisions } = useMeetingDecisions(meetingId);
  const { data: requirements } = useMeetingRequirements(meetingId);
  const { data: concerns } = useMeetingConcerns(meetingId);
  const { data: topics } = useMeetingTopics(meetingId);

  // Trace mechanism
  const handleTrace = (chunkId: string) => {
    const el = document.getElementById(`chunk-${chunkId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-yellow-100');
      setTimeout(() => el.classList.remove('bg-yellow-100'), 2000);
    }
  };

  const enrichmentStatus = status?.enrichment_status?.toLowerCase();
  const isProcessing = enrichmentStatus && enrichmentStatus !== 'completed' && enrichmentStatus !== 'failed';

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Meeting Intelligence</h1>
        
        {/* Pipeline Status Bar */}
        <div className="flex items-center space-x-6">
          <StatusStep label="Transcript" status={status?.transcript_status || 'pending'} />
          <StatusStep label="Knowledge Processing" status={status?.knowledge_status || 'pending'} />
          <StatusStep label="AI Enrichment" status={status?.enrichment_status || 'pending'} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left Pane: Transcript */}
        <div className="w-1/3 border-r border-gray-200 bg-white overflow-y-auto p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Transcript Timeline</h2>
          <div className="space-y-6">
            {chunks?.map((chunk) => (
              <div 
                key={chunk.id} 
                id={`chunk-${chunk.id}`}
                className="p-4 rounded-lg bg-gray-50 transition-colors duration-500 border border-transparent"
              >
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span className="font-medium text-indigo-600">{chunk.participants.join(', ')}</span>
                  <span>{new Date(chunk.start_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {chunk.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Intelligence */}
        <div className="w-2/3 flex flex-col bg-gray-50 overflow-hidden">
          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-6 pt-2">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab 
                      ? 'border-indigo-500 text-indigo-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-500" />
                <p className="text-lg font-medium text-gray-900">AI is processing this meeting...</p>
                <p className="text-sm">Generating intelligent insights, summaries, and action items.</p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                {enrichmentStatus === 'failed' && (
                  <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                    <h3 className="text-sm font-medium">AI Enrichment Failed</h3>
                    <p className="text-sm mt-1">There was an error generating intelligent insights for this meeting. Please try again later or check system logs.</p>
                  </div>
                )}
                {activeTab === 'Summary' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {summaryResponse?.summary || "No summary available."}
                    </p>
                  </div>
                )}
                
                {activeTab === 'Action Items' && (
                  <div className="space-y-4">
                    {actionItems && actionItems.length > 0 ? actionItems.map((item: MeetingActionItemResponse) => (
                      <IntelligenceCard 
                        key={item.id} 
                        title={item.description}
                        badge={item.assignee}
                        chunkId={item.knowledge_chunk_id}
                        onTrace={handleTrace}
                      />
                    )) : (
                      <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">No action items found in this meeting.</div>
                    )}
                  </div>
                )}
                
                {activeTab === 'Decisions' && (
                  <div className="space-y-4">
                    {decisions && decisions.length > 0 ? decisions.map((item: MeetingDecisionResponse) => (
                      <IntelligenceCard 
                        key={item.id} 
                        title={item.decision}
                        badge={`Confidence: ${item.confidence}`}
                        chunkId={item.knowledge_chunk_id}
                        onTrace={handleTrace}
                      />
                    )) : (
                      <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">No decisions were recorded in this meeting.</div>
                    )}
                  </div>
                )}
                
                {activeTab === 'Requirements' && (
                  <div className="space-y-4">
                    {requirements && requirements.length > 0 ? requirements.map((item: MeetingRequirementResponse) => (
                      <IntelligenceCard 
                        key={item.id} 
                        title={item.requirement}
                        badge={`Priority: ${item.priority}`}
                        chunkId={item.knowledge_chunk_id}
                        onTrace={handleTrace}
                      />
                    )) : (
                      <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">No requirements found in this meeting.</div>
                    )}
                  </div>
                )}
                
                {activeTab === 'Concerns' && (
                  <div className="space-y-4">
                    {concerns && concerns.length > 0 ? concerns.map((item: MeetingConcernResponse) => (
                      <IntelligenceCard 
                        key={item.id} 
                        title={item.concern}
                        badge={`Severity: ${item.severity}`}
                        chunkId={item.knowledge_chunk_id}
                        onTrace={handleTrace}
                      />
                    )) : (
                      <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">No concerns or risks identified.</div>
                    )}
                  </div>
                )}
                
                {activeTab === 'Topics' && (
                  <div className="space-y-4">
                    {topics && topics.length > 0 ? topics.map((item: MeetingTopicResponse) => (
                      <IntelligenceCard 
                        key={item.id} 
                        title={item.topic}
                        chunkId={item.knowledge_chunk_id}
                        onTrace={handleTrace}
                      />
                    )) : (
                      <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">No specific topics extracted.</div>
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
      {status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
      {status === 'processing' && <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />}
      {status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-gray-300" />}
      {status === 'failed' && <div className="h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-xs">!</div>}
      <span className={`text-sm font-medium ${status === 'completed' ? 'text-gray-900' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

function IntelligenceCard({ title, badge, chunkId, onTrace }: { title: string, badge?: string, chunkId: string, onTrace: (id: string) => void }) {
  return (
    <div 
      onClick={() => onTrace(chunkId)}
      className="group bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all flex items-start justify-between"
    >
      <div>
        <p className="text-gray-900 font-medium">{title}</p>
        {badge && (
          <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {badge}
          </span>
        )}
      </div>
      <div className="text-gray-400 group-hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100 flex items-center space-x-1 text-sm">
        <span>View transcript</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </div>
  );
}
