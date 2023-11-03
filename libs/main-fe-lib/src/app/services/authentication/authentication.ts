// TODO split main-fe-lib so that you can use authservice from labac
declare global {
  interface actions {
    sxmp_is_attribute_present: (attribute: number | string) => boolean,
  }
}

export class AuthService {
  
	public static isAttributePresent(attribute: number | string): boolean {
		return use_action.sxmp_is_attribute_present(attribute);
	}
  public static isAuthenticated(): boolean {
		return use_action.stlse_auth_is_token_valid();
	}
  public static async refreshToken(): Promise<boolean> {
		const tksn = await use_action.stlse_auth_get_valid_token();
    return Boolean(tksn);
	}
  public static logout() {
    use_action.sxmp_logout();
  }

}