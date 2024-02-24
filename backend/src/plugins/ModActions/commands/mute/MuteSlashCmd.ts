import { ChannelType } from "discord.js";
import { slashOptions } from "knub";
import { canActOn, hasPermission } from "../../../../pluginUtils";
import { UserNotificationMethod, convertDelayStringToMS, resolveMember } from "../../../../utils";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions";
import { waitForButtonConfirm } from "../../../../utils/waitForInteraction";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { actualMuteCmd } from "../../functions/actualCommands/actualMuteCmd";
import { isBanned } from "../../functions/isBanned";
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

export function MuteSlashCmdAutocomplete({ pluginData, interaction }) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name !== "reason") {
    interaction.respond([]);
    return;
  }

  slashCmdReasonAliasAutocomplete({ pluginData, interaction });
}

export const MuteSlashCmd = {
  name: "mute",
  configPermission: "can_mute",
  description: "Mute the specified member",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "The user to mute", required: true }), ...opts],

  async run({ interaction, options, pluginData }) {
    const attachments = retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_CREATION, options, "attachment");
    const memberToMute = await resolveMember(pluginData.client, pluginData.guild, options.user.id);

    if (!memberToMute) {
      const _isBanned = await isBanned(pluginData, options.user.id);
      const prefix = pluginData.fullConfig.prefix;
      if (_isBanned) {
        pluginData
          .getPlugin(CommonPlugin)
          .sendErrorMessage(interaction, `User is banned. Use \`${prefix}forcemute\` if you want to mute them anyway.`);
        return;
      } else {
        // Ask the mod if we should upgrade to a forcemute as the user is not on the server
        const reply = await waitForButtonConfirm(
          interaction,
          { content: "User not found on the server, forcemute instead?" },
          { confirmText: "Yes", cancelText: "No", restrictToId: interaction.member.id },
        );

        if (!reply) {
          pluginData
            .getPlugin(CommonPlugin)
            .sendErrorMessage(interaction, "User not on server, mute cancelled by moderator");
          return;
        }
      }
    }

    // Make sure we're allowed to mute this member
    if (memberToMute && !canActOn(pluginData, interaction.member, memberToMute)) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(interaction, "Cannot mute: insufficient permissions");
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
