import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Hikmah Tutors" },
    { name: "description", content: "Hikmah Tutors: বিশ্বস্ত হোম টিউটর।" },
  ];
}

// Placeholder until the public site (tuition posts for tutors) is built.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center p-6 text-center">
      <div className="grid size-16 place-items-center rounded-xl bg-brand-600 text-3xl font-semibold text-white">
        H
      </div>
      <h1 className="mt-5 text-3xl font-semibold text-slate-900">Hikmah Tutors</h1>
      <p className="mt-2 text-slate-600">ওয়েবসাইট তৈরি হচ্ছে।</p>
    </main>
  );
}
