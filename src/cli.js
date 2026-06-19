#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { processRows } = require('./core');

function usage() {
  return `Usage: node src/cli.js --input <rows.json> --config <welcome.config.json> [--output <out.json>] [--output-csv <out.csv>]\n\nGenerates welcome messages and wa.me links for approved rows.\nNo WhatsApp message is sent. No external API is called.\n`;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith('--')) {
      throw new Error(`Unexpected argument: ${key}`);
    }
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function csvCell(value) {
  const text = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function outputRowsForCsv(output) {
  const generatedRows = output.generated.map((item) => ({
    record_id: item.record_id,
    nome: item.nome,
    telefone_normalizado: item.telefone_normalizado,
    status_boas_vindas: item.next_status_boas_vindas,
    link_whatsapp: item.whatsapp_url,
    generated_at: item.generated_at,
    reason: ''
  }));
  const skippedRows = output.skipped.map((item) => ({
    record_id: item.record_id,
    nome: item.nome,
    telefone_normalizado: '',
    status_boas_vindas: '',
    link_whatsapp: '',
    generated_at: '',
    reason: item.reason
  }));
  return [...generatedRows, ...skippedRows];
}

function serializeCsv(output) {
  const headers = ['record_id', 'nome', 'telefone_normalizado', 'status_boas_vindas', 'link_whatsapp', 'generated_at', 'reason'];
  const lines = [headers.join(',')];
  for (const row of outputRowsForCsv(output)) {
    lines.push(headers.map((header) => csvCell(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function writeFile(filePath, content) {
  const outputPath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content);
  return outputPath;
}

function main(argv = process.argv) {
  const args = parseArgs(argv);
  if (!args.input || !args.config) {
    throw new Error(usage());
  }

  const inputPath = path.resolve(args.input);
  const configPath = path.resolve(args.config);
  const rows = readJson(inputPath);
  const config = readJson(configPath);
  const output = processRows(rows, config);

  const written = [];
  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (args.output) {
    written.push(writeFile(args.output, serialized));
  } else {
    process.stdout.write(serialized);
  }

  if (args['output-csv']) {
    written.push(writeFile(args['output-csv'], serializeCsv(output)));
  }

  if (written.length > 0) {
    console.log(`Generated ${output.summary.generated}/${output.summary.total} welcome message(s).`);
    for (const outputPath of written) {
      console.log(`Output: ${outputPath}`);
    }
  }

  if (output.summary.generated === 0) {
    process.exitCode = 2;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { main, parseArgs, serializeCsv, outputRowsForCsv };
