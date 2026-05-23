import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI matching the DESIGN.md "Void" and "Critical Magenta" palette
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-void text-txt-primary p-6 border border-[#ff2244] rounded-cs">
          <h2 className="text-xl font-display font-bold text-[#ff2244] mb-2">Component Offline</h2>
          <p className="text-sm font-mono text-txt-secondary text-center mb-4">
            A critical rendering or state error occurred in this module. The rest of the dashboard remains operational.
          </p>
          <button
            className="px-4 py-2 bg-[#ff2244] text-white rounded-cs-sm font-mono text-sm hover:opacity-90 transition-opacity"
            onClick={() => this.setState({ hasError: false, errorInfo: null })}
          >
            Attempt Recovery
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
