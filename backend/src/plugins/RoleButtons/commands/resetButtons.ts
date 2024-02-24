import { guildPluginMessageCommand } from "knub";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { applyAllRoleButtons } from "../functions/applyAllRoleButtons";
import { RoleButtonsPluginType } from "../types";

export const resetButtonsCmd = guildPluginMessageCommand<RoleButtonsPluginType>()({
  trigger: "role_buttons reset",
  description:
    "In case of issues, you can run this command to have Zeppelin 'forget' about specific role buttons and re-apply them. This will also repost the message, if not targeting an existing message.",
  usage: ".role_buttons reset my_roles",
  permission: "can_reset",
  signature: {
    name: ct.string(),
  },
  async run({ pluginData, args, message }) {
    const config = pluginData.config.get();
    if (!config.buttons[args.name]) {
      pluginData
        .getPlugin(CommonPlugin)
        .sendErrorMessage(message, `Can't find role buttons with the name "${args.name}"`);
      return;
    }

    await pluginData.state.roleButtons.deleteRoleButtonItem(args.name);
    await applyAllRoleButtons(pluginData);
    pluginData.getPlugin(CommonPlugin).sendSuccessMessage(message, "Done!");
  },
});
