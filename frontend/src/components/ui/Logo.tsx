export function LuminaLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="lumina-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path 
        d="M12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2Z" 
        fill="url(#lumina-grad)" 
        filter="url(#glow)" 
      />
      <path 
        d="M19.5 4C19.5 5.5 20.5 6.5 22 6.5C20.5 6.5 19.5 7.5 19.5 9C19.5 7.5 18.5 6.5 17 6.5C18.5 6.5 19.5 5.5 19.5 4Z" 
        fill="#a7f3d0" 
      />
    </svg>
  );
}
