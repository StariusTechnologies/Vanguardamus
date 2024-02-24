import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { postCmd } from "../types";
import { formatContent } from "../util/formatContent";

export const EditCmd = postCmd({
  trigger: "edit",
  permission: "can_post",

  signature: {
    message: ct.messageTarget(),
    content: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const targetMessage = await args.message.channel.messages.fetch(args.message.messageId);
    if (!targetMessage) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Unknown message");
      return;
    }

    if (targetMessage.author.id !== pluginData.client.user!.id) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Message wasn't posted by me");
      return;
    }

    targetMessage.channel.messages.edit(targetMessage.id, {
      content: formatContent(args.content),
    });
    pluginData.getPlugin(CommonPlugin).sendSuccessMessage(msg, "Message edited");
  },
});
