# Specification — sheet-assisted welcome workflow

Version: 1.0.0
Scope: generic preparation of welcome messages from approved spreadsheet rows.

## Objective

Generate reviewable welcome-message artifacts from rows that have already been internally approved.

The workflow produces:

1. personalized message text;
2. a `wa.me` link with the message encoded;
3. row/status fields for manual review and sending;
4. JSON/CSV output for local routines;
5. a Google Apps Script adapter for Sheets.

## Non-goals

- No automatic WhatsApp sending.
- No WhatsApp Business API integration.
- No Meta templates, webhooks, or tokens.
- No direct production Google Sheets access from the public repo.
- No credential, cookie, token, or OAuth secret storage.
- No unnecessary personal, tax, document, payment, or banking data.

## Minimum input

| Field | Required | Notes |
|---|---:|---|
| `record_id` | Yes | Unique row/process/person identifier. |
| `nome` or `name` | Yes | Person's display name. |
| `telefone`, `whatsapp`, or `phone` | Yes | Phone number used to prepare the `wa.me` link. |
| `funcao`, `cargo`, or `role` | Yes | Role/participation shown in the message. |
| `responsavel` or `owner` | No | Optional internal owner/leader. |
| `status_validacao` | Yes | Must indicate internal approval. |
| `status_boas_vindas` | No | Blocks regeneration for sent/cancelled rows. |

## Recognized statuses

Accepted validation statuses after normalization:

- `Aprovado`
- `Aprovado para boas-vindas`
- `Validado internamente`
- `Approved`
- `Ready`

Welcome statuses that block regeneration after normalization:

- `Enviada`
- `Boas-vindas enviada`
- `Concluída`
- `Cancelada`
- `Sent`
- `Done`
- `Cancelled`

## Output

For each eligible valid row:

```json
{
  "record_id": "ROW-2026-0001",
  "nome": "Person Example",
  "telefone_normalizado": "5511999999999",
  "message": "...",
  "whatsapp_url": "https://wa.me/5511999999999?text=...",
  "next_status_boas_vindas": "Pronta para envio",
  "generated_at": "..."
}
```

Rows that are skipped or fail generation are recorded in `skipped` with a reason. In Apps Script, row-level errors must write `status_boas_vindas = Erro na geração` and `erro_boas_vindas` without aborting the whole batch.

## Message content

The generated message includes:

- personalized greeting;
- organization/project display names from config;
- role/participation from the row;
- welcome document URL;
- orientation video URL;
- context brief URL;
- quick guide URL;
- follow-up form URL;
- approved footer text.

All real values must come from private configuration or manual setup, not from committed source.

## Configuration

Public example config lives at:

```text
config/welcome.config.example.json
```

Production/private config should stay outside the repository and use the same shape.

## Acceptance criteria

The scaffold is ready when:

1. `npm run check` passes;
2. sample JSON and CSV previews are generated from fictitious data;
3. Apps Script syntax is valid;
4. the internal sheet test flow is documented;
5. current tree contains no client/project-specific literals or private assets;
6. git history has been rewritten to a single sanitized commit before public delivery;
7. docs clearly keep WhatsApp sending manual and credentials outside Git/chat.
