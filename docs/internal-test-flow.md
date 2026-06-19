# Internal test flow

Run this flow before using any real spreadsheet.

Goal: validate local generation and Apps Script behavior with fictitious rows, without sending WhatsApp messages and without using real private data.

## Expected result

- `npm run check` passes.
- preview files are created for the agent/operator.
- A test Google Sheet generates 2 messages, skips 2 rows, and records 1 row-level error.
- No message is sent.

## 1. Validate locally

From the project root:

```bash
npm run check
```

Expected high-level output:

```text
# pass 9
Generated 1/3 welcome message(s).
Output: .../out/welcome-preview.json
Output: .../out/welcome-preview.csv
```

This does not call Google, WhatsApp, or any external API.

## 2. Prepare a test spreadsheet

Use a new blank test sheet or a non-production copy.

Option A — blank sheet:

1. Open a new Google Sheet.
2. Copy the contents of `samples/internal-sheet-test.csv`.
3. Paste into cell `A1`, preserving the header row.

Option B — similar sheet:

1. Make a copy of a similar non-production sheet.
2. Ensure it has equivalent columns:

```text
record_id
nome
telefone
funcao
responsavel
status_validacao
status_boas_vindas
```

3. Use only fictitious or anonymized test rows.

## 3. Install Apps Script in the test sheet

1. Open **Extensions → Apps Script**.
2. Clear the starter code.
3. Paste all of `src/apps-script/Code.gs`.
4. Keep placeholder config for this fictitious test, unless approved private values are needed for a realistic test.
5. Save.
6. Reload the sheet.

A menu should appear:

```text
Welcome workflow
```

## 4. Run the test

Choose:

```text
Welcome workflow → Generate approved messages
```

With `samples/internal-sheet-test.csv`, the expected alert is:

```text
Messages generated: 2
Rows skipped: 2
Errors: 1
```

## 5. Confirm output columns

The script should create/fill:

```text
status_boas_vindas
mensagem_boas_vindas
link_whatsapp
boas_vindas_gerada_em
erro_boas_vindas
```

Expected matrix:

| Row | Case | Expected result |
|---:|---|---|
| 2 | Approved, valid phone | `Pronta para envio`, message and link filled. |
| 3 | Approved, valid phone | `Pronta para envio`, message and link filled. |
| 4 | Pending validation | no generation. |
| 5 | Already sent | no regeneration. |
| 6 | Approved, invalid phone | `Erro na geração`, error column filled. |

## 6. Inspect a link without sending

For one generated row:

1. Open `link_whatsapp`.
2. Confirm WhatsApp opens with the prepared text.
3. Do **not** send the message.
4. Close the chat/window.

## 7. Pass criteria

The test passes only if:

- local check passes;
- generated preview files are present;
- the sheet alert matches expected counts;
- two approved rows have message/link;
- pending and already-sent rows are not regenerated;
- invalid phone does not stop the batch;
- no WhatsApp message is sent.

If any step fails, do not continue to production. Fix the smallest issue, then repeat this flow.
