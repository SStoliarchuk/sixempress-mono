import { AbstractDbItemController, DbObjectSettings, FetchableField } from "@sixempress/main-fe-lib";
import { BePaths, ModelClass } from "../../enums";
import { AuthService } from "../../services/authentication/authentication";
import { User } from "./User";

export class UserController extends AbstractDbItemController<User> {

	public bePath = BePaths.userlist;
	
	public modelClass = ModelClass.User;
	
	protected fetchInfo: DbObjectSettings<User> = {
		role: {  },
	};

	public static formatName(userInfo: User | FetchableField<User>): string {
		if (!userInfo)
			return;

		// user from back end
		if (AuthService.SERVER_TASK_OBJECT_ID.includes((userInfo as FetchableField<User>).id))
			return 'Automatico';

		const user: User = (userInfo as FetchableField<User>).fetched || userInfo as User;

		// user is present
		if (user) {
			if (user._progCode)
				return user._progCode + ' | ' + user.name;
			else
				return user.name;
		}
	}

}

