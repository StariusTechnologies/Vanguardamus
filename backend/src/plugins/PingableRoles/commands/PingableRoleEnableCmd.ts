import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { pingableRolesCmd } from "../types";

export const PingableRoleEnableCmd = pingableRolesCmd({
  trigger: "pingable_role",
  permission: "can_manage",

  signature: {
    channelId: ct.channelId(),
    role: ct.role(),
  },

  async run({ message: msg, args, pluginData }) {
    const existingPingableRole = await pluginData.state.pingableRoles.getByChannelAndRoleId(
      args.channelId,
      args.role.id,
    );
    if (existingPingableRole) {
      pluginData
        .getPlugin(CommonPlugin)
        .sendErrorMessage(msg, `**${args.role.name}** is already set as pingable in <#${args.channelId}>`);
      return;
    }

    await pluginData.state.pingableRoles.add(args.channelId, args.role.id);
    pluginData.state.cache.delete(args.channelId);

    pluginData
      .getPlugin(CommonPlugin)
      .sendSuccessMessage(msg, `**${args.role.name}** has been set as pingable in <#${args.channelId}>`);
  },
});
