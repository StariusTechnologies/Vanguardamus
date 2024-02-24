import { Attachment, ChatInputCommandInteraction, GuildMember, Message, Snowflake, User } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../../data/CaseTypes";
import { LogType } from "../../../../data/LogType";
import { DAYS, MINUTES, UnknownUser } from "../../../../utils";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { LogsPlugin } from "../../../Logs/LogsPlugin";
import { IgnoredEventType, ModActionsPluginType } from "../../types";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../attachmentLinkReaction";
import { formatReasonWithAttachments, formatReasonWithMessageLinkForAttachments } from "../formatReasonForAttachments";
import { ignoreEvent } from "../ignoreEvent";
import { parseReason } from "../parseReason";

export async function actualForceBanCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  authorId: string,
  user: User | UnknownUser,
  reason: string,
  attachments: Array<Attachment>,
  mod: GuildMember,
) {
  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, reason)) {
    return;
  }

  const parsedReason = parseReason(pluginData.config.get(), reason);
  const formattedReason = await formatReasonWithMessageLinkForAttachments(
    pluginData,
    parsedReason,
    context,
    attachments,
  );
  const formattedReasonWithAttachments = formatReasonWithAttachments(parsedReason, attachments);

  ignoreEvent(pluginData, IgnoredEventType.Ban, user.id);
  pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_BAN, user.id);

  try {
    // FIXME: Use banUserId()?
    await pluginData.guild.bans.create(user.id as Snowflake, {
      deleteMessageSeconds: (1 * DAYS) / MINUTES,
      reason: formattedReasonWithAttachments ?? undefined,
    });
  } catch {
    pluginData.getPlugin(CommonPlugin).sendErrorMessage(context, "Failed to forceban member");
    return;
  }

  // Create a case
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const createdCase = await casesPlugin.createCase({
    userId: user.id,
    modId: mod.id,
    type: CaseTypes.Ban,
    reason: formattedReason,
    ppId: mod.id !== authorId ? authorId : undefined,
  });

  // Confirm the action
  pluginData
    .getPlugin(CommonPlugin)
    .sendSuccessMessage(context, `Member forcebanned (Case #${createdCase.case_number})`);

  // Log the action
  pluginData.getPlugin(LogsPlugin).logMemberForceban({
    mod,
    userId: user.id,
    caseNumber: createdCase.case_number,
    reason: formattedReason,
  });

  pluginData.state.events.emit("ban", user.id, formattedReason);
}
