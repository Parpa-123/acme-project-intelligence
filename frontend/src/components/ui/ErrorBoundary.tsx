import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl border-red-500/20 bg-red-500/5">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-red-500/20">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white text-glow-sm">Something went wrong</h2>
              <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                We encountered an unexpected error. Our team has been notified.
              </p>
            </div>
            
            <div className="bg-black/40 rounded-xl p-4 text-left overflow-hidden border border-white/5">
              <p className="text-xs text-red-300 font-mono break-all line-clamp-3">
                {this.state.error?.message || "Unknown error"}
              </p>
            </div>

            <Button 
              onClick={() => window.location.reload()} 
              className="w-full justify-center bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
