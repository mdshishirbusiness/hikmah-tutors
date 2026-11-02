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
  From now on use only the top-up (step 6).
- Google sign-in tried with the owner's real account on localhost: signing out locks `/admin`, signing in with Google
  lands on `/admin` as owner. `.dev.vars` lists both owner emails. (Not yet tried: a non-owner Gmail.)
- The photo script is pasted into the Mastersheet's Apps Script project and waits for your permission (step 4).
- Your workers.dev subdomain is `hikmahtutor`, so the site will be **https://hikmah-tutors.hikmahtutor.workers.dev**.

## 1. Make the live Google client

In Google Cloud, project **Hikmah Tutors** → APIs & Services:

1. **OAuth consent screen**: leave it in **Testing**. Add both owner emails under **Test users**. (Only test users can
   sign in while it is in Testing; that is what we want until tutors are invited.)
2. The site will be `https://hikmah-tutors.hikmahtutor.workers.dev`.
3. **Credentials → Create credentials → OAuth client ID → Web application**, name it "Hikmah live".
   Authorized redirect URI: `https://hikmah-tutors.hikmahtutor.workers.dev/auth/google/callback`
4. Keep the new Client ID and Client secret open for the next step. Don't paste them into the chat or any file.

## 2. Give the live site its settings

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

## 3. Deploy

Tell Claude the secrets are set; Claude deploys (`npm run deploy`) and checks the site. Or run it yourself:

```powershell
npm run deploy
```

Open the address, go to `/login`, sign in. You should see `/admin`. The public board will be empty: imported tuitions
start hidden until you review and publish them.

## 4. Photos

1. Already pasted: in the Mastersheet → Extensions → Apps Script ("Untitled project"), press **Run** with
   `copyTutorFiles` selected, then allow Google's permission window (Advanced → Go to the project → Allow; it is your
   own script). It copies
   photos to the Drive folder "Hikmah tutor photos" as `T1234.jpg`, and documents to a separate private folder. It
   restarts itself until done (check Executions).
2. Download the "Hikmah tutor photos" folder, unzip it into `imports/photos/`.
3. `npm run photos:upload-real` (safe to run again; it skips photos already up).

## 5. Review

Open `/admin/review`. Three lists: tutors to check (shared phone, broken email), open tuitions to finish and publish,
and sheet rows still held back. Old tuitions and unmatched applications need nothing.

## 6. Until cutover: top-ups

Whenever the forms bring new registrations or applications: download fresh CSVs, then

```powershell
npm run import:top-up-real
```

It adds only new rows; nothing you reviewed or edited changes. On cutover day run one last top-up, close the Google
Forms (or point them to the site), and keep the sheet as a read-only archive.

## Before tutors are invited (later)

Buy the domain, add it to the Worker, add its callback to the Google client, and publish the consent screen.
