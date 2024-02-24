import { Snowflake, TextChannel } from "discord.js";
import { guildPluginMessageCommand } from "knub";
import { waitForReply } from "knub/helpers";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { UnknownUser, resolveUser } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { setCounterValue } from "../functions/setCounterValue";
import { CountersPluginType } from "../types";

export const SetCounterCmd = guildPluginMessageCommand<CountersPluginType>()({
  trigger: ["counters set", "counter set", "setcounter"],
  permission: "can_edit",

  signature: [
    {
      counterName: ct.string(),
      value: ct.number(),
    },
    {
      counterName: ct.string(),
      user: ct.resolvedUser(),
      value: ct.number(),
    },
    {
      counterName: ct.string(),
      channel: ct.textChannel(),
      value: ct.number(),
    },
    {
      counterName: ct.string(),
      channel: ct.textChannel(),
      user: ct.resolvedUser(),
      value: ct.number(),
    },
    {
      counterName: ct.string(),
      user: ct.resolvedUser(),
      channel: ct.textChannel(),
      value: ct.number(),
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
      message.channel.send(`Which channel's counter value would you like to change?`);
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
      message.channel.send(`Which user's counter value would you like to change?`);
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

    let value = args.value;
    if (!value) {
      message.channel.send("What would you like to set the counter's value to?");
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, "Cancelling");
        return;
      }

      const potentialValue = parseInt(reply.content, 10);
      if (Number.isNaN(potentialValue)) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, "Not a number, cancelling");
        return;
      }

      value = potentialValue;
    }

    if (value < 0) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, "Cannot set counter value below 0");
      return;
    }

    await setCounterValue(pluginData, args.counterName, channel?.id ?? null, user?.id ?? null, value);
    const counterName = counter.name || args.counterName;

    if (channel && user) {
      message.channel.send(`Set **${counterName}** for <@!${user.id}> in <#${channel.id}> to ${value}`);
    } else if (channel) {
      message.channel.send(`Set **${counterName}** in <#${channel.id}> to ${value}`);
    } else if (user) {
      message.channel.send(`Set **${counterName}** for <@!${user.id}> to ${value}`);
    } else {
      message.channel.send(`Set **${counterName}** to ${value}`);
    }
  },
});
