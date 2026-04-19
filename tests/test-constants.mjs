import { STORAGE_KEYS } from "../src/core/constants.js";

const TEST_STORAGE_PREFIX = "wedding_v1_";

export const TEST_STORAGE_KEYS = Object.freeze({
  OFFLINE_PROBE: `${TEST_STORAGE_PREFIX}offline_test`,
  CONFLICT_PROBE: `${TEST_STORAGE_PREFIX}conflict_test`,
  CROSS_TAB_PROBE: `${TEST_STORAGE_PREFIX}xstorage_probe`,
  STORAGE_BAD_JSON: `${TEST_STORAGE_PREFIX}bad`,
  STORAGE_WRITE_PROBE: `${TEST_STORAGE_PREFIX}x`,
  ...STORAGE_KEYS,
});
