import React from 'react';
import { User } from "./User";
import { FormControl, Validators } from "react-reactive-form";
import { UserRoleController } from '../user-roles/user-role.controller';
import { UserController } from './user.controller';
import { AbstractEditor, BusinessLocationsService, FetchableField, IMongoDBFetch, SelectFieldValue, TopLevelEditorPart } from '@sixempress/main-fe-lib';
import { ModelClass } from '../../enums';

export class UserEditor extends AbstractEditor<User> {

	controller = new UserController();

	requireDocumentLocation = false;
	requireDocumentLocationsFilter = true;

	protected fieldsToFetch: IMongoDBFetch<User>[] = [{field: 'role'}];
	
	protected userRoleController = new UserRoleController();

	
	/**
	 * Returns the list of businessLocations that are usable for the
	 * allowedLocations select
	 */
	protected getLocationsForUser() {
		return BusinessLocationsService.getLocationsFilteredByUser(false);
	}

	/**
	 * Returns the avaible locations of the system
	 */
	protected getAvailableLocationsIds = (): string[] => {
		return BusinessLocationsService.getLocationsFilteredByUser(false).map(i => i._id);
	}

	/**
	 * Returns the list of locationIds allowedfor the user
	 */
	protected getAllowedLocationsIds = (): string[] => {
		if (this.state.formGroup.value.allowedLocations && this.state.formGroup.value.allowedLocations.constructor === Array)
			return this.state.formGroup.value.allowedLocations;
		
		// return all the avaible
		// as the allowedLoc is hidden 
		return this.getAvailableLocationsIds();
	}

	/**
	 * Used to check if the given role still applies with the new lcoations
	 */
	private updateRoleOnChange = (e) => {
		const currAllowedLocations = e.target.value;
		const currRole = this.state.formGroup.value.role;

		// check if role is still assignable
		if (currRole && currRole.fetched.documentLocationsFilter) {
			// check if the new accessible location can see the role to set
			let removeRole = !currRole.fetched.documentLocationsFilter.includes('*');
			if (removeRole) {
				for (const loc of currRole.fetched.documentLocationsFilter) {
					if (currAllowedLocations.includes(loc)) {
						removeRole = false;
						break;
					}
				}
			}

			// if cant be seen, then remove it
			if (removeRole)
				this.state.formGroup.get('role').patchValue(undefined);
		}

		this.state.formGroup.get('allowedLocations').patchValue(e.target.value);
	}


	generateEditorSettings(val: User = {} as any): TopLevelEditorPart<User>[] {

		const multipleLoc = this.getAvailableLocationsIds().length !== 1;

		const allowedLocVals: SelectFieldValue[] = [
			...this.getLocationsForUser().map(l => ({
				label: l.name,
				value: l._id,
				menuLabel: (
					<span>
						{l.name}
						{l.address && (
							<>
								<br/>
								<small>{l.address}</small>
							</>
						)}
					</span>
				),
			}))
		];

		// add the global filter if the user can set it
		allowedLocVals.unshift({
			label: 'Tutte',
			value: '*'
		});


		const toR: TopLevelEditorPart<User>[] = [
			{
				type: 'formControl',
				logic: {
					label: 'Nome',
					component: 'TextField',
					key: 'name',
					validators: Validators.required,
				}
			},
			{type: 'divider'},
			{
				type: 'formControl',
				logic: {
					label: 'Username',
					component: 'TextField',
					key: 'username',
					validators: Validators.required,
				}
			},
			{
				type: 'formControl',
				logic: {
					label: 'Password',
					component: 'TextField',
					key: 'password',
					// TODO if we put here "null" instead of "undefined" it patches the field with empty object "{}" ???
					control: new FormControl(undefined, this.config.idToModify ? undefined : Validators.required),
				}
			},
			...(!multipleLoc ? [] : [
				{
					type: 'formControl',
					logic: {
						component: 'MultiSelectField',
						key: 'allowedLocations',
						label: 'Posizioni permesse',
						value: val.allowedLocations || ['*'],
						validators: Validators.required,
						props: {
							onChange: this.updateRoleOnChange,
						},
						values: allowedLocVals,
					}
				},
			] as TopLevelEditorPart<User>[]),
			{
				type: 'formControl',
				logic: {
					component: "SelectAsyncModel",
					key: 'role',
					label: 'Ruolo',
					required: true,
					props: this.userRoleController.getAmtsFieldSettings({
						allLocationsIds: this.getAvailableLocationsIds(),
						getUserAllowedLocationIds: this.getAllowedLocationsIds,
					}),
				}
			},
		];

		return toR;
	}

	generateToSaveObjectByFormGroup(body: User) {

		// if the documentLocFilter was not created
		// then there is only 1 loc avaible
		// so set the default to it
		if (!body.documentLocationsFilter)
			body.documentLocationsFilter = this.getAvailableLocationsIds();

		if (!body.allowedLocations)
			body.allowedLocations = ['*'];
		
		if (body.allowedLocations.includes("*"))
			body.allowedLocations = ['*'];

		body.role = new FetchableField(body.role.id, ModelClass.UserRole);

		return body;
	}

}
