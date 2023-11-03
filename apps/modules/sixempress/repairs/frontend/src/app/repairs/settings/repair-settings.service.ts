import { HookActions, HookReact } from "@stlse/frontend-connector";
import { ISxmpRepairsSettings } from "./repair-settings.dtd";
import { RepairSettingEditButton } from "./repair-settings.editor";
import { RequestService } from "@sixempress/main-fe-lib";
import { BePaths } from "../../../enums/bepaths";

export class RepairSettingsService {

  public static config: ISxmpRepairsSettings = {}

  public static reactHook: HookReact = {
    sxmp_settings_page_modal_buttons: () => RepairSettingEditButton,
  }
  
  public static actionHook: HookActions = {
    sxmp_login_successful: () => RepairSettingsService.getRepairSettingInfo(),
  }

  private static async getRepairSettingInfo() {
    const res = await RequestService.client('get', BePaths.repairsettingsinfo);
    res.data && (RepairSettingsService.config = res.data);
  }

}