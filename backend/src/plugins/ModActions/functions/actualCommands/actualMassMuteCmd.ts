import { Attachment, ChatInputCommandInteraction, GuildMember, Message, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../../data/LogType";
import { logger } from "../../../../logger";
import { canActOn, isContextInteraction, sendContextResponse } from "../../../../pluginUtils";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { LogsPlugin } from "../../../Logs/LogsPlugin";
import { MutesPlugin } from "../../../Mutes/MutesPlugin";
import { ModActionsPluginType } from "../../types";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../attachmentLinkReaction";
import { formatReasonWithAttachments, formatReasonWithMessageLinkForAttachments } from "../formatReasonForAttachments";
import { parseReason } from "../parseReason";

export async function actualMassMuteCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  userIds: string[],
  author: GuildMember,
  reason: string,
  attachments: Attachment[],
) {
  // Limit to 100 users at once (arbitrary?)
  if (userIds.length > 100) {
    pluginData.getPlugin(CommonPlugin).sendErrorMessage(context, `Can only massmute max 100 users at once`);
    return;
  }

  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, reason)) {
    return;
  }

  const parsedReason = parseReason(pluginData.config.get(), reason);
  const muteReason = await formatReasonWithMessageLinkForAttachments(pluginData, parsedReason, context, attachments);
  const muteReasonWithAttachments = formatReasonWithAttachments(parsedReason, attachments);

  // Verify we can act upon all users
  for (const userId of userIds) {
    const member = pluginData.guild.members.cache.get(userId as Snowflake);
    if (member && !canActOn(pluginData, author, member)) {
      pluginData
        .getPlugin(CommonPlugin)
        .sendErrorMessage(context, "Cannot massmute one or more users: insufficient permissions");
      return;
    }
  }

  // Ignore automatic mute cases and logs for these users
  // We'll create our own cases below and post a single "mass muted" log instead
  userIds.forEach((userId) => {
    // Use longer timeouts since this can take a while
    pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_MUTE, userId, 120 * 1000);
  });

  // Show loading indicator
  const loadingMsg = await sendContextResponse(context, { content: "Muting...", ephemeral: true });

  // Mute everyone and count fails
  const modId = author.id;
  const failedMutes: string[] = [];
  const mutesPlugin = pluginData.getPlugin(MutesPlugin);
  for (const userId of userIds) {
    try {
      await mutesPlugin.muteUser(userId, 0, `Mass mute: ${muteReason}`, `Mass mute: ${muteReasonWithAttachments}`, {
        caseArgs: {
          modId,
        },
      });
    } catch (e) {
      logger.info(e);
      failedMutes.push(userId);
    }
  }

  if (!isContextInteraction(context)) {
    // Clear loading indicator
    loadingMsg.delete();
  }

  const successfulMuteCount = userIds.length - failedMutes.length;
  if (successfulMuteCount === 0) {
    // All mutes failed
    pluginData.getPlugin(CommonPlugin).sendErrorMessage(context, "All mutes failed. Make sure the IDs are valid.");
  } else {
    // Success on all or some mutes
    pluginData.getPlugin(LogsPlugin).logMassMute({
      mod: author.user,
      count: successfulMuteCount,
    });

    if (failedMutes.length) {
      pluginData
        .getPlugin(CommonPlugin)
        .sendSuccessMessage(
          context,
          `Muted ${successfulMuteCount} users, ${failedMutes.length} failed: ${failedMutes.join(" ")}`,
        );
    } else {
      pluginData.getPlugin(CommonPlugin).sendSuccessMessage(context, `Muted ${successfulMuteCount} users successfully`);
    }
  }
}
