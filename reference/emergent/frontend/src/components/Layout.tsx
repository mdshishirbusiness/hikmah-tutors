import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "../api/client";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { SettingsContext } from "./SettingsContext";
import { useI18n } from "../i18n";

export function Layout() {
  const { pathname } = useLocation();
  const { lang } = useI18n();
  const isTutorPanel = pathname.startsWith("/tutor");
  const settings = useQuery({ queryKey: ["settings"], queryFn: getPublicSettings, staleTime: 10 * 60_000 });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <SettingsContext.Provider value={settings.data ?? { contact_whatsapp: null, contact_call: null, facebook_page_url: null }}>
      <div className={`min-h-screen flex flex-col ${isTutorPanel ? "pb-20 lg:pb-0" : ""}`}>
        <a href="#main-content" data-testid="skip-to-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 rounded-xl bg-white px-4 py-3 font-semibold text-forest">{lang === "en" ? "Skip to content" : "মূল অংশে যান"}</a>
        <Header />
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          <Outlet />
        </main>
        <Footer />
      </div>
    </SettingsContext.Provider>
  );
}
