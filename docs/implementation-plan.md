# Technical implementation plan

Version: 1.0.0

## Architecture

This scaffold uses dependency-free JavaScript with two execution surfaces:

1. **Node.js core and CLI**
   - Parses approved row data from JSON.
   - Validates row eligibility.
   - Normalizes phone numbers with a configurable country code.
   - Generates message text and a `wa.me` link.
   - Writes JSON and optional CSV outputs under `out/`.
   - Runs locally without Google, WhatsApp, network calls, or credentials.

2. **Google Apps Script adapter**
   - Can be pasted into a Google Sheet.
   - Adds output columns when missing.
   - Generates message/link/status per approved row.
   - Records row-level errors without stopping the batch.
   - Leaves sending fully manual.

## Why no automatic messaging

Automatic messaging would require a different product scope: approved sender account, templates, opt-in/legal basis, tokens, webhooks, logs, retry handling, abuse controls, and human governance.

This scaffold deliberately stops at preparation: it gives a human a message and a link to review and send manually.

## Public repository structure

```text
sheet-assisted-welcome-workflow/
  README.md
  AGENTS.md
  package.json
  config/welcome.config.example.json
  docs/private-configuration.md
  docs/specification.md
  docs/implementation-plan.md
  docs/internal-test-flow.md
  docs/production-handoff.md
  docs/routine-runbook.md
  samples/approved-rows.json
  samples/internal-sheet-test.csv
  scripts/check.sh
  scripts/create-github-repo.sh
  src/core.js
  src/cli.js
  src/apps-script/Code.gs
  tests/core.test.js
```

Private assets, final text, real URLs, real sheet IDs, and deployment evidence must stay outside the public repo.

## Local routine

```bash
npm run check
```

For a real private config and a JSON export:

```bash
node src/cli.js \
  --input /path/to/rows.json \
  --config /path/to/private-config.json \
  --output out/welcome-output.json \
  --output-csv out/welcome-output.csv
```

`out/welcome-output.csv` is intended for easy human review. `out/welcome-output.json` is intended for automation or agent processing.

## Google Sheets flow

1. Start with a test spreadsheet.
2. Install `src/apps-script/Code.gs` through **Extensions → Apps Script**.
3. Keep placeholder config for fictitious testing, or manually enter approved private values.
4. Reload the sheet.
5. Run **Welcome workflow → Generate approved messages**.
6. Confirm counts and output columns.
7. Open generated links only to inspect the prepared message; do not send during tests.

## Validation plan

- `npm test`
- `npm run sample`
- `npm run check`
- syntax-check Apps Script by copying to a temporary `.js` file and running `node --check`;
- scan current tree for forbidden private literals and suspicious secrets;
- after history rewrite, verify `git rev-list --all --count` returns `1` and history scans are clean.

## Blockers

Block production if:

- placeholders remain in production config;
- private config is missing required final values;
- generated text has not been approved by a responsible human;
- the real sheet has not been tested in a copy first;
- any credential or private asset appears in Git;
- a request broadens scope to automatic sending or API integration without a separate reviewed project.
