import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { cn } from '../../utils/cn';

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({ trigger, children, align = 'right', className }: DropdownMenuProps) {
  return (
    <Menu as="div" className={cn("relative inline-block text-left", className)}>
      <Menu.Button as={React.Fragment}>{trigger}</Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={cn(
            "absolute z-50 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100",
            align === 'right' ? "right-0" : "left-0"
          )}
        >
          {children}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

export function DropdownMenuItem({ 
  children, 
  onClick, 
  icon,
  destructive 
}: { 
  children: React.ReactNode; 
  onClick?: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <div className="px-1 py-1">
      <Menu.Item>
        {({ active }) => (
          <button
            onClick={onClick}
            className={cn(
              "group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors",
              active ? (destructive ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-900") : "text-gray-700",
              destructive && !active && "text-red-600"
            )}
          >
            {icon && <span className="mr-2 h-4 w-4">{icon}</span>}
            {children}
          </button>
        )}
      </Menu.Item>
    </div>
  );
}
