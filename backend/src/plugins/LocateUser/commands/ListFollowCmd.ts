import { commandTypeHelpers as ct } from "../../../commandTypes";
import { clearExpiringVCAlert } from "../../../data/loops/expiringVCAlertsLoop";
import { createChunkedMessage, sorter } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { locateUserCmd } from "../types";

export const ListFollowCmd = locateUserCmd({
  trigger: ["follows", "fs"],
  description: "Displays all of your active alerts ordered by expiration time",
  usage: ".fs",
  permission: "can_alert",

  async run({ message: msg, pluginData }) {
    const alerts = await pluginData.state.alerts.getAlertsByRequestorId(msg.member.id);
    if (alerts.length === 0) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "You have no active alerts!");
      return;
    }

    alerts.sort(sorter("expires_at"));
    const longestNum = (alerts.length + 1).toString().length;
    const lines = Array.from(alerts.entries()).map(([i, alert]) => {
      const num = i + 1;
      const paddedNum = num.toString().padStart(longestNum, " ");
      return `\`${paddedNum}.\` \`${alert.expires_at}\` **Target:** <@!${alert.user_id}> **Reminder:** \`${
        alert.body
      }\` **Active:** ${alert.active.valueOf()}`;
    });
    await createChunkedMessage(msg.channel, lines.join("\n"));
  },
});

export const DeleteFollowCmd = locateUserCmd({
  trigger: ["follows delete", "fs d"],
  description:
    "Deletes the alert at the position <num>.\nThe value needed for <num> can be found using `!follows` (`!fs`)",
  usage: ".fs d <num>",
  permission: "can_alert",

  signature: {
    num: ct.number({ required: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const alerts = await pluginData.state.alerts.getAlertsByRequestorId(msg.member.id);
    alerts.sort(sorter("expires_at"));

    if (args.num > alerts.length || args.num <= 0) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Unknown alert!");
      return;
    }

    const toDelete = alerts[args.num - 1];
    clearExpiringVCAlert(toDelete);
    await pluginData.state.alerts.delete(toDelete.id);

    pluginData.getPlugin(CommonPlugin).sendSuccessMessage(msg, "Alert deleted");
  },
});
