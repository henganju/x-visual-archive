# X Visual Archive

Live: **https://x-visual-archive.pages.dev** · Curator: **https://x-visual-archive.pages.dev/curate** · Source: **https://github.com/henganju/x-visual-archive**

A curated visual diary for **@mihina_48**. Built with React and TypeScript, preserving the original editorial archive design.

## Add posts

Open `/curate`, sign in, and paste public X post links, one per line. Review that they belong to @mihina_48 and contain their own photos, then click **Import posts**. Hundreds of links can be submitted together; duplicates are skipped. New entries appear publicly without rebuilding or redeploying.

You can hide entries, remove entries with confirmation, export a lightweight JSON backup, and safely merge that backup later. Removing an archive entry never deletes a post on X. Notes in imported backups are public when the entry is visible.

## Free architecture

Browser → Cloudflare Pages frontend → Pages Function → Cloudflare D1 metadata.

Official X widgets load the original public posts directly from X. No paid X API, bearer token, scraping, photo downloads, or mirrored image storage is used. Compact mode displays only the date, ID, note, and source link. Full mode connects to X, which may use its own cookies; widgets request `dnt: true`.

The archive is a curated index, not an automatic or complete account-history download. A URL can contain an incorrect username, so the curator must verify authorship and photographs. Embeds can be blocked or unavailable; each card retains its original link and a retry state. Photo counts, image lightboxes and post-text search are intentionally unavailable because that information is not retrieved. Search covers dates, IDs and curator notes.

Dates use the X Snowflake timestamp (`(id >> 22) + 1288834974657` milliseconds) with BigInt, based on [Twitter's published Snowflake implementation](https://github.com/twitter-archive/snowflake/blob/snowflake-2010/src/main/scala/com/twitter/service/snowflake/IdWorker.scala). Dates are displayed in UTC. Older/undecodable IDs require a manual date. IDs remain strings throughout.

## Run locally

Use Node.js 22.18+ (24 recommended):

```sh
npm install
npm run dev
```

Open the address printed by Vite. First launch creates a random local curator password in `.dev.vars`. Open that file locally to read it; never commit or share it. Local metadata is saved in `.state/curated.sqlite` across restarts. This is separate from the deployed D1 database.

```sh
npm test
npm run build
npm run verify:production
```

The existing photo/archive and importer regression tests remain. Historical API code is locked to an offline mocked test harness; running it directly cannot make live requests. `npm run fetch:x` and `npm run update:x` now direct you to `/curate` and make no X requests. Demo files are excluded from the production build.

## Deploy on Cloudflare Free

Use a Cloudflare account on **Workers Free**, not a paid subscription. Create a Pages project named `x-visual-archive` and a D1 database named `x-visual-archive-db`. Apply `migrations/0001_archive.sql`, bind that database as `DB` in the Pages project, and set the encrypted Pages secret `ADMIN_PASSWORD` to a unique password of at least 16 characters. Deploy the `dist` directory with Wrangler after running `npm run build:production`.

The deployed database binding is recorded in `wrangler.jsonc`. After signing in with Wrangler, run `npm run deploy` for frontend changes; normal curator imports never require deployment. No domain, paid plan or credits are needed. Curator authentication uses random server-side sessions, HttpOnly SameSite cookies, origin checks, parameterized SQL and login throttling. Curator pages carry noindex directives. Keep exported backups somewhere private: they include hidden entries as well as visible ones.

Official limits checked September 19, 2026: [Pages Functions](https://developers.cloudflare.com/pages/functions/pricing/) use Workers quotas (Free: 100,000 requests/day shared with your other Workers). [D1 Free](https://developers.cloudflare.com/d1/platform/pricing/) includes 5 million rows read/day, 100,000 rows written/day and 5 GB total storage. Within those free quotas, hosting and storage cost $0; X API cost is $0 because no API is used. Free quota exhaustion can make the archive temporarily unavailable. Do not upgrade to a paid plan to bypass limits. The site reads metadata from D1; it is no longer a purely static JSON site, as required by the new live-curation workflow.

Public assets are static and `/api/*` alone invokes the Pages Function. Public requests never query a paid X API. Database migrations are explicit, not run on production visitor requests.

## Sources and permissions

[X's official embedding instructions](https://help.x.com/en/using-x/how-to-embed-a-post) describe the supported media embed mechanism. Content remains with X and its authors; this project claims no ownership. Do not use the curator to recover deleted, private or inaccessible content. The UI does not identify whether a failure means deletion, account restriction or browser blocking.
