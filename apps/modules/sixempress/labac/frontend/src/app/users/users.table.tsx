import { AbstractBasicDt, ICustomDtSettings } from "@sixempress/main-fe-lib";
import { Attribute } from "../../enums";
import { User } from "./User";
import { UserController } from './user.controller';

export class UsersTable extends AbstractBasicDt<User> {

	controller = new UserController();

	protected getDtOptions(): ICustomDtSettings<User> {
		return {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: { required: [Attribute.addUsers] },					
					onClick: () => this.openEditor()
				},
				{
					title: 'Modifica',
					attributes: { required: [Attribute.modifyUsers] },					
					select: {type: 'single'},
					onClick: (event, dt) => this.openEditor(dt)
				},
				{
					title: 'Elimina',
					attributes: { required: [Attribute.deleteUsers] },
					props: {color: 'secondary'},
					select: {type: 'single'},
					onClick: (e, dt) => this.sendDeleteRequest(dt)
				}
			],
			columns: [
				{
					title: 'Codice',
					data: '_progCode',
				},
				{
					title: 'Username',
					data: 'username',
				},
				{
					title: 'Nome',
					data: 'name'
				},
				{
					title: 'Ruolo',
					data: 'role.fetched.name',
				},
			],
		};
	}
	
}
