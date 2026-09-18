# Continuation state

Target: **@mihina_48**. Preserve this project; do not initialize another repository or recreate the UI.

## Completed locally

- React/TypeScript/Vite archive with chronological grouping, filters, search, statistics, responsive layout, keyboard/modal interaction, original-source links, and unavailable-image states.
- Official X full-archive/timeline importer, user lookup, reply/repost/author/own-media filtering, string IDs, pagination, atomic checkpoints, cost approval gates, and incremental updates.
- Fixed resumed updates so an incomplete update can continue with its original `since_id` and does not double-count scanned records.
- 17 offline tests pass. TypeScript and Vite build pass. Production verification correctly rejects the current demo dataset. Browser QA confirmed malformed/empty/broken-image states; desktop/tablet/mobile widths of 1440/1024/390 pixels had no horizontal overflow. Desktop and mobile sticky year jumps and mobile keyboard lightbox controls were verified. These are development-data checks; real-record and deployed-site QA still require the import.
- No live X calls, X charges, real import, GitHub repository, or public deployment yet.

## Required external input

1. X developer app Bearer Token in local ignored `.env` and explicit approval for a capped paid import. Current public list pricing is $0.005 per returned post plus $0.01 per user read; confirm the console rates and endpoint entitlement. Account existence, public status, ID, and accessible volume are unverified until authorized lookup.
2. GitHub authorization to create/reuse `x-visual-archive` and push the existing source repository.
3. Cloudflare authorization to inspect/reuse or create the Pages project and publish the reviewed real-data build.

The final public site MUST contain real imported records. Do not publish the demo. Use `npm run deploy`, which validates real data before and after building. Do not bypass this gate with direct uploads of the development build.

## Resume sequence

After X credentials and cost approval are supplied, set the approved local budget, run the existing fetch command, verify the exact username and returned user ID, process every accessible page within the approved budget, then inspect real recent/old/single/multiple/portrait/landscape records. Document any official endpoint restriction and actual dates/counts. If the approved budget runs out, retain the checkpoint and request only the additional necessary cost approval.

Resolve X display/content-maintenance and bulk-data distribution requirements for the intended public use. Remote image references alone do not detect a deleted post while its CDN image remains available.

After account authorizations, inspect for existing remote repository/Pages resources before creating anything. Build with `npm run build:production`, publish, then verify the live site on desktop/tablet/mobile. Do not claim completion until real data and public deployment are verified.

## Local environment notes

The runtime supplies Node but not a normal npm command on PATH. An npm CLI was installed in the task's `work/tooling/node_modules/npm/bin/npm-cli.js`; invoke with Node if needed. Normal users with Node installed can use the documented npm commands.

GitHub CLI is under task `work/github-cli/bin/gh.exe`. The previous web login timed out; it was not authenticated. The Cloudflare device authorization expired without user action. Its working configuration directory is task `work/cloudflare-auth`; do not expose or commit authentication files. No tokens were provided.

The production fixture server (`node tests/fixture-server.mjs`, localhost:5174) supports `?fixture=malformed`, `?fixture=empty`, and `?fixture=broken` for local browser QA only. These fixtures are not part of the deployed build.
