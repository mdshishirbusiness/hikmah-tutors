# Going live: steps for the owner

The plan behind these steps is in `docs/DECISIONS.md` (2026-11-03). Claude has built and tested everything up to here;
the steps below need your accounts, so only you can do them. Run every command in the app's **Terminal panel**, in the
project folder, and start each session with:

```powershell
npx wrangler whoami
```

It must show the Hikmah email and account `30ae03db…`. If not, run `npx wrangler login` with the Hikmah
email first.

Already done (2026-11-03): the real database has every table (migrations 0001–0006), and a backup restore was tested
on it (Time Travel restore + an export that rebuilds cleanly).

## 1. Turn on R2 (for tutor photos)

1. Open dash.cloudflare.com with the Hikmah email → **R2 Object Storage** → enable it. The free tier (10 GB) is far
   more than ~1,500 small photos (about 30 KB each). Cloudflare may ask for a card even for the free tier.
2. Then, in the Terminal panel:

```powershell
npx wrangler r2 bucket create hikmah-photos
```

The bucket stays private: nothing in it is public. Photos are served only to you and to the tutor themself.

## 2. Try Google sign-in on your computer with your real account

This is the check `CLAUDE.md` asks for before any deploy.

1. In `.dev.vars` (on your computer only), set `DEV_ADMIN=0` and
   `OWNER_EMAILS=` followed by your two owner emails, separated by a comma, no spaces.
2. `npm run dev`, open http://localhost:5173/login and sign in with Google.
3. You should land on `/admin`. Sign out, then sign in with a Gmail that is *not* an owner: it must not reach `/admin`.
4. Put `DEV_ADMIN=1` back afterwards if you like the shortcut while developing.

## 3. Make the live Google client

In Google Cloud, project **Hikmah Tutors** → APIs & Services:

1. **OAuth consent screen**: leave it in **Testing**. Add both owner emails under **Test users**. (Only test users can
   sign in while it is in Testing; that is what we want until tutors are invited.)
2. Find your workers.dev address: Cloudflare dashboard → **Workers & Pages** → the right side shows
   `<your-subdomain>.workers.dev`. The site will be `https://hikmah-tutors.<your-subdomain>.workers.dev`.
3. **Credentials → Create credentials → OAuth client ID → Web application**, name it "Hikmah live".
   Authorized redirect URI: `https://hikmah-tutors.<your-subdomain>.workers.dev/auth/google/callback`
4. Keep the new Client ID and Client secret open for the next step. Don't paste them into the chat or any file.

## 4. Give the live site its settings

Each command asks you to paste a value. If it asks to create the Worker, say yes.

```powershell
npx wrangler secret put GOOGLE_CLIENT_ID
```
```powershell
npx wrangler secret put GOOGLE_CLIENT_SECRET
```
```powershell
npx wrangler secret put OWNER_EMAILS
```

For `OWNER_EMAILS` paste your two owner emails, separated by a comma, no spaces.

## 5. Update the database and deploy

```powershell
npm run db:migrate
```
```powershell
npm run deploy
```

Open the address, go to `/login`, sign in. You should see `/admin`. The public board will be empty: imported tuitions
start hidden.

## 6. Load the sheet

1. Download fresh CSVs of the four tabs (Admin Pannel 1, Tuition Admin Panel, Registration, Application) into
   `imports/sheet/`, replacing the old ones.
2. Check them (changes nothing): `npm run import:dry-run`
3. First full load. It saves a backup to `imports/backups/` first, and refuses to run if anything was loaded before:

```powershell
npm run import:load-real
```

It prints what it added and the batch number. If something looks wrong:
`node scripts/import/load.mjs --remote --undo-batch <number>`

## 7. Photos

1. Open the Mastersheet → Extensions → Apps Script, paste `scripts/tutor-files.gs`, run `copyTutorFiles`. It copies
   photos to the Drive folder "Hikmah tutor photos" as `T1234.jpg`, and documents to a separate private folder. It
   restarts itself until done (check Executions).
2. Download the "Hikmah tutor photos" folder, unzip it into `imports/photos/`.
3. `npm run photos:upload-real` (safe to run again; it skips photos already up).

## 8. Review

Open `/admin/review`. Three lists: tutors to check (shared phone, broken email), open tuitions to finish and publish,
and sheet rows still held back. Old tuitions and unmatched applications need nothing.

## 9. Until cutover: top-ups

Whenever the forms bring new registrations or applications: download fresh CSVs, then

```powershell
npm run import:top-up-real
```

It adds only new rows; nothing you reviewed or edited changes. On cutover day run one last top-up, close the Google
Forms (or point them to the site), and keep the sheet as a read-only archive.

## Before tutors are invited (later)

Buy the domain, add it to the Worker, add its callback to the Google client, and publish the consent screen.
