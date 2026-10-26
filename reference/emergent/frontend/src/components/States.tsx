import type { ReactNode } from "react";
import { SearchX, WifiOff } from "lucide-react";
import { Button } from "./Button";

export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-brand-100 p-5 animate-pulse" aria-hidden>
      <div className="h-4 w-24 bg-brand-50 rounded" />
      <div className="mt-3 h-6 w-3/4 bg-brand-50 rounded" />
      <div className="mt-4 h-10 w-1/2 bg-brand-100 rounded" />
      <div className="mt-4 flex gap-2">
        <div className="h-7 w-20 bg-brand-50 rounded-full" />
        <div className="h-7 w-28 bg-brand-50 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="board-skeleton">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export function EmptyState({ title, sub, action, actionLabel, testId }: { title: string; sub?: string; action?: () => void; actionLabel?: string; testId?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-10 text-center" data-testid={testId || "empty-state"}>
      <SearchX className="mx-auto text-brand-500" size={40} aria-hidden />
      <p className="mt-4 text-lg font-bold text-forest">{title}</p>
      {sub && <p className="mt-1 text-slate-600">{sub}</p>}
      {action && actionLabel && (
        <Button variant="secondary" className="mt-6" onClick={action} data-testid="empty-state-action">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ title, sub, retry, retryLabel }: { title: string; sub?: string; retry?: () => void; retryLabel: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center" role="alert" data-testid="error-state">
      <WifiOff className="mx-auto text-red-700" size={36} aria-hidden />
      <p className="mt-3 text-lg font-bold text-red-700">{title}</p>
      {sub && <p className="mt-1 text-slate-700">{sub}</p>}
      {retry && (
        <Button variant="secondary" className="mt-5" onClick={retry} data-testid="error-retry">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export function Section({ title, children, testId }: { title?: string; children: ReactNode; testId?: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4" data-testid={testId}>
      {title && <h2 className="text-base md:text-lg font-bold text-forest mb-4">{title}</h2>}
      {children}
    </section>
  );
}
