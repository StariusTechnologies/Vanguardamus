import { commandTypeHelpers as ct } from "../../../commandTypes";
import { parseInviteCodeInput } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { getInviteInfoEmbed } from "../functions/getInviteInfoEmbed";
import { utilityCmd } from "../types";

export const InviteInfoCmd = utilityCmd({
  trigger: ["invite", "inviteinfo"],
  description: "Show information about an invite",
  usage: ".invite overwatch",
  permission: "can_inviteinfo",

  signature: {
    inviteCode: ct.string(),
  },

  async run({ message, args, pluginData }) {
    const inviteCode = parseInviteCodeInput(args.inviteCode);
    const embed = await getInviteInfoEmbed(pluginData, inviteCode);
    if (!embed) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, "Unknown invite");
      return;
    }

    message.channel.send({ embeds: [embed] });
  },
});
