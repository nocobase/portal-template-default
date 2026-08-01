import { CircleAlert, House, RefreshCw } from "lucide-react";
import { useTranslate } from "@refinedev/core";
import {
  Component,
  type ErrorInfo,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";

import { Button } from "@/components/ui/button";

type PageErrorBoundaryState = {
  error: Error | null;
};

type PageErrorBoundaryStateProps = PropsWithChildren<{
  homeHref: string;
  title: string;
  description: string;
  reloadLabel: string;
  backHomeLabel: string;
}>;

class PageErrorBoundaryStateContainer extends Component<
  PageErrorBoundaryStateProps,
  PageErrorBoundaryState
> {
  state: PageErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): PageErrorBoundaryState {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unable to render the current page", error, info);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg space-y-6 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <CircleAlert className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">{this.props.title}</h1>
            <p className="text-sm text-muted-foreground">
              {this.props.description}
            </p>
          </div>
          {import.meta.env.DEV ? (
            <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap text-muted-foreground">
              {error.message}
            </pre>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw data-icon="inline-start" />
              {this.props.reloadLabel}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.assign(this.props.homeHref)}
            >
              <House data-icon="inline-start" />
              {this.props.backHomeLabel}
            </Button>
          </div>
        </div>
      </main>
    );
  }
}

export function PageErrorBoundary({
  children,
  homeHref,
}: PropsWithChildren<{ homeHref: string }>) {
  const location = useLocation();
  const translate = useTranslate();
  const locationKey = `${location.pathname}${location.search}${location.hash}`;

  return (
    <PageErrorBoundaryStateContainer
      key={locationKey}
      homeHref={homeHref}
      title={translate(
        "pages.renderError.title",
        "Unable to display this page"
      )}
      description={translate(
        "pages.renderError.description",
        "An unexpected error occurred while rendering the page. Reload it to try again, or return to the homepage."
      )}
      reloadLabel={translate("pages.renderError.reload", "Reload page")}
      backHomeLabel={translate(
        "pages.renderError.backHome",
        "Back to homepage"
      )}
    >
      {children}
    </PageErrorBoundaryStateContainer>
  );
}
