'use client';
import React from 'react';

interface Props { children: React.ReactNode; }
interface State  { hasError: boolean; error: Error | null; }

// Browser extensions (password managers, Grammarly, Translate) inject DOM nodes
// that shift siblings React expects to find during commit. Detect those errors here.
const isDomExtensionError = (error: Error) =>
  error instanceof DOMException &&
  (error.name === 'NotFoundError' || error.name === 'HierarchyRequestError') &&
  (error.message.includes('insertBefore') || error.message.includes('removeChild'));

export class DomErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    if (isDomExtensionError(error)) {
      // Silently auto-reset — the next render will succeed because React re-runs
      // from a clean fiber snapshot after an error boundary catches.
      setTimeout(() => this.setState({ hasError: false, error: null }), 0);
    } else {
      console.error('[DomErrorBoundary]', error);
    }
  }

  render() {
    const { hasError, error } = this.state;

    // DOM extension error: momentarily render nothing while auto-resetting
    if (hasError && error && isDomExtensionError(error)) return null;

    // Genuine app error: show a recovery UI
    if (hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <p className="text-gray-500 text-sm">Something went wrong. Please reload.</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
