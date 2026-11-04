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

Then sign in on `https://hikmahtutor.com/login` and check it lands on `/admin`. Done 2026-11-04: both added to the
client, and signing in on the domain lands on `/admin`. The workers.dev address is now off; the site is only at
`https://hikmahtutor.com`.

## 6. The 4 Nov design and workflow update: live

**Live since 2026-11-04** (version `ff6af485`): migrations 0011 and 0012 are on the real database, then the deploy.
Checked: public pages 200, `/admin` and `/me` pages redirect to log in. For a later update, the same order in the
Terminal panel (after `npx wrangler whoami` shows the Hikmah account), because new pages read new columns:

```powershell
npm run db:migrate
npm run deploy
```

`db:migrate` adds migrations 0011 (tutor About, updates seen) and 0012 (check-in calls, do-not-place flags, notices,
referrals). Both only add columns and tables; nothing existing changes.

## 7. Site review steps 1 and 2

- **Step 1** (phone menu, Log in button, clean logo, page loader, Quick Pad search): **live since 2026-11-04**, version
  `8ef1aac3`. No database change.
- **Step 2** (tutors register on the site; the owner approves): **live since 2026-11-04**, version `f53e5328`, after
  migration 0013. Checked: all 1,451 existing tutors count as approved; public pages 200, tutor and admin pages ask
  for log in, `/dev/new/1` is 404 on the live site. For a later update, the same order in the Terminal panel (after
  `npx wrangler whoami`):

```powershell
npm run db:migrate
npm run deploy
```

After it is live, close the old Google Form, or point it to `https://hikmahtutor.com/login?join=1`. Keep running
`npm run import:top-up-real` until the form is closed, so late form entries still arrive.

## 8. Site review step 3 and part A

**Live since 2026-11-05**, version `de3cc46d`, after migration 0014 (optional columns on leads and tuitions).
Includes:
- the shared request fields (class and medium dropdowns, subjects tick list, time window, address details for the
  Selected tutor, requirement picks, RC/VU)
- part A: Bangla reasons, typed lowest salary, new section headings

Checked: public pages 200, admin and tutor pages ask for log in, the guardian form shows the new fields.

## 9. Parts B and C (tutor Profile and experience; applicants ranked by Strength)

**Live since 2026-11-05**, version `245583df`, after migrations 0015 and 0016. Checked:
- Prefilled from the sheet on the real database: Junior 1,023 tutors (944 with "how I teach", 812 with a story), SSC
  1,000 (967 / 695), HSC 770 (746 / 446).
- Public pages 200; admin and tutor pages ask for log in.

Part C needs no database change of its own; it reads what B adds. For the record, part B's steps were:

Needs migrations 0015 and 0016 first. `npm run db:migrate` runs both.
- 0015 adds `tutor_levels`, prefilled from the sheet's statements (about 1,000 tutors per level on the local copy),
  and the skills and demo-video columns.
- 0016 adds `tutor_students`, the students a tutor has taught.

Nothing existing changes. Then the deploy.

## 10. Part D (follow-ups, notes, Today in Bangla, donuts)

Needs migration 0017 first (two new tables: `followups` and `contact_notes`; nothing existing changes), then the
deploy: `npm run db:migrate`, then `npm run deploy`, in the Terminal panel after `npx wrangler whoami`.

## Before tutors are invited (later)

- Consent screen: **published (In production), 2026-11-04**. Branding has the home, privacy and terms links; no
  logo, so no Google verification is needed. Any Google account can sign in now.
- Fresh client secret: **done 2026-11-04**. New secret set on Cloudflare with `node scripts/set-google-secret.mjs`,
  sign-in checked on the site, old secret (`YF5-`) disabled and deleted. The owner accepted that the new secret was
  seen in a Claude chat. To rotate again: **Add secret** on the "Hikmah live" client, download the JSON, run the
  script in the Terminal panel, check sign-in, then disable and delete the old one.
