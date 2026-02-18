const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onRequest, onCall } = require('firebase-functions/v2/https');
const crypto = require('node:crypto');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

const DEFAULT_REGION = 'southamerica-east1';

const chunk = (array, size) => {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
};

const sanitizeData = (data = {}) => {
  const output = {};
  for (const [key, value] of Object.entries(data)) {
    output[key] = value == null ? '' : String(value);
  }
  return output;
};

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered'
]);

const cleanupInvalidTokens = async (tokens = []) => {
  if (!tokens.length) return 0;

  const uniqueTokens = Array.from(new Set(tokens));
  let deletedCount = 0;

  for (const token of uniqueTokens) {
    const snapshot = await db.collection('push_tokens').where('token', '==', token).get();
    const deletions = snapshot.docs.map((docSnap) => docSnap.ref.delete());
    await Promise.all(deletions);
    deletedCount += deletions.length;
  }

  if (deletedCount > 0) {
    logger.info('Tokens inválidos removidos automaticamente', {
      tokensReceived: tokens.length,
      uniqueTokens: uniqueTokens.length,
      deletedCount
    });
  }

  return deletedCount;
};

const getTicketUrl = (ticketId) => `/?tab=support&ticketId=${encodeURIComponent(ticketId)}`;

const queryPushTokens = async ({ roles = [], userIds = [], userNames = [], companyId, storeId }) => {
  const rolesSet = new Set(roles.filter(Boolean));
  const usersSet = new Set(userIds.filter(Boolean));
  const userNamesSet = new Set(userNames.filter(Boolean));
  const snapshots = [];

  if (rolesSet.size > 0) {
    const rolesArray = Array.from(rolesSet).slice(0, 10);
    let roleQuery = db.collection('push_tokens').where('role', 'in', rolesArray);
    if (companyId) roleQuery = roleQuery.where('companyId', '==', companyId);
    if (storeId) roleQuery = roleQuery.where('storeId', '==', storeId);
    snapshots.push(await roleQuery.get());
  }

  if (usersSet.size > 0) {
    for (const userId of usersSet) {
      let userQuery = db.collection('push_tokens').where('userId', '==', userId);
      if (companyId) userQuery = userQuery.where('companyId', '==', companyId);
      if (storeId) userQuery = userQuery.where('storeId', '==', storeId);
      snapshots.push(await userQuery.get());
    }
  }

  if (userNamesSet.size > 0) {
    for (const userName of userNamesSet) {
      let userNameQuery = db.collection('push_tokens').where('userName', '==', userName);
      if (companyId) userNameQuery = userNameQuery.where('companyId', '==', companyId);
      if (storeId) userNameQuery = userNameQuery.where('storeId', '==', storeId);
      snapshots.push(await userNameQuery.get());
    }
  }

  if (rolesSet.size === 0 && usersSet.size === 0 && userNamesSet.size === 0) {
    let query = db.collection('push_tokens');
    if (companyId) query = query.where('companyId', '==', companyId);
    if (storeId) query = query.where('storeId', '==', storeId);
    snapshots.push(await query.get());
  }

  const tokenSet = new Set();
  snapshots.forEach((snapshot) => {
    snapshot.forEach((doc) => {
      const token = doc.data()?.token;
      if (token) tokenSet.add(token);
    });
  });

  return Array.from(tokenSet);
};

const sendPushToTargets = async ({ title, body, data, roles, userIds, userNames, companyId, storeId }) => {
  const tokens = await queryPushTokens({
    roles,
    userIds,
    userNames: userNames || [],
    companyId,
    storeId
  });

  if (tokens.length === 0) {
    logger.info('Nenhum token encontrado para envio', { roles, userIds, companyId, storeId });
    return { sent: 0, failed: 0, targets: 0 };
  }

  let sent = 0;
  let failed = 0;
  const invalidTokens = [];

  const batches = chunk(tokens, 500);
  for (const batch of batches) {
    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      data: sanitizeData(data)
    });

    sent += response.successCount;
    failed += response.failureCount;

    response.responses.forEach((item, index) => {
      if (!item.success) {
        const errorCode = item.error?.code;
        if (errorCode && INVALID_TOKEN_ERROR_CODES.has(errorCode)) {
          invalidTokens.push(batch[index]);
        }

        logger.warn('Falha no envio push', {
          token: batch[index],
          error: item.error?.message,
          errorCode
        });
      }
    });
  }

  const cleaned = await cleanupInvalidTokens(invalidTokens);

  return { sent, failed, targets: tokens.length, cleanedInvalidTokens: cleaned };
};

const getTaskUrl = (taskId) => `/?tab=tasks&taskId=${encodeURIComponent(taskId)}`;

const normalizeText = (value) => String(value || '').trim();

const mapSchedules = (schedules = []) => {
  const result = new Map();
  schedules.forEach((item) => {
    const responsible = normalizeText(item?.responsible);
    if (!responsible) return;
    result.set(responsible, normalizeText(item?.shift));
  });
  return result;
};

const mapFixedDemands = (demands = []) => {
  const result = new Map();
  demands.forEach((item) => {
    const demandId = normalizeText(item?.id) || `${normalizeText(item?.title)}_${normalizeText(item?.responsible)}`;
    if (!demandId) return;
    result.set(demandId, item);
  });
  return result;
};

const validateRequestApiKey = (req, res) => {
  const expectedKey = process.env.PUSH_API_KEY;
  if (!expectedKey) return true;

  const providedKey = req.get('x-api-key');
  if (!providedKey || providedKey !== expectedKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
};

const hashPasswordSha256 = (password, salt) => {
  const normalizedPassword = String(password || '');
  const normalizedSalt = String(salt || '');
  return crypto.createHash('sha256').update(normalizedPassword + normalizedSalt).digest('hex');
};

exports.loginWithPassword = onCall(
  {
    region: DEFAULT_REGION
  },
  async (request) => {
    const payload = request.data || {};
    const companyId = String(payload.companyId || '').trim();
    const username = String(payload.username || '').toLowerCase().trim();
    const password = String(payload.password || '');

    if (!companyId || !username || !password) {
      throw new Error('Dados de login inválidos');
    }

    const snapshot = await db.collection('users').where('username', '==', username).get();
    const docSnap = snapshot.docs.find((d) => String(d.data()?.companyId || '') === companyId);
    if (!docSnap) {
      throw new Error('Credenciais inválidas');
    }

    const user = docSnap.data() || {};
    if (user.status && String(user.status) !== 'active') {
      throw new Error('Usuário desativado');
    }

    const expectedHash = String(user.password || '');
    const salt = String(user.passwordSalt || '');
    const inputHash = salt ? hashPasswordSha256(password, salt) : '';

    const passwordMatches = expectedHash === password || (inputHash && expectedHash === inputHash);
    if (!passwordMatches) {
      throw new Error('Credenciais inválidas');
    }

    const uid = docSnap.id;
    const token = await admin.auth().createCustomToken(uid, {
      companyId: String(user.companyId || ''),
      roleId: String(user.roleId || ''),
      departmentId: String(user.departmentId || ''),
      username: String(user.username || username)
    });

    return { token, userId: uid };
  }
);

exports.sendPushByRole = onRequest(
  {
    region: DEFAULT_REGION,
    secrets: ['PUSH_API_KEY']
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    if (!validateRequestApiKey(req, res)) return;

    const {
      title,
      body,
      data,
      roles,
      userIds,
      companyId,
      storeId
    } = req.body || {};

    if (!title || !body) {
      res.status(400).json({ error: 'Campos obrigatórios: title e body' });
      return;
    }

    try {
      const result = await sendPushToTargets({
        title,
        body,
        data: data || {},
        roles: Array.isArray(roles) ? roles : [],
        userIds: Array.isArray(userIds) ? userIds : [],
        companyId,
        storeId
      });

      res.status(200).json({ ok: true, ...result });
    } catch (error) {
      logger.error('Erro ao enviar push por role', error);
      res.status(500).json({
        error: 'Falha ao enviar push',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

exports.sendMaintenancePush = onRequest(
  {
    region: DEFAULT_REGION,
    secrets: ['PUSH_API_KEY']
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    if (!validateRequestApiKey(req, res)) return;

    const {
      title,
      message,
      startAt,
      endAt,
      roles,
      userIds,
      userNames,
      companyId,
      storeId,
      dryRun
    } = req.body || {};

    const safeTitle = (title || 'Manutenção programada').toString();
    const safeMessage = (message || 'O sistema passará por manutenção em breve.').toString();

    const periodText = [startAt, endAt].filter(Boolean).join(' até ');
    const body = periodText ? `${safeMessage} (${periodText})` : safeMessage;

    const targets = {
      roles: Array.isArray(roles) ? roles : [],
      userIds: Array.isArray(userIds) ? userIds : [],
      userNames: Array.isArray(userNames) ? userNames : [],
      companyId,
      storeId
    };

    if (dryRun === true) {
      const tokens = await queryPushTokens(targets);
      res.status(200).json({
        ok: true,
        dryRun: true,
        targets: tokens.length,
        preview: {
          title: safeTitle,
          body,
          companyId: companyId || null,
          storeId: storeId || null,
          roles: targets.roles,
          userIds: targets.userIds,
          userNames: targets.userNames
        }
      });
      return;
    }

    try {
      const result = await sendPushToTargets({
        title: safeTitle,
        body,
        data: {
          type: 'maintenance_notice',
          startAt: startAt || '',
          endAt: endAt || '',
          url: '/'
        },
        ...targets
      });

      res.status(200).json({ ok: true, ...result });
    } catch (error) {
      logger.error('Erro ao enviar push de manutenção', error);
      res.status(500).json({
        error: 'Falha ao enviar push de manutenção',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

exports.onSupportTicketCreatedPush = onDocumentCreated(
  {
    region: DEFAULT_REGION,
    document: 'support_tickets/{ticketId}'
  },
  async (event) => {
    const ticket = event.data?.data();
    if (!ticket) return;

    const ticketId = event.params.ticketId;
    const ticketNumber = ticket.ticketNumber ? `#${String(ticket.ticketNumber).padStart(5, '0')}` : `#${ticketId.slice(0, 8).toUpperCase()}`;

    const result = await sendPushToTargets({
      title: `Novo ticket ${ticketNumber}`,
      body: `${ticket.title} · ${ticket.companyId || 'empresa'}`,
      data: {
        type: 'support_ticket_created',
        ticketId,
        url: getTicketUrl(ticketId)
      },
      roles: ['support', 'superadmin'],
      companyId: ticket.companyId,
      storeId: ticket.storeId
    });

    logger.info('Push ticket criado enviado', { ticketId, ...result });
  }
);

exports.onSupportTicketUpdatedPush = onDocumentUpdated(
  {
    region: DEFAULT_REGION,
    document: 'support_tickets/{ticketId}'
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const ticketId = event.params.ticketId;
    const statusChanged = before.status !== after.status;
    const resolutionChanged = before.resolution !== after.resolution;
    const observationsChanged = before.observations !== after.observations;

    if (!statusChanged && !resolutionChanged && !observationsChanged) return;

    const parts = [];
    if (statusChanged) parts.push(`Status: ${before.status} → ${after.status}`);
    if (resolutionChanged) parts.push('Resolução atualizada');
    if (observationsChanged) parts.push('Observações internas atualizadas');

    const result = await sendPushToTargets({
      title: `Ticket atualizado #${ticketId.slice(0, 8).toUpperCase()}`,
      body: parts.join(' · '),
      data: {
        type: 'support_ticket_updated',
        ticketId,
        status: after.status,
        url: getTicketUrl(ticketId)
      },
      userIds: [after.createdBy].filter(Boolean),
      companyId: after.companyId,
      storeId: after.storeId
    });

    logger.info('Push ticket atualizado enviado', { ticketId, ...result });
  }
);

exports.onStoreConfigUpdatedPush = onDocumentUpdated(
  {
    region: DEFAULT_REGION,
    document: 'stores_config/{storeId}'
  },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    const storeId = event.params.storeId;

    const beforeSchedules = mapSchedules(before.schedules || []);
    const afterSchedules = mapSchedules(after.schedules || []);

    const changedPeople = [];
    for (const [responsible, newShift] of afterSchedules.entries()) {
      const oldShift = beforeSchedules.get(responsible);
      if (oldShift && oldShift !== newShift) {
        changedPeople.push({ responsible, oldShift, newShift });
      }
    }

    for (const change of changedPeople) {
      const result = await sendPushToTargets({
        title: 'Seu horário foi alterado',
        body: `${change.responsible}: ${change.oldShift} → ${change.newShift}`,
        data: {
          type: 'schedule_changed',
          storeId,
          responsible: change.responsible,
          oldShift: change.oldShift,
          newShift: change.newShift,
          url: '/?tab=team'
        },
        userIds: [change.responsible],
        userNames: [change.responsible],
        storeId
      });

      logger.info('Push de alteração de horário enviado', {
        storeId,
        responsible: change.responsible,
        ...result
      });
    }

    const beforeDemands = mapFixedDemands(before.fixedDemands || []);
    const afterDemands = mapFixedDemands(after.fixedDemands || []);

    const newDemands = [];
    for (const [demandId, demand] of afterDemands.entries()) {
      if (!beforeDemands.has(demandId)) {
        newDemands.push(demand);
      }
    }

    for (const demand of newDemands) {
      const responsible = normalizeText(demand?.responsible);
      const title = normalizeText(demand?.title) || 'Nova rotina';

      const result = await sendPushToTargets({
        title: 'Nova rotina cadastrada',
        body: responsible ? `${title} · Responsável: ${responsible}` : title,
        data: {
          type: 'new_fixed_demand',
          storeId,
          demandId: normalizeText(demand?.id),
          demandTitle: title,
          responsible,
          url: '/?tab=team'
        },
        userIds: responsible ? [responsible] : [],
        userNames: responsible ? [responsible] : [],
        roles: responsible ? [] : ['admin', 'collaborator'],
        storeId
      });

      logger.info('Push de nova rotina enviado', {
        storeId,
        demandId: demand?.id,
        responsible,
        ...result
      });
    }
  }
);

exports.onTaskAssignedPush = onDocumentCreated(
  {
    region: DEFAULT_REGION,
    document: 'tasks/{taskId}'
  },
  async (event) => {
    const task = event.data?.data();
    if (!task) return;

    const taskId = event.params.taskId;
    const responsible = normalizeText(task.responsible);
    if (!responsible) return;

    const result = await sendPushToTargets({
      title: 'Nova tarefa designada para você',
      body: normalizeText(task.title) || 'Você recebeu uma nova tarefa',
      data: {
        type: 'task_assigned',
        taskId,
        storeId: normalizeText(task.storeId),
        responsible,
        url: getTaskUrl(taskId)
      },
      userIds: [responsible],
      userNames: [responsible],
      storeId: normalizeText(task.storeId)
    });

    logger.info('Push de tarefa designada (criação) enviado', {
      taskId,
      responsible,
      ...result
    });
  }
);

exports.onTaskReassignedPush = onDocumentUpdated(
  {
    region: DEFAULT_REGION,
    document: 'tasks/{taskId}'
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const previousResponsible = normalizeText(before.responsible);
    const newResponsible = normalizeText(after.responsible);
    if (!newResponsible || previousResponsible === newResponsible) return;

    const taskId = event.params.taskId;

    const result = await sendPushToTargets({
      title: 'Tarefa atribuída para você',
      body: normalizeText(after.title) || 'Você recebeu uma tarefa',
      data: {
        type: 'task_reassigned',
        taskId,
        storeId: normalizeText(after.storeId),
        previousResponsible,
        newResponsible,
        url: getTaskUrl(taskId)
      },
      userIds: [newResponsible],
      userNames: [newResponsible],
      storeId: normalizeText(after.storeId)
    });

    logger.info('Push de tarefa reatribuída enviado', {
      taskId,
      previousResponsible,
      newResponsible,
      ...result
    });
  }
);

exports.onTaskAssignedPushV2 = onDocumentCreated(
  {
    region: DEFAULT_REGION,
    document: 'tasks_v2/{taskId}'
  },
  async (event) => {
    const task = event.data?.data();
    if (!task) return;

    const taskId = event.params.taskId;
    const assignedToUserId = normalizeText(task.assignedToUserId);
    if (!assignedToUserId) return;

    const companyId = normalizeText(task.companyId);

    const result = await sendPushToTargets({
      title: 'Nova tarefa designada para você',
      body: normalizeText(task.title) || 'Você recebeu uma nova tarefa',
      data: {
        type: 'task_assigned_v2',
        taskId,
        companyId,
        url: getTaskUrl(taskId)
      },
      userIds: [assignedToUserId],
      companyId
    });

    logger.info('Push de tarefa designada V2 (criação) enviado', {
      taskId,
      assignedToUserId,
      companyId,
      ...result
    });
  }
);

exports.onTaskReassignedPushV2 = onDocumentUpdated(
  {
    region: DEFAULT_REGION,
    document: 'tasks_v2/{taskId}'
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const previousAssignedToUserId = normalizeText(before.assignedToUserId);
    const newAssignedToUserId = normalizeText(after.assignedToUserId);
    if (!newAssignedToUserId || previousAssignedToUserId === newAssignedToUserId) return;

    const taskId = event.params.taskId;
    const companyId = normalizeText(after.companyId);

    const result = await sendPushToTargets({
      title: 'Tarefa atribuída para você',
      body: normalizeText(after.title) || 'Você recebeu uma tarefa',
      data: {
        type: 'task_reassigned_v2',
        taskId,
        companyId,
        previousAssignedToUserId,
        newAssignedToUserId,
        url: getTaskUrl(taskId)
      },
      userIds: [newAssignedToUserId],
      companyId
    });

    logger.info('Push de tarefa reatribuída V2 enviado', {
      taskId,
      previousAssignedToUserId,
      newAssignedToUserId,
      companyId,
      ...result
    });
  }
);
