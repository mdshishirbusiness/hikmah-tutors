# Going live: steps for the owner

The plan behind these steps is in `docs/DECISIONS.md` (2026-11-03). Claude has built and tested everything up to here;
the steps below need your accounts, so only you can do them. Run every command in the app's **Terminal panel**, in the
project folder, and start each session with:

```powershell
npx wrangler whoami
```

It must show the Hikmah email and account `30ae03db…`. If not, run `npx wrangler login` with the Hikmah
email first.

## Done (2026-11-03)

- Real database: every table (migrations 0001–0007); a backup restore tested on it (Time Travel restore, and an export
  that rebuilds cleanly).
- R2 turned on (owner) and the private bucket `hikmah-photos` created.
- **The sheet is loaded into the real database**: first full load from the 3 Nov CSVs, batch `1793655251` (1,451
  tutors, 613 tuitions, 10,216 applications, 266 placements; 4 tutors flagged, 74 rows held). A backup was saved first.
  From now on use only the top-up (step 4).
- Google sign-in tried with the owner's real account on localhost: signing out locks `/admin`, signing in with Google
  lands on `/admin` as owner. `.dev.vars` lists both owner emails. (Not yet tried: a non-owner Gmail.)
- The photo script runs in the Mastersheet's Apps Script project (you allowed it) and copies into Drive folders.
- **The site is deployed: https://hikmah-tutors.hikmahtutor.workers.dev** (board public and empty until you publish
  tuitions; admin, review and photos need sign-in).

## 1. Give the live site its Google secret (one command)

Done by Claude on 2026-11-03: both owner emails are test users on the consent screen (Testing mode); the live client
"Hikmah live" exists with the callback `https://hikmah-tutors.hikmahtutor.workers.dev/auth/google/callback`;
`GOOGLE_CLIENT_ID` and `OWNER_EMAILS` are set on Cloudflare; the site is deployed.

Left for you: the client secret. Google's file for it is in your Downloads (`client_secret_725965718233-kim5…json`).
Run this in the Terminal panel; it reads that file, sets the secret on Cloudflare, and deletes the file, so the secret is
never typed or shown:

```powershell
node scripts/set-google-secret.mjs
```

Then open https://hikmah-tutors.hikmahtutor.workers.dev/login and sign in with Google. You should land on `/admin`.
No redeploy is needed. Google may take a few minutes to accept a new client.

## 2. Photos

1. Running (you allowed it on 2026-11-03): the Apps Script copies photos into the Drive folder "Hikmah tutor photos"
   as `T1234.jpg` and documents into a separate private folder, restarting itself every few minutes until done (about
   two hours; Apps Script → Executions shows "Done"). Some tutors uploaded a PDF as their photo; those are skipped.
2. Download the "Hikmah tutor photos" folder, unzip it into `imports/photos/`.
3. `npm run photos:upload-real` (safe to run again; it skips photos already up).

## 3. Review

Open `/admin/review`. Three lists: tutors to check (shared phone, broken email), open tuitions to finish and publish,
and sheet rows still held back. Old tuitions and unmatched applications need nothing.

## 4. Until cutover: top-ups

Whenever the forms bring new registrations or applications: download fresh CSVs, then

```powershell
npm run import:top-up-real
```

It adds only new rows; nothing you reviewed or edited changes. On cutover day run one last top-up, close the Google
Forms (or point them to the site), and keep the sheet as a read-only archive.

## Before tutors are invited (later)

Buy the domain, add it to the Worker, add its callback to the Google client, and publish the consent screen.
