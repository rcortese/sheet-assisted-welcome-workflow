# Routine runbook

This runbook is for turning the scaffold into a repeatable local or agent-driven routine after the first deployment is validated.

Do not treat a successful manual run as approval to schedule a routine. A routine needs an explicit operator approval flag after a fresh preview review: `ROUTINE_APPROVED=true`.

## Inputs

A routine needs:

- a Google Sheet as the source of truth, fed manually by the operator;
- either direct use of the Google Sheet adapter or a sheet export prepared by the agent;
- a private config file outside Git if using the CLI;
- an output directory accessible to the operator;
- a clear rule for who reviews and sends messages manually.

Do not ask the operator to choose between a manually maintained JSON file and Google Sheets. The commissioned workflow starts from Google Sheets. JSON is only an internal/export format the agent may create when using the CLI.

## Recommended command

```bash
node src/cli.js \
  --input /path/to/approved-rows.json \
  --config /path/to/private-config.json \
  --output out/welcome-output.json \
  --output-csv out/welcome-output.csv
```

## Output locations

Use:

- `out/welcome-output.csv` for human review;
- `out/welcome-output.json` for agent/routine processing;
- the Google Sheet output columns when running Apps Script.

The `out/` directory is ignored by Git.

## Routine safety rules

- Treat generated links as drafts for manual review.
- Do not click/send automatically.
- Do not create recurring jobs until `ROUTINE_APPROVED=true` is explicitly given by the operator after reviewing a fresh preview.
- If the operator asks for a routine, switch to `ROUTINE_CANDIDATE`, restart validation from the Google Sheet, and report the proposed schedule/output location before asking for approval.
- Do not add API sending without a separate project.
- Do not store private config under version control.
- Do not log credentials or real private data unnecessarily.
- If zero rows are generated, treat exit code `2` as a signal to inspect statuses/input, not as permission to force sending.

## Suggested agent loop

1. Confirm the repo is clean and `npm run check` passes.
2. Confirm the private config path exists outside Git.
3. Confirm the Google Sheet/copy is the intended input source and contains only necessary fields. Do not ask the operator to author JSON; create any CLI input file from the sheet/export yourself.
4. Run the CLI.
5. Open the CSV preview for quick review.
6. Report generated/skipped/error counts.
7. Hand the CSV/Sheet output to the human sender.
8. Ask the human to mark sent rows manually after sending.
9. If routine setup was requested, ask for the explicit approval flag `ROUTINE_APPROVED=true` only after the human reviewed the fresh preview.

## Escalate instead of running if

- the private config still contains placeholders;
- the input rows are not approved;
- the output would include sensitive data not needed for the welcome message;
- the operator asks for automatic sending;
- the operator asks for a recurring routine but has not provided `ROUTINE_APPROVED=true` after reviewing a fresh preview;
- the Google/WhatsApp account prompts ask for secrets outside official UI flows.
