import { GuildMember, Message, Snowflake, User } from "discord.js";
import { EventEmitter } from "events";
import { Queue } from "../../Queue";
import { GuildCases } from "../../data/GuildCases";
import { onGuildEvent } from "../../data/GuildEvents";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildMutes } from "../../data/GuildMutes";
import { GuildTempbans } from "../../data/GuildTempbans";
import { mapToPublicFn } from "../../pluginUtils";
import { MINUTES, trimPluginDescription, UnknownUser } from "../../utils";
import { CasesPlugin } from "../Cases/CasesPlugin";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { MutesPlugin } from "../Mutes/MutesPlugin";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { AddCaseMsgCmd } from "./commands/addcase/AddCaseMsgCmd";
import { AddCaseSlashCmd } from "./commands/addcase/AddCaseSlashCmd";
import { BanMsgCmd } from "./commands/ban/BanMsgCmd";
import { BanSlashCmd } from "./commands/ban/BanSlashCmd";
import { CaseMsgCmd } from "./commands/case/CaseMsgCmd";
import { CaseSlashCmd } from "./commands/case/CaseSlashCmd";
import { CasesModMsgCmd } from "./commands/cases/CasesModMsgCmd";
import { CasesSlashCmd } from "./commands/cases/CasesSlashCmd";
import { CasesUserMsgCmd } from "./commands/cases/CasesUserMsgCmd";
import { DeleteCaseMsgCmd } from "./commands/deletecase/DeleteCaseMsgCmd";
import { DeleteCaseSlashCmd } from "./commands/deletecase/DeleteCaseSlashCmd";
import { ForceBanMsgCmd } from "./commands/forceban/ForceBanMsgCmd";
import { ForceBanSlashCmd } from "./commands/forceban/ForceBanSlashCmd";
import { ForceMuteMsgCmd } from "./commands/forcemute/ForceMuteMsgCmd";
import { ForceMuteSlashCmd } from "./commands/forcemute/ForceMuteSlashCmd";
import { ForceUnmuteMsgCmd } from "./commands/forceunmute/ForceUnmuteMsgCmd";
import { ForceUnmuteSlashCmd } from "./commands/forceunmute/ForceUnmuteSlashCmd";
import { HideCaseMsgCmd } from "./commands/hidecase/HideCaseMsgCmd";
import { HideCaseSlashCmd } from "./commands/hidecase/HideCaseSlashCmd";
import { KickMsgCmd } from "./commands/kick/KickMsgCmd";
import { KickSlashCmd } from "./commands/kick/KickSlashCmd";
import { MassBanMsgCmd } from "./commands/massban/MassBanMsgCmd";
import { MassBanSlashCmd } from "./commands/massban/MassBanSlashCmd";
import { MassKickMsgCmd } from "./commands/masskick/MassKickMsgCmd";
import { MassKickSlashCmd } from "./commands/masskick/MassKickSlashCmd";
import { MassMuteMsgCmd } from "./commands/massmute/MassMuteMsgCmd";
import { MassMuteSlashSlashCmd } from "./commands/massmute/MassMuteSlashCmd";
import { MassUnbanMsgCmd } from "./commands/massunban/MassUnbanMsgCmd";
import { MassUnbanSlashCmd } from "./commands/massunban/MassUnbanSlashCmd";
import { MassWarnMsgCmd } from "./commands/masswarn/MassWarnMsgCmd";
import { MassWarnSlashCmd } from "./commands/masswarn/MassWarnSlashCmd";
import { MuteMsgCmd } from "./commands/mute/MuteMsgCmd";
import { MuteSlashCmd } from "./commands/mute/MuteSlashCmd";
import { NoteMsgCmd } from "./commands/note/NoteMsgCmd";
import { NoteSlashCmd } from "./commands/note/NoteSlashCmd";
import { UnbanMsgCmd } from "./commands/unban/UnbanMsgCmd";
import { UnbanSlashCmd } from "./commands/unban/UnbanSlashCmd";
import { UnhideCaseMsgCmd } from "./commands/unhidecase/UnhideCaseMsgCmd";
import { UnhideCaseSlashCmd } from "./commands/unhidecase/UnhideCaseSlashCmd";
import { UnmuteMsgCmd } from "./commands/unmute/UnmuteMsgCmd";
import { UnmuteSlashCmd } from "./commands/unmute/UnmuteSlashCmd";
import { UpdateMsgCmd } from "./commands/update/UpdateMsgCmd";
import { UpdateSlashCmd } from "./commands/update/UpdateSlashCmd";
import { WarnMsgCmd } from "./commands/warn/WarnMsgCmd";
import { WarnSlashCmd } from "./commands/warn/WarnSlashCmd";
import { AuditLogEvents } from "./events/AuditLogEvents";
import { CreateBanCaseOnManualBanEvt } from "./events/CreateBanCaseOnManualBanEvt";
import { CreateUnbanCaseOnManualUnbanEvt } from "./events/CreateUnbanCaseOnManualUnbanEvt";
import { PostAlertOnMemberJoinEvt } from "./events/PostAlertOnMemberJoinEvt";
import { banUserId } from "./functions/banUserId";
import { clearTempban } from "./functions/clearTempban";
import {
  hasBanPermission,
  hasMutePermission,
  hasNotePermission,
  hasWarnPermission,
} from "./functions/hasModActionPerm";
import { kickMember } from "./functions/kickMember";
import { offModActionsEvent } from "./functions/offModActionsEvent";
import { onModActionsEvent } from "./functions/onModActionsEvent";
import { updateCase } from "./functions/updateCase";
import { warnMember } from "./functions/warnMember";
import {
  AttachmentLinkReactionType,
  BanOptions,
  KickOptions,
  ModActionsPluginType,
  WarnOptions,
  modActionsSlashGroup,
  zModActionsConfig,
} from "./types";
import { AutocompleteEvt } from "./events/AutocompleteEvt";

const defaultOptions = {
  config: {
    dm_on_warn: true,
    dm_on_kick: false,
    dm_on_ban: false,
    message_on_warn: false,
    message_on_kick: false,
    message_on_ban: false,
    message_channel: null,
    warn_message: "You have received a warning on the {guildName} server: {reason}",
    kick_message: "You have been kicked from the {guildName} server. Reason given: {reason}",
    ban_message: "You have been banned from the {guildName} server. Reason given: {reason}",
    tempban_message: "You have been banned from the {guildName} server for {banTime}. Reason given: {reason}",
    alert_on_rejoin: false,
    alert_channel: null,
    warn_notify_enabled: false,
    warn_notify_threshold: 5,
    warn_notify_message:
      "The user already has **{priorWarnings}** warnings!\n Please check their prior cases and assess whether or not to warn anyways.\n Proceed with the warning?",
    ban_delete_message_days: 1,
    attachment_link_reaction: "warn" as AttachmentLinkReactionType,
    attachment_storing_channel: null,

    can_note: false,
    can_warn: false,
    can_mute: false,
    can_kick: false,
    can_ban: false,
    can_unban: false,
    can_view: false,
    can_addcase: false,
    can_massunban: false,
    can_massban: false,
    can_masskick: false,
    can_massmute: false,
    can_masswarn: false,
    can_hidecase: false,
    can_deletecase: false,
    can_act_as_other: false,
    create_cases_for_manual_actions: true,
    reason_aliases: {},
    embed_colour: 0x2b2d31,
    embed_color: 0x2b2d31,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        can_note: true,
        can_warn: true,
        can_mute: true,
        can_kick: true,
        can_ban: true,
        can_unban: true,
        can_view: true,
        can_addcase: true,
      },
    },
    {
      level: ">=100",
      config: {
        can_massunban: true,
        can_massban: true,
        can_masskick: true,
        can_massmute: true,
        can_masswarn: true,
        can_hidecase: true,
        can_act_as_other: true,
      },
    },
  ],
};

export const ModActionsPlugin = zeppelinGuildPlugin<ModActionsPluginType>()({
  name: "mod_actions",
  showInDocs: true,
  info: {
    prettyName: "Mod actions",
    description: trimPluginDescription(`
      This plugin contains the 'typical' mod actions such as warning, muting, kicking, banning, etc.
    `),
    configSchema: zModActionsConfig,
  },

  dependencies: () => [TimeAndDatePlugin, CasesPlugin, MutesPlugin, LogsPlugin],
  configParser: (input) => zModActionsConfig.parse(input),
  defaultOptions,

  events: [
    CreateBanCaseOnManualBanEvt,
    CreateUnbanCaseOnManualUnbanEvt,
    PostAlertOnMemberJoinEvt,
    AuditLogEvents,
    AutocompleteEvt,
  ],

  slashCommands: [
    modActionsSlashGroup({
      name: "mod",
      description: "Moderation actions",
      defaultMemberPermissions: "0",
      subcommands: [
        { type: "slash", ...AddCaseSlashCmd },
        { type: "slash", ...BanSlashCmd },
        { type: "slash", ...CaseSlashCmd },
        { type: "slash", ...CasesSlashCmd },
        { type: "slash", ...DeleteCaseSlashCmd },
        { type: "slash", ...ForceBanSlashCmd },
        { type: "slash", ...ForceMuteSlashCmd },
        { type: "slash", ...ForceUnmuteSlashCmd },
        { type: "slash", ...HideCaseSlashCmd },
        { type: "slash", ...KickSlashCmd },
        { type: "slash", ...MassBanSlashCmd },
        { type: "slash", ...MassKickSlashCmd },
        { type: "slash", ...MassMuteSlashSlashCmd },
        { type: "slash", ...MassUnbanSlashCmd },
        { type: "slash", ...MassWarnSlashCmd },
        { type: "slash", ...MuteSlashCmd },
        { type: "slash", ...NoteSlashCmd },
        { type: "slash", ...UnbanSlashCmd },
        { type: "slash", ...UnhideCaseSlashCmd },
        { type: "slash", ...UnmuteSlashCmd },
        { type: "slash", ...UpdateSlashCmd },
        { type: "slash", ...WarnSlashCmd },
      ],
    }),
  ],

  messageCommands: [
    UpdateMsgCmd,
    NoteMsgCmd,
    WarnMsgCmd,
    MuteMsgCmd,
    ForceMuteMsgCmd,
    UnmuteMsgCmd,
    ForceUnmuteMsgCmd,
    KickMsgCmd,
    BanMsgCmd,
    UnbanMsgCmd,
    ForceBanMsgCmd,
    MassBanMsgCmd,
    MassKickMsgCmd,
    MassMuteMsgCmd,
    MassUnbanMsgCmd,
    MassWarnMsgCmd,
    AddCaseMsgCmd,
    CaseMsgCmd,
    CasesUserMsgCmd,
    CasesModMsgCmd,
    HideCaseMsgCmd,
    UnhideCaseMsgCmd,
    DeleteCaseMsgCmd,
  ],

  public: {
    warnMember(pluginData) {
      return (
        reason: string,
        reasonWithAttachments: string,
        user: User | UnknownUser,
        member?: GuildMember | null,
        warnOptions?: WarnOptions,
      ) => {
        return warnMember(pluginData, reason, reasonWithAttachments, user, member, warnOptions);
      };
    },

    kickMember(pluginData) {
      return (member: GuildMember, reason: string, reasonWithAttachments: string, kickOptions?: KickOptions) => {
        return kickMember(pluginData, member, reason, reasonWithAttachments, kickOptions);
      };
    },

    banUserId(pluginData) {
      return (
        userId: string,
        reason?: string,
        reasonWithAttachments?: string,
        banOptions?: BanOptions,
        banTime?: number,
      ) => {
        return banUserId(pluginData, userId, reason, reasonWithAttachments, banOptions, banTime);
      };
    },

    updateCase(pluginData) {
      return (msg: Message, caseNumber: number | null, note: string) => {
        return updateCase(pluginData, msg, msg.author, caseNumber ?? undefined, note, [...msg.attachments.values()]);
      };
    },

    hasNotePermission(pluginData) {
      return (member: GuildMember, channelId: Snowflake) => {
        return hasNotePermission(pluginData, member, channelId);
      };
    },

    hasWarnPermission(pluginData) {
      return (member: GuildMember, channelId: Snowflake) => {
        return hasWarnPermission(pluginData, member, channelId);
      };
    },

    hasMutePermission(pluginData) {
      return (member: GuildMember, channelId: Snowflake) => {
        return hasMutePermission(pluginData, member, channelId);
      };
    },

    hasBanPermission(pluginData) {
      return (member: GuildMember, channelId: Snowflake) => {
        return hasBanPermission(pluginData, member, channelId);
      };
    },

    on: mapToPublicFn(onModActionsEvent),
    off: mapToPublicFn(offModActionsEvent),
    getEventEmitter(pluginData) {
      return () => pluginData.state.events;
    },
  },

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.mutes = GuildMutes.getGuildInstance(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);
    state.tempbans = GuildTempbans.getGuildInstance(guild.id);
    state.serverLogs = new GuildLogs(guild.id);

    state.unloaded = false;
    state.ignoredEvents = [];
    // Massbans can take a while depending on rate limits,
    // so we're giving each massban 15 minutes to complete before launching the next massban
    state.massbanQueue = new Queue(15 * MINUTES);

    // Same goes for masskicks, since they have to send a lot of DMs
    state.masskickQueue = new Queue(15 * MINUTES);

    // Same goes for masswarns, since they have to send a lot of DMs
    state.masswarnQueue = new Queue(15 * MINUTES);

    state.events = new EventEmitter();
  },

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.unregisterGuildEventListener = onGuildEvent(guild.id, "expiredTempban", (tempban) =>
      clearTempban(pluginData, tempban),
    );
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    state.unloaded = true;
    state.unregisterGuildEventListener?.();
    state.events.removeAllListeners();
  },
});
