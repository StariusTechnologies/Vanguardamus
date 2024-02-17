import { Guild } from "discord.js";

export enum ERRORS {
  NO_MUTE_ROLE_IN_CONFIG = 1,
  UNKNOWN_NOTE_CASE,
  INVALID_EMOJI,
  NO_USER_NOTIFICATION_CHANNEL,
  INVALID_USER_NOTIFICATION_CHANNEL,
  INVALID_USER,
  INVALID_MUTE_ROLE_ID,
  MUTE_ROLE_ABOVE_ZEP,
  USER_ABOVE_ZEP,
  USER_NOT_MODERATABLE,
  TEMPLATE_PARSE_ERROR,
}

export const RECOVERABLE_PLUGIN_ERROR_MESSAGES = {
  [ERRORS.NO_MUTE_ROLE_IN_CONFIG]: "No mute role specified in config",
  [ERRORS.UNKNOWN_NOTE_CASE]: "Tried to add a note to an unknown case",
  [ERRORS.INVALID_EMOJI]: "Invalid emoji",
  [ERRORS.NO_USER_NOTIFICATION_CHANNEL]: "No user notify channel specified",
  [ERRORS.INVALID_USER_NOTIFICATION_CHANNEL]: "Invalid user notify channel specified",
  [ERRORS.INVALID_USER]: "Invalid user",
  [ERRORS.INVALID_MUTE_ROLE_ID]: "Specified mute role is not valid",
  [ERRORS.MUTE_ROLE_ABOVE_ZEP]: "Specified mute role is above Zeppelin in the role hierarchy",
  [ERRORS.USER_ABOVE_ZEP]: "Cannot mute user, specified user is above Zeppelin in the role hierarchy",
  [ERRORS.USER_NOT_MODERATABLE]: "Cannot mute user, specified user is not moderatable",
  [ERRORS.TEMPLATE_PARSE_ERROR]: "Template parse error",
};

export class RecoverablePluginError extends Error {
  public readonly code: ERRORS;
  public readonly guild?: Guild;

  constructor(code: ERRORS, guild?: Guild) {
    super(RECOVERABLE_PLUGIN_ERROR_MESSAGES[code]);
    this.guild = guild;
    this.code = code;
  }
}
