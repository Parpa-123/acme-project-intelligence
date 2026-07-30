import { useState } from 'react';
import { FaBook, FaTimes, FaExpandAlt, FaCompressAlt } from 'react-icons/fa';
import { KnowledgeExplorer } from './KnowledgeExplorer';

interface KnowledgeDrawerProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function KnowledgeDrawer({ projectId, isOpen, onClose }: KnowledgeDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Default to full width for explorer since it has a lot of content

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-screen bg-black/80 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 flex flex-col transition-all duration-300 ease-in-out ${isExpanded ? 'w-full md:w-[90vw]' : 'w-full md:w-[60vw] lg:w-[50vw]'}`}>
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <FaBook className="text-indigo-400 text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white text-glow-sm">Knowledge Explorer</h2>
              <p className="text-xs text-indigo-400 font-medium">Search & Discovery</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <FaCompressAlt /> : <FaExpandAlt />}
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* Knowledge Explorer Content */}
        <div className="flex-1 overflow-hidden p-4 md:p-6 bg-transparent">
            {/* The explorer manages its own height and scrolling, we let it fill this container */}
            <div className="h-full w-full">
                <KnowledgeExplorer projectId={projectId} />
            </div>
        </div>
      </div>
    </>
  );
}
