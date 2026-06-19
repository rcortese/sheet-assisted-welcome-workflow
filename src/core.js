'use strict';

const FIELD_ALIASES = Object.freeze({
  recordId: ['record_id', 'id', 'id_registro', 'ID', 'Record ID'],
  name: ['nome', 'name', 'nome_completo', 'nome completo', 'Nome', 'Nome completo'],
  phone: ['telefone', 'phone', 'whatsapp', 'celular', 'Telefone', 'WhatsApp', 'Celular'],
  role: ['funcao', 'função', 'role', 'cargo', 'Função', 'Cargo', 'Role'],
  owner: ['responsavel', 'responsável', 'owner', 'lider_responsavel', 'líder responsável', 'lider responsável', 'Responsável'],
  validationStatus: ['status_validacao', 'status validação', 'status de validação', 'validation_status', 'Status validação'],
  welcomeStatus: ['status_boas_vindas', 'status boas-vindas', 'status boas vindas', 'welcome_status', 'Status boas-vindas']
});

const ELIGIBLE_VALIDATION_STATUSES = new Set([
  'aprovado',
  'aprovado para boas vindas',
  'validado internamente',
  'approved',
  'ready'
]);

const BLOCKING_WELCOME_STATUSES = new Set([
  'enviada',
  'boas vindas enviada',
  'concluida',
  'cancelada',
  'sent',
  'done',
  'cancelled'
]);

const PLACEHOLDER_PATTERN = /(example\.com|\bexample\b|\bplaceholder\b|\btodo\b|\breplace\b|\bchangeme\b|\bdummy\b|\bsample\b|\bpendente\b|\bpending\b|\btbd\b|a definir|a preencher|fornecer|provided privately|not provided)/i;

function normalizeStatus(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstNonEmpty(row, aliases) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, alias)) {
      const value = row[alias];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
  }
  return '';
}

function extractRecord(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Input row must be an object.');
  }

  return {
    recordId: firstNonEmpty(row, FIELD_ALIASES.recordId),
    name: firstNonEmpty(row, FIELD_ALIASES.name),
    phone: firstNonEmpty(row, FIELD_ALIASES.phone),
    role: firstNonEmpty(row, FIELD_ALIASES.role),
    owner: firstNonEmpty(row, FIELD_ALIASES.owner),
    validationStatus: firstNonEmpty(row, FIELD_ALIASES.validationStatus),
    welcomeStatus: firstNonEmpty(row, FIELD_ALIASES.welcomeStatus)
  };
}

function validateRequiredRecordFields(record) {
  const missing = [];
  if (!record.recordId) missing.push('record_id');
  if (!record.name) missing.push('nome/name');
  if (!record.phone) missing.push('telefone/phone');
  if (!record.role) missing.push('funcao/role');
  if (!record.validationStatus) missing.push('status_validacao/validation_status');
  return missing;
}

function isEligibleForWelcome(row) {
  const record = extractRecord(row);
  const missing = validateRequiredRecordFields(record);
  if (missing.length > 0) {
    return { eligible: false, reason: `missing required fields: ${missing.join(', ')}`, record };
  }

  const validation = normalizeStatus(record.validationStatus);
  if (!ELIGIBLE_VALIDATION_STATUSES.has(validation)) {
    return { eligible: false, reason: `validation status is not approved: ${record.validationStatus}`, record };
  }

  const welcome = normalizeStatus(record.welcomeStatus);
  if (welcome && BLOCKING_WELCOME_STATUSES.has(welcome)) {
    return { eligible: false, reason: `welcome status blocks generation: ${record.welcomeStatus}`, record };
  }

  return { eligible: true, reason: 'eligible', record };
}

function normalizePhone(rawPhone, defaultCountryCode = '55') {
  let digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) {
    throw new Error('Phone is required.');
  }

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith(defaultCountryCode) && digits.length >= 12 && digits.length <= 13) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `${defaultCountryCode}${digits}`;
  }

  throw new Error(`Unsupported phone format: ${rawPhone}`);
}

function validateConfig(config) {
  const required = [
    ['organizationName', config.organizationName],
    ['projectName', config.projectName],
    ['materials.welcomeDocumentUrl', config.materials && config.materials.welcomeDocumentUrl],
    ['materials.orientationVideoUrl', config.materials && config.materials.orientationVideoUrl],
    ['materials.contextBriefUrl', config.materials && config.materials.contextBriefUrl],
    ['materials.quickGuideUrl', config.materials && config.materials.quickGuideUrl],
    ['materials.followUpFormUrl', config.materials && config.materials.followUpFormUrl]
  ];
  const missing = required.filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Missing config fields: ${missing.join(', ')}`);
  }

  const invalidUrls = required
    .filter(([key, value]) => key.startsWith('materials.') && !/^https?:\/\/\S+$/i.test(String(value)))
    .map(([key]) => key);
  if (invalidUrls.length > 0) {
    throw new Error(`Material config fields must be valid http(s) URLs: ${invalidUrls.join(', ')}`);
  }

  const allowPlaceholders = config.allowPlaceholdersForTesting === true;
  if (!allowPlaceholders) {
    const placeholders = required
      .filter(([, value]) => PLACEHOLDER_PATTERN.test(String(value)))
      .map(([key]) => key);
    if (placeholders.length > 0) {
      throw new Error(`Placeholder config fields must be replaced before production use: ${placeholders.join(', ')}`);
    }
  }
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || String(name || '').trim();
}

function buildWelcomeMessage(record, config) {
  validateConfig(config);
  const materials = config.materials;
  const footer = config.message && config.message.footer ? config.message.footer : 'If you have any questions, reply here and the team will help.';

  return [
    `Olá, ${firstName(record.name)}! Tudo bem?`,
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
    footer
  ].join('\n');
}

function buildWhatsAppUrl(normalizedPhone, message) {
  if (!/^\d{12,13}$/.test(normalizedPhone)) {
    throw new Error(`Phone must be normalized before URL generation: ${normalizedPhone}`);
  }
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

function generateWelcome(row, config, options = {}) {
  const eligibility = isEligibleForWelcome(row);
  if (!eligibility.eligible) {
    return {
      skipped: true,
      reason: eligibility.reason,
      record_id: eligibility.record.recordId || null,
      nome: eligibility.record.name || null
    };
  }

  const generatedAt = options.generatedAt || new Date().toISOString();
  const normalizedPhone = normalizePhone(eligibility.record.phone, config.defaultCountryCode || '55');
  const message = buildWelcomeMessage(eligibility.record, config);
  const whatsappUrl = buildWhatsAppUrl(normalizedPhone, message);

  return {
    skipped: false,
    record_id: eligibility.record.recordId,
    nome: eligibility.record.name,
    funcao: eligibility.record.role,
    responsavel: eligibility.record.owner || null,
    telefone_normalizado: normalizedPhone,
    message,
    whatsapp_url: whatsappUrl,
    next_status_boas_vindas: 'Pronta para envio',
    generated_at: generatedAt
  };
}

function summarizeRowForError(row) {
  try {
    const record = extractRecord(row);
    return {
      record_id: record.recordId || null,
      nome: record.name || null
    };
  } catch (_error) {
    return {
      record_id: null,
      nome: null
    };
  }
}

function processRows(rows, config, options = {}) {
  if (!Array.isArray(rows)) {
    throw new Error('Input must be a JSON array of rows.');
  }

  validateConfig(config);

  const results = rows.map((row) => {
    try {
      return generateWelcome(row, config, options);
    } catch (error) {
      const summary = summarizeRowForError(row);
      return {
        skipped: true,
        reason: `generation error: ${error.message}`,
        record_id: summary.record_id,
        nome: summary.nome
      };
    }
  });
  const generated = results.filter((item) => !item.skipped);
  const skipped = results.filter((item) => item.skipped);

  return {
    summary: {
      total: rows.length,
      generated: generated.length,
      skipped: skipped.length
    },
    generated,
    skipped
  };
}

module.exports = {
  FIELD_ALIASES,
  normalizeStatus,
  extractRecord,
  validateRequiredRecordFields,
  isEligibleForWelcome,
  normalizePhone,
  normalizeBrazilianPhone: normalizePhone,
  validateConfig,
  buildWelcomeMessage,
  buildWhatsAppUrl,
  generateWelcome,
  summarizeRowForError,
  processRows
};
