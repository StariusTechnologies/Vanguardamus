import { slashOptions } from "knub";
import { actualCasesCmd } from "../../functions/actualCommands/actualCasesCmd";

const opts = [
  slashOptions.user({ name: "user", description: "The user to show cases for", required: false }),
  slashOptions.user({ name: "mod", description: "The mod to filter cases by", required: false }),
  slashOptions.boolean({ name: "expand", description: "Show each case individually", required: false }),
  slashOptions.boolean({ name: "hidden", description: "Whether or not to show hidden cases", required: false }),
  slashOptions.boolean({
    name: "reverse-filters",
    description: "To treat case type filters as exclusive instead of inclusive",
    required: false,
  }),
  slashOptions.boolean({ name: "notes", description: "To filter notes", required: false }),
  slashOptions.boolean({ name: "warns", description: "To filter warns", required: false }),
  slashOptions.boolean({ name: "mutes", description: "To filter mutes", required: false }),
  slashOptions.boolean({ name: "unmutes", description: "To filter unmutes", required: false }),
  slashOptions.boolean({ name: "bans", description: "To filter bans", required: false }),
  slashOptions.boolean({ name: "unbans", description: "To filter unbans", required: false }),
  slashOptions.string({ name: "search", description: "Search reasons", required: false }),
];

export const CasesSlashCmd = {
  name: "cases",
  configPermission: "can_view",
  description: "Show a list of cases the specified user has or the specified mod made",
  allowDms: false,

  signature: [...opts],

  async run({ interaction, options, pluginData }) {
    return actualCasesCmd(
      pluginData,
      interaction,
      options.mod,
      options.user,
      interaction.member,
      options.notes,
      options.warns,
      options.mutes,
      options.unmutes,
      options.bans,
      options.unbans,
      options["reverse-filters"],
      options.hidden,
      options.expand,
      options.search,
    );
  },
};
