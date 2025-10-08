/**
 * WildDuck API Helper Functions
 * Comprehensive utilities for managing WildDuck email server settings
 */

// User Settings
export {
  getUserInfo,
  updateUserName,
  updateUserSettings,
} from "./user-settings";

// Forwarding
export {
  getForwardingTargets,
  updateForwardingTargets,
  addForwardingTarget,
  removeForwardingTarget,
} from "./forwarding";

// Spam Settings
export {
  getSpamSettings,
  updateSpamLevel,
  updateFromWhitelist,
  addToFromWhitelist,
  removeFromWhitelist,
  updateSpamSettings,
} from "./spam-settings";

// Auto-Reply
export {
  getAutoReply,
  updateAutoReply,
  enableAutoReply,
  disableAutoReply,
  deleteAutoReply,
  UpdateAutoReplyParams,
} from "./autoreply";

// Filters
export {
  getFilters,
  getFilter,
  createFilter,
  updateFilter,
  deleteFilter,
  enableFilter,
  disableFilter,
  FilterParams,
} from "./filters";

// Advanced Settings
export {
  getAdvancedSettings,
  updateUploadSentMessages,
  getSMTPRelay,
  updateSMTPRelay,
  enableSMTPRelay,
  disableSMTPRelay,
  deleteSMTPRelay,
} from "./advanced-settings";
