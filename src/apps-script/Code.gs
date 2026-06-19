/**
 * Generic spreadsheet-assisted welcome workflow.
 *
 * This Google Apps Script adapter writes a prepared message and a wa.me link
 * into a sheet for manual review/sending. It does not send WhatsApp messages
 * and does not call external APIs.
 */

const WELCOME_CONFIG = {
  organizationName: 'Example Organization',
  projectName: 'Example Project',
  defaultCountryCode: '55',
  materials: {
    welcomeDocumentUrl: 'https://example.com/final-welcome-document.pdf',
    orientationVideoUrl: 'https://example.com/final-orientation-video',
    contextBriefUrl: 'https://example.com/final-context-brief',
    quickGuideUrl: 'https://example.com/final-quick-guide',
    followUpFormUrl: 'https://example.com/final-follow-up-form'
  },
  message: {
    footer: 'If you have any questions, reply here and the team will help.'
  }
};

const OUTPUT_COLUMNS = {
  statusBoasVindas: 'status_boas_vindas',
  mensagem: 'mensagem_boas_vindas',
  linkWhatsapp: 'link_whatsapp',
  geradaEm: 'boas_vindas_gerada_em',
  erroBoasVindas: 'erro_boas_vindas'
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Welcome workflow')
    .addItem('Generate approved messages', 'gerarMensagensBoasVindas')
    .addToUi();
}

function gerarMensagensBoasVindas() {
  try {
    validateConfig_(WELCOME_CONFIG);
  } catch (error) {
    SpreadsheetApp.getUi().alert('Configuration is not ready for production: ' + (error && error.message ? error.message : String(error)));
    return;
  }

  const sheet = SpreadsheetApp.getActiveSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    SpreadsheetApp.getUi().alert('No rows found.');
    return;
  }

  const headers = values[0].map(String);
  ensureOutputColumns_(sheet, headers);
  const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const updatedColumnMap = mapHeaders_(updatedHeaders);

  let generated = 0;
  let skipped = 0;
  let errors = 0;
  for (let rowIndex = 2; rowIndex <= sheet.getLastRow(); rowIndex += 1) {
    const rowValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = rowObject_(updatedHeaders, rowValues);
    let output;
    try {
      output = generateWelcome_(row, WELCOME_CONFIG);
    } catch (error) {
      errors += 1;
      sheet.getRange(rowIndex, updatedColumnMap[OUTPUT_COLUMNS.statusBoasVindas] + 1).setValue('Erro na geração');
      sheet.getRange(rowIndex, updatedColumnMap[OUTPUT_COLUMNS.erroBoasVindas] + 1).setValue(error && error.message ? error.message : String(error));
      continue;
    }

    if (output.skipped) {
      skipped += 1;
      continue;
    }

    sheet.getRange(rowIndex, updatedColumnMap[OUTPUT_COLUMNS.statusBoasVindas] + 1).setValue(output.next_status_boas_vindas);
    sheet.getRange(rowIndex, updatedColumnMap[OUTPUT_COLUMNS.mensagem] + 1).setValue(output.message);
    sheet.getRange(rowIndex, updatedColumnMap[OUTPUT_COLUMNS.linkWhatsapp] + 1).setValue(output.whatsapp_url);
    sheet.getRange(rowIndex, updatedColumnMap[OUTPUT_COLUMNS.geradaEm] + 1).setValue(output.generated_at);
    sheet.getRange(rowIndex, updatedColumnMap[OUTPUT_COLUMNS.erroBoasVindas] + 1).setValue('');
    generated += 1;
  }

  SpreadsheetApp.getUi().alert(`Messages generated: ${generated}\nRows skipped: ${skipped}\nErrors: ${errors}`);
}

function ensureOutputColumns_(sheet, headers) {
  const map = mapHeaders_(headers);
  Object.keys(OUTPUT_COLUMNS).forEach((key) => {
    const columnName = OUTPUT_COLUMNS[key];
    if (map[columnName] === undefined) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(columnName);
      map[columnName] = sheet.getLastColumn() - 1;
    }
  });
  return map;
}

function mapHeaders_(headers) {
  const map = {};
  headers.forEach((header, index) => {
    map[String(header).trim()] = index;
  });
  return map;
}

function rowObject_(headers, values) {
  const row = {};
  headers.forEach((header, index) => {
    row[String(header).trim()] = values[index];
  });
  return row;
}

function firstNonEmpty_(row, aliases) {
  for (let i = 0; i < aliases.length; i += 1) {
    const key = aliases[i];
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

function normalizeStatus_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractRecord_(row) {
  return {
    recordId: firstNonEmpty_(row, ['record_id', 'id', 'id_registro', 'ID', 'Record ID']),
    name: firstNonEmpty_(row, ['nome', 'name', 'nome_completo', 'nome completo', 'Nome', 'Nome completo']),
    phone: firstNonEmpty_(row, ['telefone', 'phone', 'whatsapp', 'celular', 'Telefone', 'WhatsApp', 'Celular']),
    role: firstNonEmpty_(row, ['funcao', 'função', 'role', 'cargo', 'Função', 'Cargo', 'Role']),
    owner: firstNonEmpty_(row, ['responsavel', 'responsável', 'owner', 'lider_responsavel', 'líder responsável', 'lider responsável', 'Responsável']),
    validationStatus: firstNonEmpty_(row, ['status_validacao', 'status validação', 'status de validação', 'validation_status', 'Status validação']),
    welcomeStatus: firstNonEmpty_(row, ['status_boas_vindas', 'status boas-vindas', 'status boas vindas', 'welcome_status', 'Status boas-vindas'])
  };
}

function isEligibleForWelcome_(row) {
  const record = extractRecord_(row);
  if (!record.recordId || !record.name || !record.phone || !record.role || !record.validationStatus) {
    return { eligible: false, reason: 'missing required fields', record };
  }

  const validation = normalizeStatus_(record.validationStatus);
  if (['aprovado', 'aprovado para boas vindas', 'validado internamente', 'approved', 'ready'].indexOf(validation) === -1) {
    return { eligible: false, reason: 'not approved', record };
  }

  const welcome = normalizeStatus_(record.welcomeStatus);
  if (['enviada', 'boas vindas enviada', 'concluida', 'cancelada', 'sent', 'done', 'cancelled'].indexOf(welcome) !== -1) {
    return { eligible: false, reason: 'already sent or blocked', record };
  }

  return { eligible: true, reason: 'eligible', record };
}

function normalizePhone_(rawPhone, defaultCountryCode) {
  let digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) throw new Error('Phone is required.');
  if (digits.indexOf('00') === 0) digits = digits.slice(2);
  if (digits.indexOf(defaultCountryCode) === 0 && digits.length >= 12 && digits.length <= 13) return digits;
  if (digits.length === 10 || digits.length === 11) return defaultCountryCode + digits;
  throw new Error('Unsupported phone format: ' + rawPhone);
}


function isPlaceholderValue_(value) {
  return /(example\.com|\bexample\b|\bplaceholder\b|\btodo\b|\breplace\b|\bchangeme\b|\bdummy\b|\bsample\b|\bpendente\b|\bpending\b|\btbd\b|a definir|a preencher|fornecer|provided privately|not provided)/i.test(String(value || ''));
}

function validateConfig_(config) {
  const required = [
    ['organizationName', config.organizationName],
    ['projectName', config.projectName],
    ['materials.welcomeDocumentUrl', config.materials && config.materials.welcomeDocumentUrl],
    ['materials.orientationVideoUrl', config.materials && config.materials.orientationVideoUrl],
    ['materials.contextBriefUrl', config.materials && config.materials.contextBriefUrl],
    ['materials.quickGuideUrl', config.materials && config.materials.quickGuideUrl],
    ['materials.followUpFormUrl', config.materials && config.materials.followUpFormUrl]
  ];
  const missing = required.filter((item) => !item[1]).map((item) => item[0]);
  if (missing.length > 0) {
    throw new Error('Missing config fields: ' + missing.join(', '));
  }

  const invalidUrls = required
    .filter((item) => item[0].indexOf('materials.') === 0 && !/^https?:\/\/\S+$/i.test(String(item[1])))
    .map((item) => item[0]);
  if (invalidUrls.length > 0) {
    throw new Error('Material config fields must be valid http(s) URLs: ' + invalidUrls.join(', '));
  }

  if (config.allowPlaceholdersForTesting === true) return;

  const placeholders = required
    .filter((item) => isPlaceholderValue_(item[1]))
    .map((item) => item[0]);
  if (placeholders.length > 0) {
    throw new Error('Placeholder config fields must be replaced before production use: ' + placeholders.join(', '));
  }
}

function buildWelcomeMessage_(record, config) {
  const firstName = String(record.name).trim().split(/\s+/)[0];
  const materials = config.materials;
  return [
    `Olá, ${firstName}! Tudo bem?`,
    '',
    `Seja bem-vinda(o) à equipe de ${config.organizationName} / ${config.projectName}.`,
    `Sua função ou participação registrada é: ${record.role}.`,
    '',
    'Seguem os materiais iniciais:',
    '',
    '1. Documento de boas-vindas:',
    materials.welcomeDocumentUrl,
    '',
    '2. Vídeo de orientação:',
    materials.orientationVideoUrl,
    '',
    '3. Briefing de contexto:',
    materials.contextBriefUrl,
    '',
    '4. Guia rápido:',
    materials.quickGuideUrl,
    '',
    '5. Formulário complementar:',
    materials.followUpFormUrl,
    '',
    'Por favor, preencha o formulário complementar quando puder para seguirmos com os próximos passos.',
    '',
    config.message.footer
  ].join('\n');
}

function generateWelcome_(row, config) {
  const eligibility = isEligibleForWelcome_(row);
  if (!eligibility.eligible) {
    return { skipped: true, reason: eligibility.reason };
  }
  const phone = normalizePhone_(eligibility.record.phone, config.defaultCountryCode || '55');
  const message = buildWelcomeMessage_(eligibility.record, config);
  return {
    skipped: false,
    message,
    whatsapp_url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    next_status_boas_vindas: 'Pronta para envio',
    generated_at: new Date().toISOString()
  };
}
