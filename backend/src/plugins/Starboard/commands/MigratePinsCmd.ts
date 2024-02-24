import { Snowflake, TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { starboardCmd } from "../types";
import { saveMessageToStarboard } from "../util/saveMessageToStarboard";

export const MigratePinsCmd = starboardCmd({
  trigger: "starboard migrate_pins",
  permission: "can_migrate",

  description: "Posts all pins from a channel to the specified starboard. The pins are NOT unpinned automatically.",

  signature: {
    pinChannel: ct.textChannel(),
    starboardName: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    const config = await pluginData.config.get();
    const starboard = config.boards[args.starboardName];
    if (!starboard) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Unknown starboard specified");
      return;
    }

    const starboardChannel = pluginData.guild.channels.cache.get(starboard.channel_id as Snowflake);
    if (!starboardChannel || !(starboardChannel instanceof TextChannel)) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Starboard has an unknown/invalid channel id");
      return;
    }

    msg.channel.send(`Migrating pins from <#${args.pinChannel.id}> to <#${starboardChannel.id}>...`);

    const pins = [...(await args.pinChannel.messages.fetchPinned().catch(() => [])).values()];
    pins.reverse(); // Migrate pins starting from the oldest message

    for (const pin of pins) {
      const existingStarboardMessage = await pluginData.state.starboardMessages.getMatchingStarboardMessages(
        starboardChannel.id,
        pin.id,
      );
      if (existingStarboardMessage.length > 0) continue;
      await saveMessageToStarboard(pluginData, pin, starboard);
    }

    pluginData
      .getPlugin(CommonPlugin)
      .sendSuccessMessage(msg, `Pins migrated from <#${args.pinChannel.id}> to <#${starboardChannel.id}>!`);
  },
});
