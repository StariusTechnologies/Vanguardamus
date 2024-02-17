import { GuildMember } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { logger } from "../../../logger";
import { canActOn } from "../../../pluginUtils";
import { resolveMember, resolveRoleId, successMessage } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { RoleManagerPlugin } from "../../RoleManager/RoleManagerPlugin";
import { rolesCmd } from "../types";

export const MassAddRoleCmd = rolesCmd({
  trigger: "massaddrole",
  permission: "can_mass_assign",

  signature: {
    role: ct.string(),
    members: ct.string({ rest: true }),
  },

  async run({ message: msg, args, pluginData }) {
    msg.channel.send(`Resolving members...`);

    const members: GuildMember[] = [];
    const unknownMembers: string[] = [];
    for (const memberId of args.members) {
      const member = await resolveMember(pluginData.client, pluginData.guild, memberId);
      if (member) members.push(member);
      else unknownMembers.push(memberId);
    }

    for (const member of members) {
      if (!canActOn(pluginData, msg.member, member, true)) {
        pluginData
          .getPlugin(CommonPlugin)
          .sendErrorMessage(msg, "Cannot add roles to 1 or more specified members: insufficient permissions");
        return;
      }
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

    const role = pluginData.guild.roles.cache.get(roleId);
    if (!role) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "You cannot assign that role");
      return;
    }

    const membersWithoutTheRole = members.filter((m) => !m.roles.cache.has(roleId));
    let assigned = 0;
    const failed: string[] = [];
    const alreadyHadRole = members.length - membersWithoutTheRole.length;

    msg.channel.send(
      `Adding role **${role.name}** to ${membersWithoutTheRole.length} ${
        membersWithoutTheRole.length === 1 ? "member" : "members"
      }...`,
    );

    for (const member of membersWithoutTheRole) {
      try {
        pluginData.getPlugin(RoleManagerPlugin).addRole(member.id, roleId);
        pluginData.getPlugin(LogsPlugin).logMemberRoleAdd({
          member,
          roles: [role],
          mod: msg.author,
        });
        assigned++;
      } catch (e) {
        logger.warn(`Error when adding role via !massaddrole: ${e.message}`);
        failed.push(member.id);
      }
    }

    let resultMessage = `Added role **${role.name}** to ${assigned} ${assigned === 1 ? "member" : "members"}!`;
    if (alreadyHadRole) {
      resultMessage += ` ${alreadyHadRole} ${alreadyHadRole === 1 ? "member" : "members"} already had the role.`;
    }

    if (failed.length) {
      resultMessage += `\nFailed to add the role to the following members: ${failed.join(", ")}`;
    }

    if (unknownMembers.length) {
      resultMessage += `\nUnknown members: ${unknownMembers.join(", ")}`;
    }

    msg.channel.send(successMessage(resultMessage));
  },
});
