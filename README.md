# Hikmah Tutors

Admin app and (later) public site for Hikmah Tutors, Rajshahi.
React Router v8 + TypeScript + Tailwind CSS, running on Cloudflare Workers with a D1 database.

## Run it on your computer

Node.js 20+ is needed.

```
npm install                 # once
copy .dev.vars.example .dev.vars   # once: opens the admin pages locally (DEV_ADMIN=1)
npm run db:migrate:local    # once, and after every new file in migrations/
npm run dev                 # http://localhost:5173
```

- Quick Pad (write a guardian request during a call): http://localhost:5173/admin/quick
- All leads: http://localhost:5173/admin/leads

## What works now

- **Quick Pad**: tap chips for class, student, medium, subjects, tutor, area (search in Bangla or English), days,
  salary and lead source. Phone numbers are cleaned automatically (+880…, Bangla digits, dashes).
  Without internet the lead is kept on the phone and sent as soon as the net is back ("⏳ বাকি" badge).
- **Leads list**: newest first, one tap to call or open WhatsApp.

## Not yet

- **Login.** Admin pages only open locally during `npm run dev`. A production build always refuses them, so do not
  deploy for real until Google login is added.
- Cloudflare account: this project uses its own account (not Towfique HSC's). After creating it:
  `npx wrangler login` with that account → `npx wrangler d1 create hikmah` → paste the id and the `account_id` into
  `wrangler.jsonc` → `npm run db:migrate`.

## Folders

```
app/routes.ts          every page and API route
app/routes/            admin.quick.tsx (Quick Pad), admin.leads.tsx, api.leads.ts, home.tsx
app/lib/options.ts     classes, areas, subjects… (labels can change, keys never)
app/lib/lead.ts        validation shared by phone and server
app/lib/lead-queue.ts  offline queue (browser)
app/lib/*.server.ts    database and login code (server only)
migrations/            database tables, applied in order
public/fonts/          Hind Siliguri (same files as Towfique HSC)
```
