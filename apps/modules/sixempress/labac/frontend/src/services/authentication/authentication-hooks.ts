import { HookActions } from "@stlse/frontend-connector";
import { AuthService } from "./authentication";

export const authenticationServiceHooks: HookActions = {
  sxmp_is_attribute_present: (ctx, ret, attr) => {
    return AuthService.isAttributePresent(attr)
  },
  sxmp_on_logout: () => {
    AuthService.logout();
  },
  sxmp_labac_get_current_user: () => {
    return AuthService.currentUser;
  },
  sxmp_login_successful: async (ctx, ret) => {
    await AuthService.onAfterLoginActions();
  },
}

export class AuthServiceHooked {

  public static SERVER_TASK_OBJECT_ID = [
		'000000000000000000000000', '000000000000',
	];

	public static async logout() {
		use_action.sxmp_logout();
	}

	public static isAttributePresent(attribute: number | string): boolean {
		return use_action.sxmp_is_attribute_present(attribute);
	}

	public static get currentUser() {
		return use_action.sxmp_labac_get_current_user();
	}

}