import { Message, ModalSubmitInteraction, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { allowTimeout } from "../../../RegExpRunner";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { humanizeDurationShort } from "../../../humanizeDurationShort";
import { cleanMessages } from "../functions/cleanMessages";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin";
import { DAYS, SECONDS, getInviteCodesInString, noop } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { UtilityPluginType, utilityCmd } from "../types";

const MAX_CLEAN_COUNT = 300;
const MAX_CLEAN_TIME = 1 * DAYS;
const MAX_CLEAN_API_REQUESTS = 20;
const CLEAN_COMMAND_DELETE_DELAY = 10 * SECONDS;

const opts = {
  user: ct.userId({ option: true, shortcut: "u" }),
  channel: ct.channelId({ option: true, shortcut: "c" }),
  bots: ct.switchOption({ def: false, shortcut: "b" }),
  "delete-pins": ct.switchOption({ def: false, shortcut: "p" }),
  "has-invites": ct.switchOption({ def: false, shortcut: "i" }),
  match: ct.regex({ option: true, shortcut: "m" }),
  "to-id": ct.anyId({ option: true, shortcut: "id" }),
};

export interface CleanArgs {
  count: number;
  update?: boolean;
  user?: string;
  channel?: string;
  bots?: boolean;
  "delete-pins"?: boolean;
  "has-invites"?: boolean;
  match?: RegExp;
  "to-id"?: string;
  "response-interaction"?: ModalSubmitInteraction;
}

export async function cleanCmd(pluginData: GuildPluginData<UtilityPluginType>, args: CleanArgs | any, msg) {
  if (args.count > MAX_CLEAN_COUNT || args.count <= 0) {
    pluginData
      .getPlugin(CommonPlugin)
      .sendErrorMessage(
        msg,
        `Clean count must be between 1 and ${MAX_CLEAN_COUNT}`,
        undefined,
        args["response-interaction"],
      );
    return;
  }

  const targetChannel = args.channel ? pluginData.guild.channels.cache.get(args.channel as Snowflake) : msg.channel;
  if (!targetChannel?.isTextBased()) {
    pluginData
      .getPlugin(CommonPlugin)
      .sendErrorMessage(msg, `Invalid channel specified`, undefined, args["response-interaction"]);
    return;
  }

  if (targetChannel.id !== msg.channel.id) {
    const configForTargetChannel = await pluginData.config.getMatchingConfig({
      userId: msg.author.id,
      member: msg.member,
      channelId: targetChannel.id,
      categoryId: targetChannel.parentId,
    });
    if (configForTargetChannel.can_clean !== true) {
      pluginData
        .getPlugin(CommonPlugin)
        .sendErrorMessage(
          msg,
          `Missing permissions to use clean on that channel`,
          undefined,
          args["response-interaction"],
        );
      return;
    }
  }

  let cleaningMessage: Message | undefined = undefined;
  if (!args["response-interaction"]) {
    cleaningMessage = await msg.channel.send("Cleaning...");
  }

  const messagesToClean: Message[] = [];
  let beforeId = msg.id;
  const timeCutoff = msg.createdTimestamp - MAX_CLEAN_TIME;
  const upToMsgId = args["to-id"];
  let foundId = false;

  const deletePins = args["delete-pins"] != null ? args["delete-pins"] : false;
  let pinIds: Set<Snowflake> = new Set();
  if (!deletePins) {
    pinIds = new Set((await msg.channel.messages.fetchPinned()).keys());
  }

  let note: string | null = null;
  let requests = 0;
  while (messagesToClean.length < args.count) {
    const potentialMessages = await targetChannel.messages.fetch({
      before: beforeId,
      limit: 100,
    });
    if (potentialMessages.size === 0) break;

    requests++;

    const filtered: Message[] = [];
    for (const message of potentialMessages.values()) {
      const contentString = message.content || "";
      if (args.user && message.author.id !== args.user) continue;
      if (args.bots && !message.author.bot) continue;
      if (!deletePins && pinIds.has(message.id)) continue;
      if (args["has-invites"] && getInviteCodesInString(contentString).length === 0) continue;
      if (upToMsgId != null && message.id < upToMsgId) {
        foundId = true;
        break;
      }
      if (message.createdTimestamp < timeCutoff) continue;
      if (args.match && !(await pluginData.state.regexRunner.exec(args.match, contentString).catch(allowTimeout))) {
        continue;
      }

      filtered.push(message);
    }
    const remaining = args.count - messagesToClean.length;
    const withoutOverflow = filtered.slice(0, remaining);
    messagesToClean.push(...withoutOverflow);

    beforeId = potentialMessages.lastKey()!;

    if (foundId) {
      break;
    }

    if (messagesToClean.length < args.count) {
      if (potentialMessages.last()!.createdTimestamp < timeCutoff) {
        note = `stopped looking after reaching ${humanizeDurationShort(MAX_CLEAN_TIME)} old messages`;
        break;
      }

      if (requests >= MAX_CLEAN_API_REQUESTS) {
        note = `stopped looking after ${requests * 100} messages`;
        break;
      }
    }
  }

  let responseMsg: Message | undefined;
  if (messagesToClean.length > 0) {
    // Save to-be-deleted messages that were missing from the database
    const existingStored = await pluginData.state.savedMessages.getMultiple(messagesToClean.map((m) => m.id));
    const alreadyStored = existingStored.map((stored) => stored.id);
    const messagesToStore = messagesToClean.filter((potentialMsg) => !alreadyStored.includes(potentialMsg.id));
    await pluginData.state.savedMessages.createFromMessages(messagesToStore);

    const savedMessagesToClean = await pluginData.state.savedMessages.getMultiple(messagesToClean.map((m) => m.id));
    const cleanResult = await cleanMessages(pluginData, targetChannel, savedMessagesToClean, msg.author);

    let responseText = `Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`;
    if (note) {
      responseText += ` (${note})`;
    }
    if (targetChannel.id !== msg.channel.id) {
      responseText += ` in <#${targetChannel.id}>: ${cleanResult.archiveUrl}`;
    }

    if (args.update) {
      const modActions = pluginData.getPlugin(ModActionsPlugin);
      const channelId = targetChannel.id !== msg.channel.id ? targetChannel.id : msg.channel.id;
      const updateMessage = `Cleaned ${messagesToClean.length} ${
        messagesToClean.length === 1 ? "message" : "messages"
      } in <#${channelId}>: ${cleanResult.archiveUrl}`;
      if (typeof args.update === "number") {
        modActions.updateCase(msg, args.update, updateMessage);
      } else {
        modActions.updateCase(msg, null, updateMessage);
      }
    }

    responseMsg = await pluginData
      .getPlugin(CommonPlugin)
      .sendSuccessMessage(msg, responseText, undefined, args["response-interaction"]);
  } else {
    const responseText = `Found no messages to clean${note ? ` (${note})` : ""}!`;
    responseMsg = await pluginData
      .getPlugin(CommonPlugin)
      .sendErrorMessage(msg, responseText, undefined, args["response-interaction"]);
  }

  cleaningMessage?.delete();

  if (targetChannel.id === msg.channel.id) {
    // Delete the !clean command and the bot response if a different channel wasn't specified
    // (so as not to spam the cleaned channel with the command itself)
    msg.delete().catch(noop);
    setTimeout(() => {
      responseMsg?.delete().catch(noop);
    }, CLEAN_COMMAND_DELETE_DELAY);
  }
}

export const CleanCmd = utilityCmd({
  trigger: ["clean", "clear"],
  description: "Remove a number of recent messages",
  usage: ".clean 20",
  permission: "can_clean",

  signature: [
    {
      count: ct.number(),
      update: ct.number({ option: true, shortcut: "up" }),

      ...opts,
    },
    {
      count: ct.number(),
      update: ct.switchOption({ def: false, shortcut: "up" }),

      ...opts,
    },
  ],

  async run({ message: msg, args, pluginData }) {
    cleanCmd(pluginData, args, msg);
  },
});
