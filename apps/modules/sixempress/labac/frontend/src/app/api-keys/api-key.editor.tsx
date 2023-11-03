import React from 'react';
import { ApiKey } from './ApiKey';
import { Validators, FormControl } from 'react-reactive-form';
import Switch from '@material-ui/core/Switch';
import { UserRoleController } from '../user-roles/user-role.controller';
import { ApiKeyController } from './api-key.controller';
import { AbstractEditor, BusinessLocationsService, FieldsFactory, SelectFieldValue, TopLevelEditorPart } from '@sixempress/main-fe-lib';

export class ApiKeyEditor extends AbstractEditor<ApiKey> {

	controller = new ApiKeyController();
	protected userRoleController = new UserRoleController();

	requireDocumentLocation = false;
	requireDocumentLocationsFilter = false;

	generateEditorSettings(val: ApiKey = {} as any): TopLevelEditorPart<ApiKey>[] {

		const busLocs = BusinessLocationsService.getLocationsFilteredByUser(false);
		const avaiableAttrs = this.userRoleController.getAttributesList();
		const selectAttrs: SelectFieldValue[] = [];

		for (const a of avaiableAttrs)
			for (const att of a.values)
				selectAttrs.push({ label: att.title, value: att.value });

		return [
			{
				type: 'formControl',
				gridProp: {style: {alignSelf: 'flex-end'}},
				logic: {
					key: 'name',
					label: 'Nome',
					component: 'TextField',
					validators: Validators.required,
				}
			},
			{
				type: 'formControl',
				gridProp: {style: {alignSelf: 'center'}},
				logic: {
					control: new FormControl(typeof val.expires === 'undefined' ? Math.floor(new Date().getTime() / 1000) : val.expires),
					key: 'expires',
					component: (control) => {
						const handleSwitch = (e: React.ChangeEvent<HTMLInputElement>) => {
							if (e.target.checked) {
								control.patchValue(Math.floor(new Date().getTime() / 1000));
							} else {
								control.patchValue(false);
							}
						};

						return (
							<div>
								La chiave scade: 
								<Switch
									checked={control.value === false ? false : true}
									color='primary'
									onChange={handleSwitch}
								/>
								{control.value !== false && (
									<FieldsFactory.DateField
										pickerType="datetime"
										label='Seleziona data di scadenza'
										value={control.value ? new Date(control.value * 1000) : new Date()}
										onChange={(moment) => control.patchValue(moment.unix())}
									/>
								)}
							</div>
						);
					}
				}
			},
			{type: 'cut'},
			
			busLocs.length === 1 ? {
				type: "abstractControl",
				logic: {
					key: "availableLocations",
					control: new FormControl([busLocs[0]._id]),
				}
			} : {
				type: 'formControl',
				logic: {
					component: 'MultiSelectField',
					key: 'availableLocations',
					label: 'Posizioni permesse',
					validators: Validators.required,
					values: [{label: "GLOBALE", value: "*"}, ...BusinessLocationsService.formatLocationsForSelect(busLocs)],
				}
			},
			{
				type: 'formControl',
				gridProp: {md: 12},
				logic: {
					key: 'attributes',
					label: 'Attributi',
					component: 'MultiSelectField',
					validators: Validators.required,
					values: selectAttrs,
				}
			},
		];
	}

}

