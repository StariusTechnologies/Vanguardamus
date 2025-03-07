import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { getBaseUrl } from "../../../pluginUtils";
import { canReadChannel } from "../../../utils/canReadChannel";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { utilityCmd } from "../types";

export const SourceCmd = utilityCmd({
  trigger: "source",
  description: "View the message source of the specified message id",
  usage: ".source 534722219696455701",
  permission: "can_source",

  signature: {
    message: ct.messageTarget(),
  },

  async run({ message: cmdMessage, args, pluginData }) {
    if (!canReadChannel(args.message.channel, cmdMessage.member)) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(cmdMessage, "Unknown message");
      return;
    }

    const message = await args.message.channel.messages.fetch(args.message.messageId);
    if (!message) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(cmdMessage, "Unknown message");
      return;
    }

    const textSource = message.content || "<no text content>";
    const fullSource = JSON.stringify({
      id: message.id,
      content: message.content,
      attachments: message.attachments,
      embeds: message.embeds,
      stickers: message.stickers,
    });

    const source = `${textSource}\n\nSource:\n\n${fullSource}`;

    const archiveId = await pluginData.state.archives.create(source, moment.utc().add(1, "hour"));
    const baseUrl = getBaseUrl(pluginData);
    const url = pluginData.state.archives.getUrl(baseUrl, archiveId);
    cmdMessage.channel.send(`Message source: ${url}`);
  },
});
