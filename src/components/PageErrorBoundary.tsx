import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * PageErrorBoundary renders an inline friendly error message instead of the
 * full-screen fallback used by the top-level ErrorBoundary. Use this around
 * page content so a single broken component does not crash the entire app.
 */
export class PageErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `PageErrorBoundary${this.props.pageName ? ` (${this.props.pageName})` : ""} caught:`,
      error,
      info
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-16 px-4">
          <div className="flex flex-col items-center text-center max-w-md space-y-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              We couldn't load this section
            </h2>
            <p className="text-sm text-muted-foreground">
              Something went wrong while rendering this page. You can try again
              or refresh the browser.
            </p>
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" /> Try Again
              </Button>
              <Button onClick={() => window.location.reload()} className="gap-2">
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
