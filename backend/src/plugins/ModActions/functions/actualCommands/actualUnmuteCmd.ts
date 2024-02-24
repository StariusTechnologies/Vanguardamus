import { Attachment, ChatInputCommandInteraction, GuildMember, Message, User } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import { UnknownUser, asSingleLine, renderUsername } from "../../../../utils";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { MutesPlugin } from "../../../Mutes/MutesPlugin";
import { ModActionsPluginType } from "../../types";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../attachmentLinkReaction";
import { formatReasonWithMessageLinkForAttachments } from "../formatReasonForAttachments";
import { parseReason } from "../parseReason";

export async function actualUnmuteCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  user: User | UnknownUser,
  attachments: Array<Attachment>,
  mod: GuildMember,
  ppId?: string,
  time?: number,
  reason?: string,
) {
  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, reason)) {
    return;
  }

  const parsedReason = reason ? parseReason(pluginData.config.get(), reason) : null;
  const formattedReason =
    parsedReason || attachments.length > 0
      ? await formatReasonWithMessageLinkForAttachments(pluginData, parsedReason ?? "", context, attachments)
      : undefined;

  const mutesPlugin = pluginData.getPlugin(MutesPlugin);
  const result = await mutesPlugin.unmuteUser(user.id, time, {
    modId: mod.id,
    ppId: ppId ?? undefined,
    reason: formattedReason,
  });

  if (!result) {
    pluginData.getPlugin(CommonPlugin).sendErrorMessage(context, "User is not muted!");
    return;
  }

  // Confirm the action to the moderator
  if (time) {
    const timeUntilUnmute = time && humanizeDuration(time);
    pluginData.getPlugin(CommonPlugin).sendSuccessMessage(
      context,
      asSingleLine(`
        Unmuting **${renderUsername(user)}**
        in ${timeUntilUnmute} (Case #${result.case.case_number})
      `),
    );
  } else {
    pluginData.getPlugin(CommonPlugin).sendSuccessMessage(
      context,
      asSingleLine(`
        Unmuted **${renderUsername(user)}**
        (Case #${result.case.case_number})
      `),
    );
  }
}
