# X Visual Archive

A quiet photographic archive designed for **@mihina_48**. React, TypeScript, and Vite turn a local JSON collection into an editorial, responsive website. No visitor request calls the X API.

**Current development dataset: demo-only; production is not ready.** It contains 63 fictional posts and 126 photo records across five years and 20 months, using credited Lorem Picsum / Unsplash photographs. These are not @mihina_48's photographs or actual X posts. Some images repeat and portrait crops are used for layout testing. No X data has yet been imported. The deployment command now refuses demo data, incomplete imports, placeholder IDs, non-X images, and inconsistent statistics. A demo must never be delivered as the final public site.

## How it works

```text
Manual importer on your computer → official X API → local JSON
                                                     ↓
                                  Vite production build → Cloudflare Pages
                                                     ↓
                                       Browser loads static JSON + remote images
```

There is no database, backend, scheduled job, paid image mirror, analytics, or automatic sync. Image files remain at their original hosts. Hosting can use Cloudflare Pages' free plan; free-plan limits and third-party media availability still apply. Manual API imports and content-maintenance checks may cost money. A one-time import does not guarantee permanent compliance with X's update and deletion requirements.

## Run locally

Install current Node.js LTS (version 22.18 or newer), then open a terminal in this folder:

```sh
npm install
npm run demo
npm run dev
```

Open the local address printed in the terminal. `npm run demo` replaces the local dataset with demo data; do not run it over a real archive you want to retain. Public archive JSON files are intentionally excluded from Git so real account content is not accidentally published in a repository. The demo generator and source attribution list are committed.

```sh
npm test          # unit and isolated importer integration tests; no live X requests
npm run build    # TypeScript check + local QA build in dist/ (may use demo)
npm run preview  # inspect the production build locally
npm run build:production # real-data validation + build + output validation
```

The project uses the WebAssembly build of esbuild for compatibility with restricted Windows environments. It changes build tooling only, not the hosted architecture.

## Import X data — only after approving the cost

1. Create or use an approved developer app in the [X Developer Console](https://console.x.com). It must have official read access and, for complete history, access to full-archive search.
2. Copy `.env.example` to `.env`. Put the app's **Bearer Token** in `X_BEARER_TOKEN`. Do not paste the token into source code, GitHub, a browser URL, or a public message. Never rename it with a `VITE_` prefix.
3. Review current console pricing, set a console spending limit, and leave auto-recharge disabled. A positive balance may be required. Nothing in this project buys credits.
4. After personally approving a budget, set `X_APPROVE_PAID=true` and `X_MAX_COST_USD` to that budget in `.env`.
5. Run `npm run fetch:x`.

The importer refuses to make even the user-lookup request until both a credential and explicit paid-access approval are present. The limit is a conservative client-side reservation based on the configured rates, not a guarantee about X billing. Confirm those rates before each import; X's console limit is the provider-side control.

```sh
npm run fetch:x   # first import; rerun this same command to resume
npm run update:x  # retrieve only newer matches after a completed initial import
```

Configuration lives in `archive.config.json`. The supplied account is normalized from `@mihina_48 ` to `mihina_48`. `includeReplies` defaults to false. This edition is intentionally scoped to that account.

The default source is **full-archive**: `GET /2/tweets/search/all`, with `from:mihina_48 has:images -is:retweet -is:reply`, a start date in March 2006, and `meta.next_token` passed as `next_token`. Only matching results returned by X are counted as scanned; this is not a count of every text/video post ever made. Photo ownership is verified again against the parent post's own `attachments.media_keys`. Quoted users' attachments are never expanded.

An optional `timeline` source uses `GET /2/users/:id/tweets`, passing `meta.next_token` as `pagination_token`. It excludes reposts on the server but filters replies locally because X documents a lower history cap when `exclude=replies` is used. Timeline mode is not a full-history substitute. The source will never switch automatically into a more expensive endpoint.

The script resolves `GET /2/users/by/username/mihina_48` and stores only ID, handle, display name, avatar, and necessary public-status checks. Post fields include original text, entities, author ID, date, edit indicator, references, and attachment keys. Media fields include type, URL, dimensions, and alt text. Video-only/GIF-only posts, other authors, reposts, withheld records, and (by default) replies are rejected. One post contains an array of its photos.

Each successful page saves one canonical `.state/` checkpoint, including records, token, page number, scanned IDs, fixed update watermark, and cumulative cost reservation. Public JSON is rebuilt from that checkpoint. IDs remain strings to avoid numerical rounding. Records are deduplicated by ID. Network errors, rate limits, denied access, partial responses, malformed responses, and repeated pagination tokens stop with a readable explanation. Fix the cause and rerun; there are no hidden charged retries.

The request's configured maximum post cost is reserved **before** it is sent. Failed or interrupted calls retain their reservations, including across restarts. This deliberately overestimates spend rather than risking an unapproved overrun at those rates. Budgets apply to one initial import or one update cycle, including resumptions. A later update cycle starts a new budget; running it is a fresh manual paid operation. Provider-side spending limits remain necessary because rates or additional billing rules can change. A process lock prevents concurrent imports and is recovered automatically when its process no longer exists.

Updates freeze `since_id` throughout pagination and merge into existing data. The latest hour is deferred to reduce the chance of publishing a post while it is still being edited; a later update retrieves it. Updating only new posts does **not** detect older deletions or edits. Keep `.state/` locally; do not commit it. Do not change source/configuration midway through a checkpoint.

## Official platform limits and pricing

Verified against current official documentation on **September 18, 2026**:

- [Pricing](https://docs.x.com/x-api/getting-started/pricing): ordinary Post reads **$0.005/resource**, User reads **$0.010/resource**. At these listed rates, 1,000 returned posts plus one user lookup is about **$5.01**. Full historical volume is unknown until authorized queries are made. Count queries can themselves cost money. Expansion billing/your app's current terms should be confirmed in the console before approval. No exact total is promised.
- [Search](https://docs.x.com/x-api/posts/search/introduction): full-archive search is available to pay-per-use and Enterprise customers, with history back to March 2006. This does not recover private/deleted content or guarantee every historical post remains indexed.
- [Timeline limits](https://docs.x.com/x-api/posts/timelines/integrate): up to **3,200 recent posts**, or **800 when replies are excluded server-side**. This is why full-archive search is the default here.
- [Pagination](https://docs.x.com/x-api/fundamentals/pagination): follow returned continuation tokens until absent. Rate limits and available credit can interrupt the process.
- [Display requirements](https://docs.x.com/developer-terms/display-requirements): a public photo display needs appropriate author/avatar attribution, original text and linked entities, timestamp/permalink, X source branding, and a View on X link. Real-data cards and detail views include these. Demo cards are explicitly separate from actual X posts.
- [Developer policy](https://docs.x.com/developer-terms/policy): stored/displayed content must reflect edits, deletion, protection, suspension, and withholding; requests from X or the account owner require action within the specified time, commonly within 24 hours after receipt. The policy also restricts redistribution of full content objects. **A publicly downloadable bulk `archive.json` and a never-refreshed permanent archive should not be assumed permitted.** Resolve the proposed display/distribution use under the app's terms and obtain any required permission before publishing real content. No demo deployment is an acceptable substitute for the requested real archive.

No account credentials or entitlement were available during construction. No live user lookup, historical import, or charged X request has been performed. Consequently account existence, public status, full-history entitlement, accessible counts, and final price remain unverified.

## Content maintenance and broken images

Broken remote images become an “Image unavailable” panel; the project never attempts to recover deleted/private media. A still-working CDN URL does not prove its original post is still available. Maintaining a real public archive requires a deletion/edit handling process or platform permission for the proposed static use. New-post sync alone is insufficient. If a removal is needed, remove the post from both the local dataset and checkpoints, rebuild, redeploy, and purge affected caches. A public repository should contain source and demo-generation code, not real X object dumps or credentials.

## Deploy free on Cloudflare Pages

The site has no Workers functions, database, or server runtime. Deploy only `dist/`.

```sh
npx wrangler login
npx wrangler pages project create x-visual-archive --production-branch main
npm run deploy
```

Cloudflare login/authorization must be completed by the account owner. If that project name is unavailable, choose an available name and update the deploy script. Use the free Pages plan; do not add a domain, paid Workers plan, database, or image hosting. A `pages.dev` address is sufficient. After each approved data update, run `npm run build` and redeploy. Visitors then read the newly published static files.

Use a reviewed local real-data build and direct upload to Pages. Do not configure a production build that runs `npm run demo`. The deploy command runs `build:production` before uploading. Never configure automatic paid fetches or put a Bearer Token in frontend build variables. Before project creation, check the authenticated Cloudflare account for an existing `x-visual-archive` project and reuse it.

## Project map

```text
src/                    responsive archive, validation, filters, viewer
scripts/createDemo.ts   reproducible demo and photographer credits
scripts/fetchArchive.ts credential/cost gates, resumable import and updates
scripts/x-core.ts       official endpoint construction and photo filtering
tests/                  offline unit and importer integration tests
public/data/            generated archive.json and archive-meta.json
.state/                 private local checkpoints and test fixtures (ignored)
dist/                   generated static site for deployment (ignored)
```

## Interaction and privacy

Search works locally over text, year, and month. Filters combine year/month/single-or-multiple photos; sorting supports both directions. The chronological grid groups photographs by post. Open a cover image to browse its photos or move across the filtered collection. Arrow keys navigate, Escape closes, and the modal keeps focus inside and returns it on close. Reduced-motion preferences are respected.

No visitor account, cookies, analytics, or database is used. The browser contacts image providers and Google Fonts, which receive normal web request information; follow their respective privacy policies. X credentials never enter the frontend.
