import { Attachment, ChatInputCommandInteraction, Message, User } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../data/CaseTypes";
import { Case } from "../../../data/entities/Case";
import { areCasesGlobal } from "../../../pluginUtils";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { ModActionsPluginType } from "../types";
import { handleAttachmentLinkDetectionAndGetRestriction } from "./attachmentLinkReaction";
import { formatReasonWithMessageLinkForAttachments } from "./formatReasonForAttachments";

export async function updateCase(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  author: User,
  caseNumber?: number,
  note = "",
  attachments: Attachment[] = [],
) {
  let theCase: Case | null;
  if (caseNumber != null) {
    theCase = await pluginData.state.cases.findByCaseNumber(caseNumber, areCasesGlobal(pluginData));
  } else {
    theCase = await pluginData.state.cases.findLatestByModId(author.id, areCasesGlobal(pluginData));
  }

  if (!theCase) {
    pluginData.getPlugin(CommonPlugin).sendErrorMessage(context, "Case not found");
    return;
  }

  if (note.length === 0 && attachments.length === 0) {
    pluginData.getPlugin(CommonPlugin).sendErrorMessage(context, "Text or attachment required");
    return;
  }

  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, note)) {
    return;
  }

  const formattedNote = await formatReasonWithMessageLinkForAttachments(pluginData, note, context, attachments);

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  await casesPlugin.createCaseNote({
    caseId: theCase.id,
    modId: author.id,
    body: formattedNote,
  });

  pluginData.getPlugin(LogsPlugin).logCaseUpdate({
    mod: author,
    caseNumber: theCase.case_number,
    caseType: CaseTypes[theCase.type],
    note: formattedNote,
  });

  pluginData.getPlugin(CommonPlugin).sendSuccessMessage(context, `Case \`#${theCase.case_number}\` updated`);
}
