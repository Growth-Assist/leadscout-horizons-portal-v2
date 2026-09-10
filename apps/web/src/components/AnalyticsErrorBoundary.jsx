import React from 'react';
import { Button } from '@/components/ui/button';

export default class AnalyticsErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Analytics rendering failed:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div role="alert" className="max-w-md space-y-4 rounded-xl border border-border p-6">
          <h1 className="text-xl font-semibold">Analytics could not be displayed</h1>
          <p className="text-sm text-muted-foreground">Try loading the dashboard again, or return to the overview.</p>
          <div className="flex gap-3">
            <Button onClick={() => this.setState({ failed: false })}>Try again</Button>
            <Button variant="outline" asChild><a href="/overview">Back to overview</a></Button>
          </div>
        </div>
      </main>
    );
  }
}
