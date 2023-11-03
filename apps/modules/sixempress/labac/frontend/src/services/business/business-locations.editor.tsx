import React from 'react';
import { AbstractEditor, TopLevelEditorPart, IMongoDBFetch, RequestService, AbstractEditorProps, ObjectUtils, ModalService, W, AuthService } from '@sixempress/main-fe-lib';
import { FormControl  } from "react-reactive-form";
import { LocationsData } from '../context-service/context.dtd';
import { Observable } from 'rxjs';
import { Attribute, BePaths } from '../../enums';
import { HookReact } from '@stlse/frontend-connector';
import { Button } from '@material-ui/core';

abstract class OverrideType<T> extends AbstractEditor<T> { }

export const reactHookButton: HookReact = {
  sxmp_business_locations_editor_modal_button: () => LocationsEditorButton,
}

function LocationsEditorButton() {
	if (!AuthService.isAttributePresent(Attribute.modifyLocationsData))
		return null;

  const openLocationEditor = () => {
		ModalService.open(LocationsEditor, {extendWrapper: true}, {
			maxWidth: "md", 
			fullWidth: true,
			PaperProps: { style: { backgroundColor: "transparent", boxShadow: "none" } },
		});
	}

  return (<W><Button color='primary' onClick={openLocationEditor}>Modifica posizioni attivita'</Button></W>)
}

export class LocationsEditor extends OverrideType<LocationsData> {

	controller = null;
	controllerUrl = BePaths.locationsdata;

	requireDocumentLocation = false;
	requireDocumentLocationsFilter = false;

	getEditorConfiguration(): AbstractEditorProps<LocationsData> {
		return { ...super.getEditorConfiguration(), usePut: true, idToModify: "" };
	}

	/**
	 * Resolves to undefined when no item was found
	 * Resolves to the ITEM to modify if found
	 */
	protected getEditorRelativeItem(): Observable<LocationsData> {
		return new Observable(obs => {
			RequestService.client('get', this.controllerUrl)
			.then(res => (obs.next(res.data), obs.complete()));
		});
	}

	generateEditorSettings(val: LocationsData = {} as any): TopLevelEditorPart<LocationsData>[] {
    return [
			{
				type: 'formArray',
				gridProp: {md: 12},
				wrapRender: (c) => (
					<>
						<h3 style={{margin: 0}}>Locazioni sistema</h3>
						<small style={{margin: 0}}>Non e' possibile eliminare le posizion una volta create. E' possibile solo disabilitarle</small>
						{c}
					</>
				),
				logic: {
					key: 'locations',
					canDeleteChild: (c) => !c._id,
					min: 1,
					parts: [
						{
							type: 'abstractControl',
							logic: {
								key: '_id',
								controlFnFormArray: (v) => new FormControl(v && v._id),
							}
						},
						{
							type: 'formControl',
							gridProp: {md: 1, style: {alignSelf: 'center'}},
							logic: {
								key: 'isActive',
								component: 'Switch',
								label: "",
								controlFnFormArray: (v) => new FormControl((v ? v.isActive : true)),
							}
						},
						{
							type: 'formControl',
							gridProp: {md: 5},
							logic: {
								key: 'name',
								component: 'TextField',
								label: 'Nome',
								required: true,
							}
						},
						{
							type: 'formControl',
							gridProp: {md: 6},
							logic: {
								key: 'address',
								component: 'TextField',
								label: 'Indirizzo',
							}
						},
						// {
						// 	type: 'formControl',
						// 	gridProp: {md: 4},
						// 	logic: {
						// 		key: 'coordinates',
						// 		component: 'TextField',
						// 		label: 'Coordinate',
						// 	}
						// },
						{type: 'divider'},
					],
				}
			},
		];
	}


	/**
	 * Returns the send action to use
	 */
	protected getSendAction = (mode: 'POST' | 'PUT' | 'PATCH', toSave: LocationsData): Promise<any> => {
		switch (mode) {
			case 'POST':
				return RequestService.client('post', this.controllerUrl, {data: toSave});

			case 'PATCH':
				const patchOps = this.generatePatchOp(this.objFromBe, toSave);
				if (patchOps.length !== 0)
					return RequestService.client('patch', this.controllerUrl, {data: patchOps});
				break;

			case 'PUT':
				if (ObjectUtils.objectDifference(toSave, this.objFromBe))
					return RequestService.client('put', this.controllerUrl, {data: toSave});
				break;
			}
	}

}