export const LogType = {
  MEMBER_WARN: "MEMBER_WARN",
  MEMBER_MUTE: "MEMBER_MUTE",
  MEMBER_UNMUTE: "MEMBER_UNMUTE",
  MEMBER_MUTE_EXPIRED: "MEMBER_MUTE_EXPIRED",
  MEMBER_KICK: "MEMBER_KICK",
  MEMBER_BAN: "MEMBER_BAN",
  MEMBER_UNBAN: "MEMBER_UNBAN",
  MEMBER_FORCEBAN: "MEMBER_FORCEBAN",
  MEMBER_SOFTBAN: "MEMBER_SOFTBAN",
  MEMBER_JOIN: "MEMBER_JOIN",
  MEMBER_LEAVE: "MEMBER_LEAVE",
  MEMBER_ROLE_ADD: "MEMBER_ROLE_ADD",
  MEMBER_ROLE_REMOVE: "MEMBER_ROLE_REMOVE",
  MEMBER_NICK_CHANGE: "MEMBER_NICK_CHANGE",
  MEMBER_USERNAME_CHANGE: "MEMBER_USERNAME_CHANGE",
  MEMBER_RESTORE: "MEMBER_RESTORE",
  CHANNEL_CREATE: "CHANNEL_CREATE",
  CHANNEL_DELETE: "CHANNEL_DELETE",
  CHANNEL_UPDATE: "CHANNEL_UPDATE",
  THREAD_CREATE: "THREAD_CREATE",
  THREAD_DELETE: "THREAD_DELETE",
  THREAD_UPDATE: "THREAD_UPDATE",
  ROLE_CREATE: "ROLE_CREATE",
  ROLE_DELETE: "ROLE_DELETE",
  ROLE_UPDATE: "ROLE_UPDATE",
  MESSAGE_EDIT: "MESSAGE_EDIT",
  MESSAGE_DELETE: "MESSAGE_DELETE",
  MESSAGE_DELETE_BULK: "MESSAGE_DELETE_BULK",
  MESSAGE_DELETE_BARE: "MESSAGE_DELETE_BARE",
  VOICE_CHANNEL_JOIN: "VOICE_CHANNEL_JOIN",
  VOICE_CHANNEL_LEAVE: "VOICE_CHANNEL_LEAVE",
  VOICE_CHANNEL_MOVE: "VOICE_CHANNEL_MOVE",
  STAGE_INSTANCE_CREATE: "STAGE_INSTANCE_CREATE",
  STAGE_INSTANCE_DELETE: "STAGE_INSTANCE_DELETE",
  STAGE_INSTANCE_UPDATE: "STAGE_INSTANCE_UPDATE",
  EMOJI_CREATE: "EMOJI_CREATE",
  EMOJI_DELETE: "EMOJI_DELETE",
  EMOJI_UPDATE: "EMOJI_UPDATE",
  STICKER_CREATE: "STICKER_CREATE",
  STICKER_DELETE: "STICKER_DELETE",
  STICKER_UPDATE: "STICKER_UPDATE",
  COMMAND: "COMMAND",
  MESSAGE_SPAM_DETECTED: "MESSAGE_SPAM_DETECTED",
  CENSOR: "CENSOR",
  CLEAN: "CLEAN",
  CASE_CREATE: "CASE_CREATE",
  MASSUNBAN: "MASSUNBAN",
  MASSBAN: "MASSBAN",
  MASSMUTE: "MASSMUTE",
  MEMBER_TIMED_MUTE: "MEMBER_TIMED_MUTE",
  MEMBER_TIMED_UNMUTE: "MEMBER_TIMED_UNMUTE",
  MEMBER_TIMED_BAN: "MEMBER_TIMED_BAN",
  MEMBER_TIMED_UNBAN: "MEMBER_TIMED_UNBAN",
  MEMBER_JOIN_WITH_PRIOR_RECORDS: "MEMBER_JOIN_WITH_PRIOR_RECORDS",
  OTHER_SPAM_DETECTED: "OTHER_SPAM_DETECTED",
  MEMBER_ROLE_CHANGES: "MEMBER_ROLE_CHANGES",
  VOICE_CHANNEL_FORCE_MOVE: "VOICE_CHANNEL_FORCE_MOVE",
  VOICE_CHANNEL_FORCE_DISCONNECT: "VOICE_CHANNEL_FORCE_DISCONNECT",
  CASE_UPDATE: "CASE_UPDATE",
  MEMBER_MUTE_REJOIN: "MEMBER_MUTE_REJOIN",
  SCHEDULED_MESSAGE: "SCHEDULED_MESSAGE",
  POSTED_SCHEDULED_MESSAGE: "POSTED_SCHEDULED_MESSAGE",
  BOT_ALERT: "BOT_ALERT",
  AUTOMOD_ACTION: "AUTOMOD_ACTION",
  SCHEDULED_REPEATED_MESSAGE: "SCHEDULED_REPEATED_MESSAGE",
  REPEATED_MESSAGE: "REPEATED_MESSAGE",
  MESSAGE_DELETE_AUTO: "MESSAGE_DELETE_AUTO",
  SET_ANTIRAID_USER: "SET_ANTIRAID_USER",
  SET_ANTIRAID_AUTO: "SET_ANTIRAID_AUTO",
  MEMBER_NOTE: "MEMBER_NOTE",
  CASE_DELETE: "CASE_DELETE",
  DM_FAILED: "DM_FAILED",
  MASSWARN: "MASSWARN",
  MASSKICK: "MASSKICK",
} as const;
