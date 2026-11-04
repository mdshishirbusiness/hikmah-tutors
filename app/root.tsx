import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, type ShouldRevalidateFunctionArgs } from "react-router";

import type { Route } from "./+types/root";
import { headerViewer } from "./lib/me.server";
import "./app.css";

// The header shows who is signed in (a tutor's photo, Admin for the owner, Log in otherwise).
export async function loader({ request }: Route.LoaderArgs) {
  return { viewer: await headerViewer(request) };
}

// Sign-in state only changes on a form post (log out) or a full page load (Google's return), not on filters.
export function shouldRevalidate({ formMethod, currentUrl, nextUrl, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (formMethod) return defaultShouldRevalidate;
  return currentUrl.pathname !== nextUrl.pathname && defaultShouldRevalidate;
}

export const links: Route.LinksFunction = () => [
  { rel: "preload", href: "/fonts/plus-jakarta-sans-latin.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: "/fonts/hind-siliguri-bengali-400.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#09332a" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let details = "Try opening the page again.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Page not found";
      details = "Check the address.";
    } else if (error.status === 401) {
      title = "Sign-in needed";
      details = "This page is for the admin only.";
    } else if (typeof error.data === "string" && error.data) {
      details = error.data;
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto max-w-lg p-6 pt-16">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{details}</p>
      {stack && (
        <pre className="mt-6 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
