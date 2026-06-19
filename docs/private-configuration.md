# Private configuration

This project is designed to remain public/generic. Real deployment details must stay outside Git.

## What the private handoff may contain

A private handoff file may contain approved operational values such as:

- organization/project display names;
- final welcome-document URL;
- final orientation-video URL;
- final context-brief URL;
- final quick-guide URL;
- final follow-up form URL;
- approved footer/signature text;
- production spreadsheet ID or tab name;
- deployment notes for the authorized operator.

It must **not** contain credentials, cookies, OAuth client secrets, private keys, personal documents, payment data, or unnecessary sensitive data.

## Operator-facing approach

Do not ask the operator/client to write JSON. The participant source is the operator's Google Sheet, which they continue feeding manually. Ask for the sheet/test copy, a simple PDF/document/model message, final approved links if known, and short answers to missing details. If a JSON config or JSON input file is useful for the CLI, the deployment agent should create it outside Git from those operator-provided inputs.

## Internal config shape

Use the same schema as `config/welcome.config.example.json`:

```json
{
  "organizationName": "Approved Organization Name",
  "projectName": "Approved Project Name",
  "defaultCountryCode": "55",
  "materials": {
    "welcomeDocumentUrl": "https://example.com/final-welcome-document.pdf",
    "orientationVideoUrl": "https://example.com/final-orientation-video",
    "contextBriefUrl": "https://example.com/final-context-brief",
    "quickGuideUrl": "https://example.com/final-quick-guide",
    "followUpFormUrl": "https://example.com/final-follow-up-form"
  },
  "message": {
    "footer": "Approved closing line."
  }
}
```

## How to use it locally, if the agent creates a config file

Keep the real file outside this repository and pass its absolute path. This is an agent/operator implementation detail, not something the client should have to author manually:

```bash
node src/cli.js \
  --input /path/to/rows.json \
  --config /path/to/private-config.json \
  --output out/welcome-output.json \
  --output-csv out/welcome-output.csv
```

## How to use it with Apps Script

Apps Script cannot read a local private JSON file directly. The deployment agent should guide the operator to copy approved values from the private handoff into `WELCOME_CONFIG` in the Apps Script editor, after installing the generic `src/apps-script/Code.gs` in a test spreadsheet.

Never paste credentials into Apps Script or chat. Google authorization should happen through the official Apps Script/Google account prompts.
