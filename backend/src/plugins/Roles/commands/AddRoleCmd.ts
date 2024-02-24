import { GuildChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn } from "../../../pluginUtils";
import { resolveRoleId, verboseUserMention } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { RoleManagerPlugin } from "../../RoleManager/RoleManagerPlugin";
import { rolesCmd } from "../types";

export const AddRoleCmd = rolesCmd({
  trigger: "addrole",
  permission: "can_assign",
  description: "Add a role to the specified member",

  signature: {
    member: ct.resolvedMember(),
    role: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    if (!canActOn(pluginData, msg.member, args.member, true)) {
      pluginData
        .getPlugin(CommonPlugin)
        .sendErrorMessage(msg, "Cannot add roles to this user: insufficient permissions");
      return;
    }

    const roleId = await resolveRoleId(pluginData.client, pluginData.guild.id, args.role);
    if (!roleId) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Invalid role id");
      return;
    }

    const config = await pluginData.config.getForMessage(msg);
    if (!config.assignable_roles.includes(roleId)) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "You cannot assign that role");
      return;
    }

    // Sanity check: make sure the role is configured properly
    const role = (msg.channel as GuildChannel).guild.roles.cache.get(roleId);
    if (!role) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "You cannot assign that role");
      return;
    }

    if (args.member.roles.cache.has(roleId)) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Member already has that role");
      return;
    }

    pluginData.getPlugin(RoleManagerPlugin).addRole(args.member.id, roleId);

    pluginData.getPlugin(LogsPlugin).logMemberRoleAdd({
      mod: msg.author,
      member: args.member,
      roles: [role],
    });

    pluginData
      .getPlugin(CommonPlugin)
      .sendSuccessMessage(msg, `Added role **${role.name}** to ${verboseUserMention(args.member.user)}!`);
  },
});
