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

## 1. Google sign-in on the live site: done

Set up on 2026-11-03: both owner emails are test users (Testing mode), the live client "Hikmah live" exists,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (set by the owner with `node scripts/set-google-secret.mjs`) and
`OWNER_EMAILS` are on Cloudflare. Checked: signing in with Google on the live site lands on `/admin` with the real
data. Before tutors are invited, make a fresh client secret (the first one was shown in a chat) and run the same
command again.

## 2. Photos: done

Done on 2026-11-03: the Apps Script copied photos and documents into the two private Drive folders, and 1,421 of
1,422 photos are in the `hikmah-photos` bucket and linked to their tutor (iPhone HEIC photos converted). One tutor
sent a PDF as their photo and has none. Documents stay in Drive until the verification feature.

For new photos later: put them in `imports/photos/` as `T1234.jpg` and run `npm run photos:upload-real` (safe to run
again; it skips photos already up and finishes ones that failed).

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

## 5. The domain: hikmahtutor.com

Bought by the owner (2026-11-04); its nameservers point to Cloudflare. **Live since 2026-11-04**: `wrangler.jsonc`
attaches it (and www, which redirects to it) to the Worker, and migrations 0008–0010 are on the real database. Still to
do: in Google Cloud, on the "Hikmah live" client, add:

- Authorised JavaScript origins: `https://hikmahtutor.com`
- Authorised redirect URIs: `https://hikmahtutor.com/auth/google/callback`

Then sign in on `https://hikmahtutor.com/login` and check it lands on `/admin`.

## Before tutors are invited (later)

Publish the consent screen (in Testing mode only the test users can sign in) and make a fresh client secret.
