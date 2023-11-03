import { AbstractBasicDt, ICustomDtSettings } from '@sixempress/main-fe-lib';
import { Attribute } from '../../enums';
import { UserRoleController } from './user-role.controller';
import { UserRole } from './UserRole';

export class UserRolesTable extends AbstractBasicDt<UserRole> {

	controller = new UserRoleController();

	protected getDtOptions(): ICustomDtSettings<UserRole> {
		return {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: { required: [Attribute.addUserRoles] },					
					onClick: () => this.openEditor()
				},
				{
					title: 'Modifica',
					attributes: { required: [Attribute.modifyUserRoles] },					
					select: {type: "single"},
					onClick: (event, dt) => this.openEditor(dt)
				},
				{
					title: 'Elimina',
					attributes: { required: [Attribute.deleteUserRoles] },
					props: {color: 'secondary'},
					select: {type: "single"},
					onClick: (e, dt) => this.sendDeleteRequest(dt)
				}
			],
			columns: [
				{
					title: 'Nome',
					data: 'name'
				},
				{
					title: 'N. Attributi',
					data: 'attributes',
					search: false,
					render: (n) => n.length
				}
			],
		};
	}
	
}
