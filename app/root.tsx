import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, type ShouldRevalidateFunctionArgs } from "react-router";

import type { Route } from "./+types/root";
import { Offline } from "./components/Offline";
import { PageLoader } from "./components/PageLoader";
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
  { rel: "manifest", href: "/manifest.webmanifest" },
  { rel: "icon", type: "image/png", sizes: "192x192", href: "/brand/icon-192.png" },
  { rel: "apple-touch-icon", href: "/brand/apple-touch-icon.png" },
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
  return (
    <>
      <PageLoader />
      <Offline />
      <Outlet />
    </>
  );
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

  // A failed page keeps the brand and a way out, so it never reads as a page without its styles.
  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-cream px-4 pt-16 pb-10">
      <a href="/" className="inline-flex items-center gap-2">
        <img src="/brand/mark.webp" alt="" width={40} height={40} className="size-10" />
        <span className="text-lg font-extrabold tracking-tight text-forest">Hikmah Tutors<span className="text-brand-600">.</span></span>
      </a>
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight text-forest">{title}</h1>
      <p className="mt-2 text-slate-600">{details}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 items-center rounded-xl bg-forest px-5 text-sm font-bold text-cream">Try again</button>
        <button type="button" onClick={() => window.history.back()} className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-bold text-forest shadow-ring">Go back</button>
      </div>
      {stack && (
        <pre className="mt-6 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
