import { HookActions } from "@stlse/frontend-connector";
import { UiSettings } from "./ui-settings.service";

export const uiServiceHooks: HookActions = {
  sxmp_ui_get_active_theme_mui_v4: () => UiSettings.contentTheme,
  sxmp_ui_set_active_theme_palette: (ctx, ret, v) => UiSettings.colorsTheme = v,
  sxmp_ui_get_theme_changes_emitter: () => UiSettings.colorsThemeChanges,
}