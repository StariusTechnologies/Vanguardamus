import { slashOptions } from "knub";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions";
import { updateCase } from "../../functions/updateCase";
import { NUMBER_ATTACHMENTS_CASE_UPDATE } from "../constants";
import { slashCmdReasonAliasAutocomplete } from "../../functions/slashCmdReasonAliasAutocomplete";

const opts = [
  slashOptions.string({ name: "case-number", description: "The number of the case to update", required: false }),
  {
    ...slashOptions.string({ name: "reason", description: "The note to add to the case", required: false }),
    getExtraAPIProps: () => ({
      autocomplete: true,
    }),
  },
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_UPDATE, {
    name: "attachment",
    description: "An attachment to add to the update",
  }),
];

export function UpdateSlashCmdAutocomplete({ pluginData, interaction }) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name !== "reason") {
    interaction.respond([]);
    return;
  }

  slashCmdReasonAliasAutocomplete({ pluginData, interaction });
}

export const UpdateSlashCmd = {
  name: "update",
  configPermission: "can_note",
  description: "Update the specified case (or your latest case) by adding more notes to it",
  allowDms: false,

  signature: [...opts],

  async run({ interaction, options, pluginData }) {
    await updateCase(
      pluginData,
      interaction,
      interaction.user,
      options.caseNumber,
      options.note,
      retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_UPDATE, options, "attachment"),
    );
  },
};
