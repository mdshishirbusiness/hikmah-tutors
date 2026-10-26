import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { I18nProvider } from "./i18n";
import { Layout } from "./components/Layout";
import { getOptions } from "./api/client";
import { setServerOptions } from "./lib/options";
import Board from "./pages/Board";
import TuitionDetail from "./pages/TuitionDetail";
import HowItWorks from "./pages/HowItWorks";
import Fees from "./pages/Fees";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import RequestTutor from "./pages/RequestTutor";
import SignIn from "./pages/SignIn";
import NotFound from "./pages/NotFound";
import { TutorLayout } from "./pages/tutor/TutorLayout";
import TutorHome from "./pages/tutor/TutorHome";
import TutorSaved from "./pages/tutor/TutorSaved";
import TutorApplications from "./pages/tutor/TutorApplications";
import TutorProfile from "./pages/tutor/TutorProfile";
import { AdminLayout } from "./pages/admin/AdminLayout";
import AdminQueue from "./pages/admin/AdminQueue";
import QuickPad from "./pages/admin/QuickPad";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminTuitions from "./pages/admin/AdminTuitions";
import TuitionEditor from "./pages/admin/TuitionEditor";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminTutors from "./pages/admin/AdminTutors";
import AdminPosts from "./pages/admin/AdminPosts";
import AdminSettings from "./pages/admin/AdminSettings";

function OptionsGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getOptions().then(setServerOptions).catch(() => undefined).finally(() => setReady(true));
  }, []);
  if (!ready) return <div className="min-h-screen bg-cream" data-testid="options-loading" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <I18nProvider>
      <OptionsGate>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Board />} />
              <Route path="/tuitions/:code" element={<TuitionDetail />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/fees" element={<Fees />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/request-tutor" element={<RequestTutor />} />
              <Route path="/signin" element={<SignIn kind="signin" />} />
              <Route path="/claim" element={<SignIn kind="claim" />} />
              <Route path="/tutor" element={<TutorLayout />}>
                <Route index element={<TutorHome />} />
                <Route path="saved" element={<TutorSaved />} />
                <Route path="applications" element={<TutorApplications />} />
                <Route path="profile" element={<TutorProfile />} />
              </Route>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminQueue />} />
                <Route path="quick" element={<QuickPad />} />
                <Route path="leads" element={<AdminLeads />} />
                <Route path="tuitions" element={<AdminTuitions />} />
                <Route path="tuitions/:code" element={<TuitionEditor />} />
                <Route path="applications" element={<AdminApplications />} />
                <Route path="tutors" element={<AdminTutors />} />
                <Route path="posts" element={<AdminPosts />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors closeButton />
      </OptionsGate>
    </I18nProvider>
  );
}
