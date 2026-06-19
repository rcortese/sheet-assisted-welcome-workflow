'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeStatus,
  isEligibleForWelcome,
  normalizePhone,
  normalizeBrazilianPhone,
  buildWelcomeMessage,
  buildWhatsAppUrl,
  processRows
} = require('../src/core');

const config = {
  organizationName: 'Example Organization',
  projectName: 'Example Project',
  defaultCountryCode: '55',
  allowPlaceholdersForTesting: true,
  materials: {
    welcomeDocumentUrl: 'https://example.com/welcome-document.pdf',
    orientationVideoUrl: 'https://example.com/orientation-video',
    contextBriefUrl: 'https://example.com/context-brief',
    quickGuideUrl: 'https://example.com/quick-guide',
    followUpFormUrl: 'https://example.com/follow-up-form'
  },
  message: {
    footer: 'If you have any questions, reply here and the team will help.'
  }
};

const approvedRow = {
  record_id: 'ROW-2026-0001',
  nome: 'Ana Example',
  telefone: '(11) 99999-0001',
  funcao: 'Field assistant',
  responsavel: 'Example Owner',
  status_validacao: 'Aprovado para boas-vindas',
  status_boas_vindas: 'Não enviada'
};

test('normalizeStatus removes accents and punctuation noise', () => {
  assert.equal(normalizeStatus(' Aprovado para boas-vindas '), 'aprovado para boas vindas');
  assert.equal(normalizeStatus('Concluída'), 'concluida');
});

test('approved row is eligible for welcome generation', () => {
  const result = isEligibleForWelcome(approvedRow);
  assert.equal(result.eligible, true);
});

test('pending validation is not eligible', () => {
  const result = isEligibleForWelcome({ ...approvedRow, status_validacao: 'Pendente' });
  assert.equal(result.eligible, false);
  assert.match(result.reason, /not approved/);
});

test('already sent welcome status blocks generation', () => {
  const result = isEligibleForWelcome({ ...approvedRow, status_boas_vindas: 'Enviada' });
  assert.equal(result.eligible, false);
  assert.match(result.reason, /blocks generation/);
});

test('phone normalization supports local and default-country formats', () => {
  assert.equal(normalizePhone('(11) 99999-0001'), '5511999990001');
  assert.equal(normalizePhone('+55 21 98888-0002'), '5521988880002');
  assert.equal(normalizeBrazilianPhone('(31) 97777-0003'), '5531977770003');
});

test('welcome message includes required generic materials and avoids sensitive fields', () => {
  const message = buildWelcomeMessage({
    recordId: 'ROW-2026-0001',
    name: 'Ana Example',
    phone: '5511999990001',
    role: 'Field assistant',
    validationStatus: 'Aprovado'
  }, config);

  assert.match(message, /Olá, Ana/);
  assert.match(message, /Documento de boas-vindas/);
  assert.match(message, /Formulário complementar/);
  assert.match(message, /https:\/\/example\.com\/follow-up-form/);
  assert.doesNotMatch(message, /CPF|CNPJ|bancários|password|token/i);
});

test('wa.me URL encodes message text', () => {
  const url = buildWhatsAppUrl('5511999990001', 'Olá, teste!');
  assert.equal(url, 'https://wa.me/5511999990001?text=Ol%C3%A1%2C%20teste!');
});


test('production config rejects placeholder values', () => {
  const productionConfig = { ...config };
  delete productionConfig.allowPlaceholdersForTesting;

  assert.throws(() => {
    buildWelcomeMessage({
      recordId: 'ROW-2026-0001',
      name: 'Ana Example',
      phone: '5511999990001',
      role: 'Field assistant',
      validationStatus: 'Aprovado'
    }, productionConfig);
  }, /Placeholder config fields must be replaced before production use/);
});

test('processRows returns generated and skipped buckets', () => {
  const result = processRows([
    approvedRow,
    { ...approvedRow, record_id: 'ROW-2026-0002', status_validacao: 'Pendente' },
    { ...approvedRow, record_id: 'ROW-2026-0003', status_boas_vindas: 'Enviada' }
  ], config, { generatedAt: '2026-01-01T00:00:00.000Z' });

  assert.deepEqual(result.summary, { total: 3, generated: 1, skipped: 2 });
  assert.equal(result.generated[0].record_id, 'ROW-2026-0001');
  assert.equal(result.generated[0].next_status_boas_vindas, 'Pronta para envio');
});

test('processRows records invalid eligible phone errors without aborting the batch', () => {
  const result = processRows([
    { ...approvedRow, record_id: 'ROW-2026-0004', telefone: 'telefone inválido' },
    { ...approvedRow, record_id: 'ROW-2026-0005', telefone: '(11) 90000-0005' }
  ], config, { generatedAt: '2026-01-01T00:00:00.000Z' });

  assert.deepEqual(result.summary, { total: 2, generated: 1, skipped: 1 });
  assert.equal(result.generated[0].record_id, 'ROW-2026-0005');
  assert.equal(result.skipped[0].record_id, 'ROW-2026-0004');
  assert.match(result.skipped[0].reason, /generation error: (Phone is required|Unsupported phone format)/);
});
