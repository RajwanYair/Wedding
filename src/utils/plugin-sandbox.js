/**
 * src/utils/plugin-sandbox.js — re-export barrel (S680: domain module plugin/index.ts)
 *
 * @module plugin-sandbox
 * @owner plugin-runtime
 */

export {
  nextMessageId,
  createSandbox,
  hasPermission,
  buildInvokeMessage,
  buildResponseMessage,
  buildErrorMessage,
  terminateSandbox,
} from "./plugin/index.js";
