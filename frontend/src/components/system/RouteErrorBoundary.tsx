import { Component, type ReactNode } from "react";
import { Shield, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Wraps the routed <Suspense> tree. <Suspense> only covers the loading
 * state of a lazy import — it does NOT catch errors, so a failed
 * dynamic import() (e.g. a stale module graph from before a new route
 * was added, still attached in an already-open tab) previously crashed
 * silently to a blank page instead of surfacing anything actionable.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("Route failed to load:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-svh bg-background p-6">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="size-12 rounded-xl gradient-primary flex items-center justify-center">
              <Shield className="size-6 text-white" />
            </div>
            <h1 className="text-lg font-semibold">This page failed to load</h1>
            <p className="text-sm text-muted-foreground">
              This can happen after the app has been updated while this tab
              was open. Reloading usually fixes it.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <RefreshCw className="size-4" />
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}