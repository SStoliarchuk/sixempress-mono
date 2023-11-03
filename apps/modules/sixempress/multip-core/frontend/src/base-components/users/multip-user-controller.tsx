import { User } from "@sixempress/abac-frontend";
import { FetchableField } from "@sixempress/main-fe-lib";

export class MultipUserController {

  public static formatName(user: User | FetchableField<User>) {
    return use_action.sxmp_labac_format_user_name(user);
  }

}