/**
 * Barrel export for all IPC handler modules.
 *
 * @module electron/ipc/index
 */
'use strict';

const fileHandlers = require('./fileHandlers');
const secretsHandler = require('./secretsHandler');
const httpHandler = require('./httpHandler');
const aiHandler = require('./aiHandler');
const gitHandler = require('./gitHandler');
const workspaceHandler = require('./workspaceHandler');

module.exports = {
  fileHandlers,
  secretsHandler,
  httpHandler,
  aiHandler,
  gitHandler,
  workspaceHandler,
};
