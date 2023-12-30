import { TextBasedChannel } from "discord.js";
import { AnyPluginData, GuildPluginData } from "knub";
import { sendErrorMessage } from "../../../pluginUtils";
import { ModActionsPluginType } from "../types";

export function shouldReactToAttachmentLink(pluginData: GuildPluginData<ModActionsPluginType>) {
  const config = pluginData.config.get();

  return !config.attachment_link_reaction || config.attachment_link_reaction !== "none";
}

export function attachmentLinkShouldRestrict(pluginData: GuildPluginData<ModActionsPluginType>) {
  return pluginData.config.get().attachment_link_reaction === "restrict";
}

export function detectAttachmentLink(reason: string | null | undefined) {
  return reason && /https:\/\/cdn\.discordapp\.com\/attachments/gu.test(reason);
}

export function sendAttachmentLinkDetectionErrorMessage(pluginData: AnyPluginData<any>, channel: TextBasedChannel) {
  sendErrorMessage(
    pluginData,
    channel,
    "You manually added a Discord attachment link to the reason. This link will only work for one month.\n" +
      "You should instead **re-upload** the attachment with the command, in the same message.",
  );
}

export function handleAttachmentLinkDetectionAndGetRestriction(
  pluginData: GuildPluginData<ModActionsPluginType>,
  channel: TextBasedChannel,
  reason: string | null | undefined,
) {
  if (!shouldReactToAttachmentLink(pluginData) || !detectAttachmentLink(reason)) {
    return false;
  }

  sendAttachmentLinkDetectionErrorMessage(pluginData, channel);

  return attachmentLinkShouldRestrict(pluginData);
}
