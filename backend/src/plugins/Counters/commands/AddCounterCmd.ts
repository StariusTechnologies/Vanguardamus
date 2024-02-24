import { Snowflake, TextChannel } from "discord.js";
import { guildPluginMessageCommand } from "knub";
import { waitForReply } from "knub/helpers";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { UnknownUser, resolveUser } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { changeCounterValue } from "../functions/changeCounterValue";
import { CountersPluginType } from "../types";

export const AddCounterCmd = guildPluginMessageCommand<CountersPluginType>()({
  trigger: ["counters add", "counter add", "addcounter"],
  permission: "can_edit",

  signature: [
    {
      counterName: ct.string(),
      amount: ct.number(),
    },
    {
      counterName: ct.string(),
      user: ct.resolvedUser(),
      amount: ct.number(),
    },
    {
      counterName: ct.string(),
      channel: ct.textChannel(),
      amount: ct.number(),
    },
    {
      counterName: ct.string(),
      channel: ct.textChannel(),
      user: ct.resolvedUser(),
      amount: ct.number(),
    },
    {
      counterName: ct.string(),
      user: ct.resolvedUser(),
      channel: ct.textChannel(),
      amount: ct.number(),
    },
  ],

  async run({ pluginData, message, args }) {
    const config = await pluginData.config.getForMessage(message);
    const counter = config.counters[args.counterName];
    const counterId = pluginData.state.counterIds[args.counterName];
    if (!counter || !counterId) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, `Unknown counter: ${args.counterName}`);
      return;
    }

    if (counter.can_edit === false) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, `Missing permissions to edit this counter's value`);
      return;
    }

    if (args.channel && !counter.per_channel) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, `This counter is not per-channel`);
      return;
    }

    if (args.user && !counter.per_user) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, `This counter is not per-user`);
      return;
    }

    let channel = args.channel;
    if (!channel && counter.per_channel) {
      message.channel.send(`Which channel's counter value would you like to add to?`);
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, "Cancelling");
        return;
      }

      const potentialChannel = pluginData.guild.channels.resolve(reply.content as Snowflake);
      if (!potentialChannel || !(potentialChannel instanceof TextChannel)) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, "Channel is not a text channel, cancelling");
        return;
      }

      channel = potentialChannel;
    }

    let user = args.user;
    if (!user && counter.per_user) {
      message.channel.send(`Which user's counter value would you like to add to?`);
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, "Cancelling");
        return;
      }

      const potentialUser = await resolveUser(pluginData.client, reply.content);
      if (!potentialUser || potentialUser instanceof UnknownUser) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, "Unknown user, cancelling");
        return;
      }

      user = potentialUser;
    }

    let amount = args.amount;
    if (!amount) {
      message.channel.send("How much would you like to add to the counter's value?");
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, "Cancelling");
        return;
      }

      const potentialAmount = parseInt(reply.content, 10);
      if (!potentialAmount) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, "Not a number, cancelling");
        return;
      }

      amount = potentialAmount;
    }

    await changeCounterValue(pluginData, args.counterName, channel?.id ?? null, user?.id ?? null, amount);
    const newValue = await pluginData.state.counters.getCurrentValue(counterId, channel?.id ?? null, user?.id ?? null);
    const counterName = counter.name || args.counterName;

    if (channel && user) {
      message.channel.send(
        `Added ${amount} to **${counterName}** for <@!${user.id}> in <#${channel.id}>. The value is now ${newValue}.`,
      );
    } else if (channel) {
      message.channel.send(`Added ${amount} to **${counterName}** in <#${channel.id}>. The value is now ${newValue}.`);
    } else if (user) {
      message.channel.send(`Added ${amount} to **${counterName}** for <@!${user.id}>. The value is now ${newValue}.`);
    } else {
      message.channel.send(`Added ${amount} to **${counterName}**. The value is now ${newValue}.`);
    }
  },
});
