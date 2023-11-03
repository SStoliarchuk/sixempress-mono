import { AbstractDbApiItemController, IVerifiableItemDtd } from '@sixempress/main-be-lib';
import { Attribute, BePaths, ModelClass } from '../../enums';
import { UserRole } from './UserRole.dtd';

export class UserRoleController extends AbstractDbApiItemController<UserRole> {

	modelClass = ModelClass.UserRole;
	collName = ModelClass.UserRole;
	bePath = BePaths.userroles;

	requireDocumentLocation = false;
	
	Attributes = {
		view: Attribute.viewUserRoles,
		add: Attribute.addUserRoles,
		modify: Attribute.modifyUserRoles,
		delete: Attribute.deleteUserRoles,
	};

	dtd: IVerifiableItemDtd<UserRole> = {
		name: {
			type: [String],
			required: true,
		},
		attributes: {
			type: [Array],
			required: true,
			arrayDef: {type: [Number, String]}
		},
	};
	
	// TODO readd ?
	// getHandler_delete(rhs: RequestHandlerService<any>) {
	// 	return rhs.completeDelete({afterDelete: async (req) => {
	// 		const [err, done] = await to(new UserController().getCollToUse(req).updateMany({'role.id': req.params.id}, {$unset: {role: ''}}));
	// 		if (err) { throw err; }
	// 	}});
	// }

}
