import { APIEmbed, ChatInputCommandInteraction, GuildMember, Message, User } from "discord.js";
import { GuildPluginData } from "knub";
import { ILike, In } from "typeorm";
import { FindOptionsWhere } from "typeorm/find-options/FindOptionsWhere";
import { CaseTypes } from "../../../../data/CaseTypes";
import { Case } from "../../../../data/entities/Case";
import { areCasesGlobal, sendContextResponse } from "../../../../pluginUtils";
import {
  UnknownUser,
  chunkArray,
  emptyEmbedValue,
  renderUsername,
  resolveMember,
  resolveUser,
  trimLines,
} from "../../../../utils";
import { asyncMap } from "../../../../utils/async";
import { createPaginatedMessage } from "../../../../utils/createPaginatedMessage";
import { getGuildPrefix } from "../../../../utils/getGuildPrefix";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { ModActionsPluginType } from "../../types";

const casesPerPage = 5;
const maxExpandedCases = 8;

async function sendExpandedCases(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  casesCount: number,
  cases: Case[],
  show: boolean | null,
) {
  if (casesCount > maxExpandedCases) {
    await sendContextResponse(context, {
      content: "Too many cases for expanded view. Please use compact view instead.",
      ephemeral: true,
    });

    return;
  }

  const casesPlugin = pluginData.getPlugin(CasesPlugin);

  for (const theCase of cases) {
    const embed = await casesPlugin.getCaseEmbed(theCase.id);
    await sendContextResponse(context, { ...embed, ephemeral: !show });
  }
}

async function casesUserCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  author: User,
  modId: string | null,
  user: GuildMember | User | UnknownUser,
  modName: string,
  typesToShow: CaseTypes[],
  hidden: boolean | null,
  expand: boolean | null,
  show: boolean | null,
  search: string | null,
) {
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const casesFilters: Omit<FindOptionsWhere<Case>, "guild_id" | "user_id"> = { type: In(typesToShow) };

  if (modId) {
    casesFilters.mod_id = modId;
  }

  if (search) {
    casesFilters.notes = {
      body: ILike(`%${search}%`),
    };
  }

  const config = pluginData.config.get();
  const embedColour = config.embed_colour ?? config.embed_color ?? 0x2b2d31;
  const cases = await pluginData.state.cases
    .with("notes")
    .getByUserId(user.id, areCasesGlobal(pluginData), casesFilters);

  const normalCases = cases.filter((c) => !c.is_hidden);
  const hiddenCases = cases.filter((c) => c.is_hidden);

  const userName =
    user instanceof UnknownUser && cases.length ? cases[cases.length - 1].user_name : renderUsername(user);

  if (cases.length === 0) {
    await sendContextResponse(context, {
      content: `No cases found for **${userName}**${modId ? ` by ${modName}` : ""}.`,
      ephemeral: !show,
    });

    return;
  }

  const casesToDisplay = hidden ? cases : normalCases;

  if (!casesToDisplay.length) {
    await sendContextResponse(context, {
      content: `No normal cases found for **${userName}**. Use "-hidden" to show ${cases.length} hidden cases.`,
      ephemeral: !show,
    });

    return;
  }

  if (expand) {
    await sendExpandedCases(pluginData, context, casesToDisplay.length, casesToDisplay, show);
    return;
  }

  // Compact view (= regular message with a preview of each case)
  const lines = await asyncMap(casesToDisplay, (c) => casesPlugin.getCaseSummary(c, true, author.id));
  const prefix = getGuildPrefix(pluginData);
  const linesPerChunk = 7;
  const lineChunks = chunkArray(lines, linesPerChunk);

  const footerField = {
    name: emptyEmbedValue,
    value: trimLines(`
            Use \`${prefix}case <num>\` to see more information about an individual case
          `),
  };

  for (const [i, linesInChunk] of lineChunks.entries()) {
    const isLastChunk = i === lineChunks.length - 1;

    if (isLastChunk && !hidden && hiddenCases.length) {
      if (hiddenCases.length === 1) {
        linesInChunk.push(`*+${hiddenCases.length} hidden case, use "-hidden" to show it*`);
      } else {
        linesInChunk.push(`*+${hiddenCases.length} hidden cases, use "-hidden" to show them*`);
      }
    }

    const chunkStart = i * linesPerChunk + 1;
    const chunkEnd = Math.min((i + 1) * linesPerChunk, lines.length);

    const embed = {
      author: {
        name:
          lineChunks.length === 1
            ? `Cases for ${userName}${modId ? ` by ${modName}` : ""} (${lines.length} total)`
            : `Cases ${chunkStart}–${chunkEnd} of ${lines.length} for ${userName}`,
        icon_url: user instanceof UnknownUser ? undefined : user.displayAvatarURL(),
      },
      color: embedColour,
      description: linesInChunk.join("\n\n"),
      fields: [...(isLastChunk ? [footerField] : [])],
    } satisfies APIEmbed;

    await sendContextResponse(context, { embeds: [embed], ephemeral: !show });
  }
}

async function casesModCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  author: User,
  modId: string | null,
  mod: GuildMember | User | UnknownUser,
  modName: string,
  typesToShow: CaseTypes[],
  hidden: boolean | null,
  expand: boolean | null,
  show: boolean | null,
  search: string | null,
) {
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const casesFilters: Omit<FindOptionsWhere<Case>, "guild_id" | "user_id"> = {
    type: In(typesToShow),
    is_hidden: !!hidden,
  };

  if (search) {
    casesFilters.notes = {
      body: ILike(`%${search}%`),
    };
  }

  const totalCases = await casesPlugin.getTotalCasesByMod(modId ?? author.id, areCasesGlobal(pluginData), casesFilters);

  if (totalCases === 0) {
    pluginData
      .getPlugin(CommonPlugin)
      .sendErrorMessage(context, `No cases by **${modName}**`, undefined, undefined, !show);

    return;
  }

  const totalPages = Math.max(Math.ceil(totalCases / casesPerPage), 1);
  const prefix = getGuildPrefix(pluginData);

  if (expand) {
    // Expanded view (= individual case embeds)
    const cases =
      totalCases > 8
        ? []
        : await casesPlugin.getRecentCasesByMod(modId ?? author.id, 8, areCasesGlobal(pluginData), 0, casesFilters);

    await sendExpandedCases(pluginData, context, totalCases, cases, show);
    return;
  }

  await createPaginatedMessage(
    pluginData.client,
    context,
    totalPages,
    async (page) => {
      const config = pluginData.config.get();
      const embedColour = config.embed_colour ?? config.embed_color ?? 0x2b2d31;
      const cases = await casesPlugin.getRecentCasesByMod(
        modId ?? author.id,
        casesPerPage,
        areCasesGlobal(pluginData),
        (page - 1) * casesPerPage,
        casesFilters,
      );

      const lines = await asyncMap(cases, (c) => casesPlugin.getCaseSummary(c, true, author.id));
      const firstCaseNum = (page - 1) * casesPerPage + 1;
      const lastCaseNum = firstCaseNum - 1 + Math.min(cases.length, casesPerPage);
      const title = `Most recent cases ${firstCaseNum}-${lastCaseNum} of ${totalCases} by ${modName}`;

      const embed = {
        author: {
          name: title,
          icon_url: mod instanceof UnknownUser ? undefined : mod.displayAvatarURL(),
        },
        color: embedColour,
        description: lines.join("\n\n"),
        fields: [
          {
            name: emptyEmbedValue,
            value: trimLines(`
                Use \`${prefix}case <num>\` to see more information about an individual case
                Use \`${prefix}cases <user>\` to see a specific user's cases
              `),
          },
        ],
      } satisfies APIEmbed;

      return { embeds: [embed], ephemeral: !show };
    },
    {
      limitToUserId: author.id,
    },
  );
}

export async function actualCasesCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  modId: string | null,
  user: GuildMember | User | UnknownUser | null,
  author: GuildMember,
  notes: boolean | null,
  warns: boolean | null,
  mutes: boolean | null,
  unmutes: boolean | null,
  kicks: boolean | null,
  bans: boolean | null,
  unbans: boolean | null,
  reverseFilters: boolean | null,
  hidden: boolean | null,
  expand: boolean | null,
  show: boolean | null,
  search: string | null,
) {
  const mod = modId
    ? (await resolveMember(pluginData.client, pluginData.guild, modId)) || (await resolveUser(pluginData.client, modId))
    : null;
  const modName = modId ? (mod instanceof UnknownUser ? modId : renderUsername(mod!)) : renderUsername(author);

  const allTypes = [
    CaseTypes.Note,
    CaseTypes.Warn,
    CaseTypes.Mute,
    CaseTypes.Unmute,
    CaseTypes.Kick,
    CaseTypes.Ban,
    CaseTypes.Unban,
  ];
  let typesToShow: CaseTypes[] = [];

  if (notes) typesToShow.push(CaseTypes.Note);
  if (warns) typesToShow.push(CaseTypes.Warn);
  if (mutes) typesToShow.push(CaseTypes.Mute);
  if (unmutes) typesToShow.push(CaseTypes.Unmute);
  if (kicks) typesToShow.push(CaseTypes.Kick);
  if (bans) typesToShow.push(CaseTypes.Ban);
  if (unbans) typesToShow.push(CaseTypes.Unban);

  if (typesToShow.length === 0) {
    typesToShow = allTypes;
  } else {
    if (reverseFilters) {
      typesToShow = allTypes.filter((t) => !typesToShow.includes(t));
    }
  }

  const sanitizedSearch = search ? search.replace(/[^a-zA-Z0-9]+/gu, "").toLowerCase() : null;

  user
    ? await casesUserCmd(
        pluginData,
        context,
        author.user,
        modId!,
        user,
        modName,
        typesToShow,
        hidden,
        expand,
        show === true,
        sanitizedSearch,
      )
    : await casesModCmd(
        pluginData,
        context,
        author.user,
        modId!,
        mod ?? author,
        modName,
        typesToShow,
        hidden,
        expand,
        show === true,
        sanitizedSearch,
      );
}
