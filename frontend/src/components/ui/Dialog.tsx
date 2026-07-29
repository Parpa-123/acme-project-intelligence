import React, { Fragment } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { FaTimes } from 'react-icons/fa';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Dialog({ isOpen, onClose, title, description, children }: DialogProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <HeadlessDialog as="div" className="relative z-50" onClose={onClose}>
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

        <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-end md:items-center justify-center p-0 md:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-full md:translate-y-0 md:scale-95"
              enterTo="opacity-100 translate-y-0 md:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 md:scale-100"
              leaveTo="opacity-0 translate-y-full md:translate-y-0 md:scale-95"
            >
              <HeadlessDialog.Panel className="w-full max-w-md transform overflow-hidden rounded-t-3xl md:rounded-2xl glass-panel p-6 text-left align-middle shadow-2xl transition-all border-t border-white/20 md:border md:border-white/10 mt-auto md:mt-0">
                <div className="flex items-start justify-between">
                  <div>
                    <HeadlessDialog.Title as="h3" className="text-xl font-bold leading-6 text-white text-glow-sm">
                      {title}
                    </HeadlessDialog.Title>
                    {description && (
                      <p className="mt-2 text-sm text-gray-400">{description}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-full p-2 hover:bg-white/10 transition-colors text-gray-400 hover:text-white ring-1 ring-transparent hover:ring-white/20"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="mt-6">{children}</div>
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );
}
