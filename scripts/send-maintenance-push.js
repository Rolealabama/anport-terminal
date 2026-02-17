#!/usr/bin/env node

const args = process.argv.slice(2);

const getArg = (name, fallback = '') => {
  const item = args.find((entry) => entry.startsWith(`--${name}=`));
  if (!item) return fallback;
  return item.split('=').slice(1).join('=');
};

const splitList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const endpoint = process.env.PUSH_MAINTENANCE_ENDPOINT || getArg('endpoint');
const apiKey = process.env.PUSH_API_KEY || getArg('apiKey');

if (!endpoint) {
  console.error('Informe endpoint via PUSH_MAINTENANCE_ENDPOINT ou --endpoint=...');
  process.exit(1);
}

if (!apiKey) {
  console.error('Informe API key via PUSH_API_KEY ou --apiKey=...');
  process.exit(1);
}

const title = getArg('title', 'Manutenção programada');
const message = getArg('message', 'O sistema ficará indisponível durante a manutenção.');
const startAt = getArg('startAt', '');
const endAt = getArg('endAt', '');
const companyId = getArg('companyId', '');
const storeId = getArg('storeId', '');
const dryRun = getArg('dryRun', 'false') === 'true';

const roles = splitList(getArg('roles', 'support,superadmin,admin,company,collaborator'));
const userIds = splitList(getArg('userIds', ''));
const userNames = splitList(getArg('userNames', ''));

(async () => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        title,
        message,
        startAt,
        endAt,
        roles,
        userIds,
        userNames,
        companyId: companyId || undefined,
        storeId: storeId || undefined,
        dryRun
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      console.error('Erro ao disparar manutenção:', payload);
      process.exit(1);
    }

    console.log('Push de manutenção enviado:', payload);
  } catch (error) {
    console.error('Falha na execução do script:', error);
    process.exit(1);
  }
})();
