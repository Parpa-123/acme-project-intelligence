import { useState } from 'react';
import { FaRobot } from 'react-icons/fa';
import { ChatDrawer } from '../ai-chat/ChatDrawer';

export function GlobalChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-40 p-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:shadow-[0_0_30px_rgba(16,185,129,0.8)] transition-all duration-300 flex items-center justify-center transform hover:scale-105"
        title="Open Global AI Chat"
      >
        <FaRobot className="text-2xl" />
      </button>

      <ChatDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        projectId={undefined}
      />
    </>
  );
}
