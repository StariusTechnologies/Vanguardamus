import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { canActOn, hasPermission } from "../../../../pluginUtils";
import { errorMessage, resolveMember, resolveUser } from "../../../../utils";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { actualWarnCmd } from "../../functions/actualCommands/actualWarnCmd";
import { isBanned } from "../../functions/isBanned";
import { readContactMethodsFromArgs } from "../../functions/readContactMethodsFromArgs";
import { modActionsMsgCmd } from "../../types";

export const WarnMsgCmd = modActionsMsgCmd({
  trigger: "warn",
  permission: "can_warn",
  description: "Send a warning to the specified user",

  signature: {
    user: ct.string(),
    reason: ct.string({ catchAll: true }),

    mod: ct.member({ option: true }),
    notify: ct.string({ option: true }),
    "notify-channel": ct.textChannel({ option: true }),
  },

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user);
    if (!user.id) {
      await pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, `User not found`);
      return;
    }

    const memberToWarn = await resolveMember(pluginData.client, pluginData.guild, user.id);

    if (!memberToWarn) {
      const _isBanned = await isBanned(pluginData, user.id);
      if (_isBanned) {
        await pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, `User is banned`);
      } else {
        await pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, `User not found on the server`);
      }
    }

    // Make sure we're allowed to warn this member
    if (memberToWarn && !canActOn(pluginData, msg.member, memberToWarn)) {
      await pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Cannot warn: insufficient permissions");
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg }))) {
        msg.channel.send(errorMessage("You don't have permission to use -mod"));
        return;
      }

      mod = args.mod;
    }

    let contactMethods;
    try {
      contactMethods = readContactMethodsFromArgs(args);
    } catch (e) {
      await pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, e.message);
      return;
    }

    actualWarnCmd(
      pluginData,
      msg,
      msg.author.id,
      mod,
      args.reason,
      [...msg.attachments.values()],
      user,
      memberToWarn,
      contactMethods,
    );
  },
});
