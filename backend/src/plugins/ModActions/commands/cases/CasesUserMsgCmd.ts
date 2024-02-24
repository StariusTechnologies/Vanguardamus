import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { resolveMember, resolveUser, UnknownUser } from "../../../../utils";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { actualCasesCmd } from "../../functions/actualCommands/actualCasesCmd";
import { modActionsMsgCmd } from "../../types";

const opts = {
  mod: ct.userId({ option: true }),
  expand: ct.bool({ option: true, isSwitch: true, shortcut: "e" }),
  hidden: ct.bool({ option: true, isSwitch: true, shortcut: "h" }),
  reverseFilters: ct.switchOption({ def: false, shortcut: "r" }),
  notes: ct.switchOption({ def: false, shortcut: "n" }),
  warns: ct.switchOption({ def: false, shortcut: "w" }),
  mutes: ct.switchOption({ def: false, shortcut: "m" }),
  unmutes: ct.switchOption({ def: false, shortcut: "um" }),
  kicks: ct.switchOption({ def: false, shortcut: "k" }),
  bans: ct.switchOption({ def: false, shortcut: "b" }),
  unbans: ct.switchOption({ def: false, shortcut: "ub" }),
  show: ct.switchOption({ def: false, shortcut: "sh" }),
  search: ct.string({ option: true, shortcut: "s" }),
};

export const CasesUserMsgCmd = modActionsMsgCmd({
  trigger: ["cases", "modlogs", "infractions", "logs"],
  permission: "can_view",
  description: "Show a list of cases the specified user has",

  signature: [
    {
      user: ct.string(),

      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const user =
      (await resolveMember(pluginData.client, pluginData.guild, args.user)) ||
      (await resolveUser(pluginData.client, args.user));

    if (user instanceof UnknownUser) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, `User not found`);
      return;
    }

    return actualCasesCmd(
      pluginData,
      msg,
      args.mod,
      user,
      msg.member,
      args.notes,
      args.warns,
      args.mutes,
      args.unmutes,
      args.kicks,
      args.bans,
      args.unbans,
      args.reverseFilters,
      args.hidden,
      args.expand,
      args.show,
      args.search,
    );
  },
});
