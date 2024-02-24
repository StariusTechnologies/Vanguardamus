import { ChannelType } from "discord.js";
import { slashOptions } from "knub";
import { hasPermission } from "../../../../pluginUtils";
import { UserNotificationMethod, convertDelayStringToMS } from "../../../../utils";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { actualMuteCmd } from "../../functions/actualCommands/actualMuteCmd";
import { readContactMethodsFromArgs } from "../../functions/readContactMethodsFromArgs";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants";
import { slashCmdReasonAliasAutocomplete } from "../../functions/slashCmdReasonAliasAutocomplete";

const opts = [
  slashOptions.string({ name: "time", description: "The duration of the mute", required: false }),
  {
    ...slashOptions.string({ name: "reason", description: "The reason", required: false }),
    getExtraAPIProps: () => ({
      autocomplete: true,
    }),
  },
  slashOptions.user({ name: "mod", description: "The moderator to mute as", required: false }),
  slashOptions.string({
    name: "notify",
    description: "How to notify",
    required: false,
    choices: [
      { name: "DM", value: "dm" },
      { name: "Channel", value: "channel" },
    ],
  }),
  slashOptions.channel({
    name: "notify-channel",
    description: "The channel to notify in",
    channelTypes: [ChannelType.GuildText, ChannelType.PrivateThread, ChannelType.PublicThread],
    required: false,
  }),
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_CREATION, {
    name: "attachment",
    description: "An attachment to add to the reason of the mute",
  }),
];

export function ForceMuteSlashCmdAutocomplete({ pluginData, interaction }) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name !== "reason") {
    interaction.respond([]);
    return;
  }

  slashCmdReasonAliasAutocomplete({ pluginData, interaction });
}

export const ForceMuteSlashCmd = {
  name: "forcemute",
  configPermission: "can_mute",
  description: "Force-mute the specified user, even if they're not on the server",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "The user to mute", required: true }), ...opts],

  async run({ interaction, options, pluginData }) {
    const attachments = retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_CREATION, options, "attachment");

    if ((!options.reason || options.reason.trim() === "") && attachments.length < 1) {
      pluginData
        .getPlugin(CommonPlugin)
        .sendErrorMessage(interaction, "Text or attachment required", undefined, undefined, true);

      return;
    }

    let mod = interaction.member;
    let ppId: string | undefined;
    const canActAsOther = await hasPermission(pluginData, "can_act_as_other", {
      channel: interaction.channel,
      member: interaction.member,
    });

    if (options.mod) {
      if (!canActAsOther) {
        pluginData
          .getPlugin(CommonPlugin)
          .sendErrorMessage(interaction, "You don't have permission to act as another moderator");
        return;
      }

      mod = options.mod;
      ppId = interaction.user.id;
    }

    const convertedTime = options.time ? convertDelayStringToMS(options.time) ?? undefined : undefined;
    if (options.time && !convertedTime) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(interaction, `Could not convert ${options.time} to a delay`);
      return;
    }

    let contactMethods: UserNotificationMethod[] | undefined;
    try {
      contactMethods = readContactMethodsFromArgs(options) ?? undefined;
    } catch (e) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(interaction, e.message);
      return;
    }

    actualMuteCmd(
      pluginData,
      interaction,
      options.user,
      attachments,
      mod,
      ppId,
      convertedTime,
      options.reason,
      contactMethods,
    );
  },
};
