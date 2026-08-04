import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface EmptyStateProps {
  icon?: LucideIcon | React.ElementType;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={twMerge("flex flex-col items-center justify-center p-8 text-center glass-panel rounded-2xl border-dashed", className)}>
      {Icon && (
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 ring-1 ring-white/10">
          <Icon className="w-8 h-8 text-gray-500" />
        </div>
      )}
      <h3 className="text-lg font-bold text-white text-glow-sm">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">{description}</p>
      )}
    </div>
  );
}
