# Sheet-assisted welcome workflow

This repository is a generic scaffold for preparing welcome messages from approved spreadsheet rows.

It does **not** send WhatsApp messages, does **not** use the WhatsApp Business API, and does **not** store credentials. It generates reviewable message text, a `wa.me` link, and status/output fields so a human can review and send manually.

## For clients and operators

1. Keep real client/project details outside this public repository.
2. Give your implementation agent this repository plus the Google Sheet/test copy and any simple PDF/document/model message you want used.
3. Tell the agent: **read `AGENTS.md` and guide me through installation and testing**. The agent should create any JSON/config files it needs; the operator should not have to author JSON.

## Quick local check

```bash
npm run check
```

Expected result:

- tests pass;
- preview files are created for agent/operator review;
- no external API is called;
- no message is sent.

## What belongs outside this repository

Use a private handoff file, Google Sheet/test copy, PDF/model document, or manual setup step for:

- real organization/project names;
- final document/video/form URLs;
- production spreadsheet IDs or tab names;
- approved final text, signatures, contacts, or addresses;
- any credentials, tokens, cookies, OAuth secrets, or private logs.

See `docs/private-configuration.md` and `AGENTS.md` for the full deployment path.
