import { AbstractDbItemController, ConfirmModalComponent, DbObjectSettings, EditorAmtsConfig } from '@sixempress/main-fe-lib';
import React from 'react';
import { Attribute, AttributeLabel, BePaths, ModelClass } from '../../enums';
import { UserRole } from "./UserRole";

export interface IAttMapping {
	attribute:(string | number),
	dependent: ((string | number)[]) | ((currentValues: ((string | number)[]), relativeAtt: (string | number), attributeWillBeEnabled: boolean) => void | ((string | number)[])),
}

type MappingGroups = (string | number);

export interface AttributeGroup {
	/** render title for this group of attributes */
	title: string,
	/** Attributes of that title */
	values: Array<{title: string, value: number | string}>
}

export class UserRoleController extends AbstractDbItemController<UserRole> {

	public bePath = BePaths.userroles;
	public modelClass = ModelClass.UserRole;
	protected fetchInfo: DbObjectSettings<UserRole> = {};

	public requiredAttMap = this.createAttMap();
	
	public getAttributesList(): AttributeGroup[] { 
		const vals = Object.values(Attribute);
		const base: AttributeGroup[] = [{
			title: 'Vario',
			values: vals.filter(v => typeof v !== 'number' || v < 100).map(v => ({value: v, title: String(AttributeLabel[v] || v)})),
		}, {
			title: 'Ruoli Utente',
			values: vals.filter(v => typeof v === 'number' && v >= 200 && v <= 299).map(v => ({value: v, title: AttributeLabel[v]})),
		}, {
			title: 'Utenti',
			values: vals.filter(v => typeof v === 'number' && v >= 300 && v <= 399).map(v => ({value: v, title: AttributeLabel[v]})),
		},{
			title: 'Chiavi API',
			values: vals.filter(v => typeof v === 'number' && v >= 100 && v <= 199).map(v => ({value: v, title: AttributeLabel[v]})),
		}];

		return use_filter.sxmp_labac_get_attribute_group_lists(base);
	};

	protected createAttMap(): IAttMapping[] {
		const map: IAttMapping[] = [{
			attribute:  Attribute.viewUsers,
			dependent: [Attribute.viewUserRoles],
		}];
		return use_filter.sxmp_labac_attributes_required_mapping(map);
	}

	/**
	 * async select for role
	 */
	public getAmtsFieldSettings = (p: {allLocationsIds: string[], getUserAllowedLocationIds: () => string[]} ): EditorAmtsConfig<UserRole> => {
		return {
			closePopoverOnSelect: true,
			canClearField: true,
			modelClass: ModelClass.UserRole,
			textFieldProps: {
				helperText: p.allLocationsIds.length !== 1 && 'I ruoli visibili sono filtrati in base alle posizioni permesse all\'utente'
			},
			renderValue: (r) => r.name,
			amtsInput: {
				// filter the user role available as the end user will only see those role, if any other role, it's error
				requestOptions: (c) => {
					if (!c.filter) 
						c.filter = []; 
					
					const allowed = p.getUserAllowedLocationIds();
					
					// if can't see all add a filter
					if (allowed.indexOf('*') === -1)
						c.filter.push({documentLocationsFilter: {$in: [...allowed, '*']}});
	
					if (Array.isArray(c.filter)) {
						if (!c.filter.length)
							delete c.filter;
						else
							c.filter = {$and: c.filter} as any;
					}

					// add doc loc
					c.projection.documentLocation = 1;
					c.projection.attributes = 1;
	
					return {params: c};
				},
				bePath: this.bePath,
				infoConf: { columns: [{
					title: 'Nome',
					data: 'name',
				}] }
			}
		}
	};

	/**
	 * Checks if the attribute has all the required attributes enable
	 * @param att The attribute to check
	 * @param attributeWillBeEnabled If the attribute to check will be disabled or enabled
	 * @returns true 
	 * @returns array of attributes required to activate
	 */
	public checkIfAttMapIsRespected(currentValues: MappingGroups[], att: (string | number), attributeWillBeEnabled: boolean): MappingGroups[] {
		const attMap = this.requiredAttMap;
		const toR: MappingGroups[] = [];
		
		// check that the childs are enabled
		if (attributeWillBeEnabled) {
			const dependencies = attMap.find(m => m.attribute === att);
			if (!dependencies) 
				return [];

			const logic = dependencies.dependent;
			const relativeMap = typeof logic === 'function' ? logic(currentValues, att, attributeWillBeEnabled) : logic;
			if (!relativeMap || !relativeMap.length) 
				return [];

			for (const r of relativeMap)
				if (!currentValues.includes(r))
					toR.push(r);
		}
		// check that the parents are disabled
		else {
			for (const parentAtt of attMap) {
				const logic = parentAtt.dependent;
				const relativeMap = typeof logic === 'function' ? logic(currentValues, att, attributeWillBeEnabled): logic; 

				if (!relativeMap || !relativeMap.length)
					continue;

				if (relativeMap.includes(att))
					if (currentValues.includes(parentAtt.attribute))
						toR.push(parentAtt.attribute);
			}
		}

		return toR;
	}

	/**
	 * Opens a quick modal to ask the user to toggle requried attribute map
	 */
	public openAttMappingModal(labels: string[], toEnable: boolean, onConfirm: () => void) {
		ConfirmModalComponent.open(
			(toEnable ? "Aggiungere" : "Rimuovere") + " attributi aggiuntivi?",
			(<div>
				Per {toEnable ? "abilitare" : "disabilitare"} questo/i attributi e' richiesto {toEnable ? "aggiungere" : "rimuovere"} i seguenti attributo/i:<br/>
				{labels.map(v => (<>{v}<br/></>))}
			</div>),
			(response) => response && onConfirm(),
		);
	}
	
}

