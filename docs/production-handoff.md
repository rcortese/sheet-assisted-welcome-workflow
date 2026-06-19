# Production handoff

This document describes how to move the generic scaffold into a real deployment without contaminating the public repository with private details.

For agent-assisted deployment, start with:

```text
AGENTS.md
docs/internal-test-flow.md
docs/private-configuration.md
```

## What already works

- Local generation of message text.
- Local CSV/JSON preview output for agents/operators.
- `wa.me` link preparation for manual sending.
- Filtering by validation status.
- Blocking rows already sent/cancelled.
- Row-level error recording.
- Google Apps Script adapter for Sheets.
- Fictitious samples and automated tests.

## What must be supplied privately

Before production, collect approved private values outside Git. The source of participant data is the operator's Google Sheet; prefer practical operator inputs — sheet/test copy, PDF/model message, links, and short answers — rather than asking the operator to write config/JSON:

- final organization/project display names;
- final welcome document URL;
- final orientation video URL;
- final context brief URL;
- final quick guide URL;
- final follow-up form URL;
- final footer/signature text;
- real spreadsheet/copy details;
- any final human approval notes.

Do not put those values in the public repo or commit them later.

## Columns recommended in the sheet

| Column | Purpose |
|---|---|
| `record_id` | Unique row/person/process ID. |
| `nome` or `name` | Person's display name. |
| `telefone`, `whatsapp`, or `phone` | Number used for `wa.me` link generation. |
| `funcao`, `cargo`, or `role` | Role/participation shown in message. |
| `responsavel` or `owner` | Optional internal owner. |
| `status_validacao` | Must indicate internal approval. |
| `status_boas_vindas` | Prevents regeneration after sending/cancellation. |
| `mensagem_boas_vindas` | Created by the script. |
| `link_whatsapp` | Created by the script. |
| `boas_vindas_gerada_em` | Generation timestamp. |
| `erro_boas_vindas` | Row-level generation error. |

The Apps Script creates the output columns automatically if missing.

## Production deployment sequence

1. Run `npm run check` locally.
2. Verify the Google Sheet/test copy headers and run `docs/internal-test-flow.md` in a test spreadsheet.
3. Prepare the private config values outside Git.
4. Back up or copy the real spreadsheet.
5. Install Apps Script in the copy first.
6. Insert approved private config values into `WELCOME_CONFIG` in the Apps Script editor.
7. Run a tiny controlled slice.
8. Review generated messages and links manually.
9. Confirm no placeholders remain.
10. Confirm no automatic sending/API integration was added.
11. Only then repeat on production.
12. If a recurring routine is desired, require a fresh preview review and explicit `ROUTINE_APPROVED=true` before creating any scheduled trigger, cron job, or recurring agent run.

## Authentication and access

If the deployment agent has authorized direct access, it should still use a copy first and avoid recording credentials anywhere.

If access is operator-guided, the operator should authenticate through official Google UI prompts. The agent may ask for aggregate results, headers, screenshots with private data redacted, or error text, but must not ask for tokens, cookies, passwords, or secrets.

## Acceptance checklist

- [ ] `npm run check` passed.
- [ ] Internal sheet test passed.
- [ ] Script installed in a copy/test sheet first.
- [ ] Private config values are final and approved.
- [ ] No placeholders remain in production config.
- [ ] Generated text is approved by a responsible human.
- [ ] At least one approved test row generates message/link.
- [ ] Pending row does not generate.
- [ ] Already-sent/cancelled row does not regenerate.
- [ ] Invalid phone row records an error without aborting the batch.
- [ ] Human sender understands sending is manual.
- [ ] No WhatsApp API, webhook, token, or automatic sending was added.
- [ ] If routine setup was requested, `ROUTINE_APPROVED=true` was explicitly provided after a fresh preview review.

## Known limitations

- Does not send WhatsApp automatically.
- Does not validate whether the phone number exists on WhatsApp.
- Does not read Google Forms directly; it operates on spreadsheet rows.
- Does not require the operator to maintain JSON; JSON is only an optional agent/export format for local CLI runs.
- Does not store delivery confirmation; the human process must update status after sending.

## Future automation

If automatic sending is required later, create a separate reviewed project with legal/operational approval, official sender account, templates, opt-in policy, token storage, webhook/logging design, rate limits, retries, and rollback controls.
