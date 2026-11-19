// WhatsApp Inbox (owner, 2026-11-18; looks like WhatsApp, 2026-11-19): the chat list. On a phone a chat opens full
// screen over it; on a computer it opens beside it, like WhatsApp Web. The AI answers guardians and saves their request
// as a lead; a chat waits here for a person when the AI hands it on. Moderators with the Inbox switch see chats not yet
// taken and their own.
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useRevalidator, useSearchParams } from "react-router";
import { ArrowLeft, Bot, Search, Settings } from "lucide-react";
import type { Route } from "./+types/admin.inbox";
import { PushToggle } from "~/components/PushToggle";
import { Ticks, WA, WaAvatar, listTime } from "~/components/wa-ui";
import { requireStaff } from "~/lib/auth.server";
import { vapidPublicKey } from "~/lib/alerts.server";
import { listChats, now } from "~/lib/wa.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "WhatsApp · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const viewer = await requireStaff(request, "inbox");
  const staffId = viewer?.role === "moderator" ? viewer.staffId ?? -1 : null;
  const filter = new URL(request.url).searchParams.get("show") ?? "all";
  const { chats, counts } = await listChats(filter === "unread" ? "all" : filter, staffId, staffId);
  return { filter, chats, counts, owner: !viewer || viewer.role === "owner", moderator: staffId !== null, now: now(), pushKey: vapidPublicKey() };
}

const KIND: Record<string, string> = { guardian: "Guardian", tutor: "Tutor", other: "Other" };

export default function Inbox({ loaderData: d }: Route.ComponentProps) {
  const { revalidate } = useRevalidator();
  const { pathname } = useLocation();
  const [sp] = useSearchParams();
  const [q, setQ] = useState("");
  // New messages show up without a reload while the page is open (the open chat refreshes the list too).
  useEffect(() => {
    if (pathname !== "/admin/inbox") return;
    const id = setInterval(() => document.visibilityState === "visible" && revalidate(), 15000);
    return () => clearInterval(id);
  }, [revalidate, pathname]);

  const chats = useMemo(() => {
    const s = q.trim().toLowerCase();
    return d.chats.filter((c) => (d.filter !== "unread" || c.unread > 0) && (!s || `${c.name ?? ""} ${c.phone ?? ""} ${c.wa_id}`.toLowerCase().includes(s)));
  }, [d.chats, d.filter, q]);

  const chips = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "waiting", label: "Needs you", n: d.counts.waiting },
    ...(d.moderator ? [{ key: "mine", label: "Mine" }] : []),
  ];
  const open = /^\/admin\/inbox\/.+/.test(pathname);
  const keep = sp.toString() ? `?${sp}` : "";

  return (
    <div className="-mx-4 -mt-5 sm:-mx-6 lg:mx-0 lg:-mt-2 lg:grid lg:h-[calc(100dvh-5.5rem)] lg:grid-cols-[minmax(320px,400px)_1fr] lg:overflow-hidden lg:rounded-2xl lg:shadow-ring">
      {/* Chat list */}
      <section aria-label="Chats" className={`flex min-h-dvh flex-col bg-white lg:min-h-0 lg:border-r lg:border-[#e9edef] ${open ? "max-lg:hidden" : ""}`}>
        <header className="sticky top-0 z-20 bg-white px-4 pt-3 pb-2 lg:static">
          <div className="flex min-h-12 items-center gap-1">
            <Link to="/admin" aria-label="Back to admin" className="-ml-2 grid size-11 place-items-center rounded-full text-[#54656f] hover:bg-[#f0f2f5] lg:hidden"><ArrowLeft size={22} /></Link>
            <h1 className="text-[22px] font-bold tracking-tight" style={{ color: WA.green }}>WhatsApp</h1>
            <div className="ml-auto flex items-center gap-1">
              <PushToggle publicKey={d.pushKey} compact />
              {d.owner && (
                <Link to={`/admin/inbox/settings${keep}`} aria-label="WhatsApp settings" className="grid size-11 place-items-center rounded-full text-[#54656f] hover:bg-[#f0f2f5]"><Settings size={21} /></Link>
              )}
            </div>
          </div>
          <label className="mt-1 flex min-h-11 items-center gap-3 rounded-full px-4" style={{ background: WA.bar }}>
            <Search size={18} className="shrink-0 text-[#54656f]" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or number" aria-label="Search chats"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[#111b21] outline-none placeholder:text-[#667781]" />
          </label>
          <nav aria-label="Filter chats" className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
            {chips.map((c) => {
              const on = d.filter === c.key;
              return (
                <Link key={c.key} to={c.key === "all" ? "/admin/inbox" : `/admin/inbox?show=${c.key}`} preventScrollReset aria-current={on ? "page" : undefined}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors"
                  style={on ? { background: WA.chipOn, color: WA.chipOnText } : { background: WA.bar, color: "#54656f" }}>
                  {c.label}{"n" in c && c.n ? <span className="tabular-nums">{c.n}</span> : null}
                </Link>
              );
            })}
          </nav>
        </header>

        {chats.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-[#667781]">
            {q ? "No chat matches." : d.filter === "waiting" ? "কোনো চ্যাট মানুষের উত্তরের অপেক্ষায় নেই।" : d.filter === "unread" ? "No unread chats." : "No WhatsApp chats yet."}
          </p>
        ) : (
          <ul className="flex-1 pb-24 lg:overflow-y-auto lg:pb-2">
            {chats.map((c) => {
              const name = c.name ?? c.phone ?? `+${c.wa_id}`;
              const quiet = (c.ai_paused_until ?? 0) > d.now;
              const unread = c.unread > 0;
              return (
                <li key={c.id}>
                  <NavLink to={`/admin/inbox/${c.id}${keep}`} preventScrollReset
                    className={({ isActive }) => `flex items-center gap-3 px-4 transition-colors hover:bg-[#f5f6f6] ${isActive ? "bg-[#f0f2f5]" : ""}`}>
                    <WaAvatar id={c.id} name={name} urgent={!!c.urgent} />
                    <span className="flex min-h-[72px] min-w-0 flex-1 flex-col justify-center border-b border-[#e9edef] py-2.5">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate text-[16.5px] text-[#111b21]">{name}</span>
                        <span className={`ml-auto shrink-0 text-xs tabular-nums ${unread ? "font-semibold" : ""}`} style={{ color: unread ? WA.green : WA.meta }}>{listTime(c.last_in_at ?? c.last_out_at, d.now)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[14px]" style={{ color: WA.meta }}>
                        {c.last_dir === "out" && <span className="shrink-0"><Ticks status={c.last_status} size={17} /></span>}
                        {c.last_dir === "out" && c.last_sender === "ai" && <Bot size={14} className="shrink-0" aria-label="AI" />}
                        <span className={`truncate ${unread ? "font-medium text-[#111b21]" : ""}`}>{c.last_text ?? ""}</span>
                        {unread && <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[12px] font-bold text-white tabular-nums" style={{ background: WA.badge }}>{c.unread}</span>}
                      </span>
                      {(c.urgent || c.needs_human || c.lead_id || quiet || c.kind !== "unknown" || c.staff_name) && (
                        <span className="mt-1 flex flex-wrap items-center gap-1 text-[11.5px] font-semibold">
                          {c.urgent ? <span className="rounded bg-rose-600 px-1.5 text-white">Urgent</span> : null}
                          {c.needs_human && <span className="rounded bg-[#ffeecd] px-1.5 text-[#7a4b00]">{c.needs_human}</span>}
                          {KIND[c.kind] && <span className="rounded bg-[#f0f2f5] px-1.5 text-[#54656f]">{KIND[c.kind]}</span>}
                          {c.lead_id && <span className="rounded px-1.5" style={{ background: WA.chipOn, color: WA.chipOnText }}>Lead</span>}
                          {quiet && <span className="rounded bg-[#f0f2f5] px-1.5 text-[#54656f]">AI quiet</span>}
                          {c.staff_name && <span className="text-[#667781]">· {c.staff_name}</span>}
                        </span>
                      )}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* The open chat (full screen on a phone) or, on a computer, the empty pane */}
      <Outlet />
    </div>
  );
}
