import { BasePluginType } from "knub";
import z from "zod";

export const zCommonConfig = z.strictObject({
  success_emoji: z.string(),
  error_emoji: z.string(),
});

export interface CommonPluginType extends BasePluginType {
  config: z.output<typeof zCommonConfig>;
}
