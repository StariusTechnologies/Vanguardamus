import { Attachment, ChatInputCommandInteraction, GuildMember, Message, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../../data/CaseTypes";
import { LogType } from "../../../../data/LogType";
import { isContextInteraction, sendContextResponse } from "../../../../pluginUtils";
import { MINUTES, noop } from "../../../../utils";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { LogsPlugin } from "../../../Logs/LogsPlugin";
import { IgnoredEventType, ModActionsPluginType } from "../../types";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../attachmentLinkReaction";
import { formatReasonWithMessageLinkForAttachments } from "../formatReasonForAttachments";
import { ignoreEvent } from "../ignoreEvent";
import { isBanned } from "../isBanned";
import { parseReason } from "../parseReason";

export async function actualMassUnbanCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  userIds: string[],
  author: GuildMember,
  reason: string,
  attachments: Attachment[],
) {
  // Limit to 100 users at once (arbitrary?)
  if (userIds.length > 100) {
    pluginData.getPlugin(CommonPlugin).sendErrorMessage(context, `Can only mass-unban max 100 users at once`);
    return;
  }

  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, reason)) {
    return;
  }

  const parsedReason = parseReason(pluginData.config.get(), reason);
  const unbanReason = await formatReasonWithMessageLinkForAttachments(pluginData, parsedReason, context, attachments);

  // Ignore automatic unban cases and logs for these users
  // We'll create our own cases below and post a single "mass unbanned" log instead
  userIds.forEach((userId) => {
    // Use longer timeouts since this can take a while
    ignoreEvent(pluginData, IgnoredEventType.Unban, userId, 2 * MINUTES);
    pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, userId, 2 * MINUTES);
  });

  // Show a loading indicator since this can take a while
  const loadingMsg = await sendContextResponse(context, { content: "Unbanning...", ephemeral: true });

  // Unban each user and count failed unbans (if any)
  const failedUnbans: Array<{ userId: string; reason: UnbanFailReasons }> = [];
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const shouldLogEachCase = casesPlugin.shouldLogEachMassUnbanCase();
  for (const userId of userIds) {
    if (!(await isBanned(pluginData, userId))) {
      failedUnbans.push({ userId, reason: UnbanFailReasons.NOT_BANNED });
      continue;
    }

    try {
      await pluginData.guild.bans.remove(userId as Snowflake, unbanReason ?? undefined);

      const createdCase = await casesPlugin.createCase({
        userId,
        modId: author.id,
        type: CaseTypes.Unban,
        reason: `Mass unban: ${unbanReason}`,
        postInCaseLogOverride: shouldLogEachCase,
      });

      if (shouldLogEachCase) {
        pluginData.getPlugin(LogsPlugin).logMemberUnban({
          mod: author.user,
          userId,
          caseNumber: createdCase.case_number,
          reason: `Mass unban: ${unbanReason}`,
        });
      }
    } catch {
      failedUnbans.push({ userId, reason: UnbanFailReasons.UNBAN_FAILED });
    }
  }

  if (!isContextInteraction(context)) {
    // Clear loading indicator
    loadingMsg.delete().catch(noop);
  }

  const successfulUnbanCount = userIds.length - failedUnbans.length;
  if (successfulUnbanCount === 0) {
    // All unbans failed - don't create a log entry and notify the user
    pluginData
      .getPlugin(CommonPlugin)
      .sendErrorMessage(context, "All unbans failed. Make sure the IDs are valid and banned.");
  } else {
    // Some or all unbans were successful. Create a log entry for the mass unban and notify the user.
    pluginData.getPlugin(LogsPlugin).logMassUnban({
      mod: author.user,
      count: successfulUnbanCount,
      reason: unbanReason,
    });

    if (failedUnbans.length) {
      const notBanned = failedUnbans.filter((x) => x.reason === UnbanFailReasons.NOT_BANNED);
      const unbanFailed = failedUnbans.filter((x) => x.reason === UnbanFailReasons.UNBAN_FAILED);

      let failedMsg = "";
      if (notBanned.length > 0) {
        failedMsg += `${notBanned.length}x ${UnbanFailReasons.NOT_BANNED}:`;
        notBanned.forEach((fail) => {
          failedMsg += " " + fail.userId;
        });
      }
      if (unbanFailed.length > 0) {
        failedMsg += `\n${unbanFailed.length}x ${UnbanFailReasons.UNBAN_FAILED}:`;
        unbanFailed.forEach((fail) => {
          failedMsg += " " + fail.userId;
        });
      }

      pluginData
        .getPlugin(CommonPlugin)
        .sendSuccessMessage(
          context,
          `Unbanned ${successfulUnbanCount} users, ${failedUnbans.length} failed:\n${failedMsg}`,
        );
    } else {
      pluginData
        .getPlugin(CommonPlugin)
        .sendSuccessMessage(context, `Unbanned ${successfulUnbanCount} users successfully`);
    }
  }
}

enum UnbanFailReasons {
  NOT_BANNED = "Not banned",
  UNBAN_FAILED = "Unban failed",
}
