import { useState } from 'react';
import { FaBook, FaTimes, FaExpandAlt, FaCompressAlt } from 'react-icons/fa';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { KnowledgeExplorer } from './KnowledgeExplorer';

interface KnowledgeDrawerProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function KnowledgeDrawer({ projectId, isOpen, onClose }: KnowledgeDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Default to full width for explorer since it has a lot of content

  return (
    <Transition show={isOpen} as={Fragment}>
      <HeadlessDialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>
        
        {/* Drawer */}
        <Transition.Child
          as={Fragment}
          enter="transform transition ease-in-out duration-300"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="transform transition ease-in-out duration-300"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
        >
          <HeadlessDialog.Panel className={`fixed right-0 top-0 h-screen bg-black/80 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${isExpanded ? 'w-full md:w-[90vw]' : 'w-full md:w-[60vw] lg:w-[50vw]'}`}>
        
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
          </HeadlessDialog.Panel>
        </Transition.Child>
      </HeadlessDialog>
    </Transition>
  );
}
