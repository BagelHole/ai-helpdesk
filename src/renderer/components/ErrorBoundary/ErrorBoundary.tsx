import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-lg w-full mx-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              {/* Error icon */}
              <div className="text-red-500 text-6xl mb-4">⚠️</div>

              {/* Error title */}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Something went wrong
              </h1>

              {/* Error description */}
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                An unexpected error occurred. This has been logged and will be
                investigated.
              </p>

              {/* Error details (development only) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-left">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Error Details:
                  </h3>
                  <pre className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400">
                        Component Stack
                      </summary>
                      <pre className="text-xs text-gray-500 dark:text-gray-500 mt-2 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={this.handleReset} className="btn btn-primary">
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="btn btn-secondary"
                >
                  Reload App
                </button>
              </div>

              {/* Additional help */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  If this problem persists, please{" "}
                  <button
                    onClick={() =>
                      window.electronAPI.system.openExternal(
                        "https://github.com/bagelhole/ai-helpdesk/issues"
                      )
                    }
                    className="text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    report an issue
                  </button>{" "}
                  on GitHub.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
