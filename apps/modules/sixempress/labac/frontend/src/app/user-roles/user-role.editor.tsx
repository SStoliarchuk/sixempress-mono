import React from 'react';
import { UserRole } from './UserRole';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import { UserRoleController, AttributeGroup } from './user-role.controller';
import { AbstractEditor, BusinessLocationsService, FieldsFactory, TopLevelEditorPart } from '@sixempress/main-fe-lib';
import { Observable } from 'rxjs';

interface AUREState {
	activeAttributes: Set<number | string>,
}

export class UserRoleEditor<P = {}, S extends Partial<AUREState> = {}> extends AbstractEditor<UserRole, P, AUREState & S> {

	constructor(p) {
		super(p);
		this.state.activeAttributes = new Set();
	}

	requireDocumentLocation = false;
	requireDocumentLocationsFilter = true;
	
	controller = new UserRoleController();

	protected userRoleController = new UserRoleController();
	protected availableLocationIds: string[] = BusinessLocationsService.getLocationsFilteredByUser(true).map(l => l._id);

	private cachedAttList: AttributeGroup[];

	private getAttList(): AttributeGroup[] {
		return this.cachedAttList || (this.cachedAttList = this.userRoleController.getAttributesList());
	}

	private convertInGroups(): (string | number)[] {
		return Array.from(this.state.activeAttributes.values());
	}

	private handlers = {
		onClickActivateAll: () => {
			const ns: AUREState['activeAttributes'] = new Set();
			for (const a of this.getAttList())
				for (const v of a.values)
					ns.add(v.value)

			this.setState({activeAttributes: ns}, this.fullFormGroupValidation);
		},
		onClickDeactiveAll: () => {
			this.setState({activeAttributes: new Set()}, this.fullFormGroupValidation);
		},
		onClickSingleAtt: async (e: React.MouseEvent<any>) => {
			const toParse = e.currentTarget.dataset.parseInt === 'true' ? true : false
			const attVal: number | string = toParse ? parseInt(e.currentTarget.dataset.value) : e.currentTarget.dataset.value;

			const toEnable = !this.state.activeAttributes.has(attVal);
			const target: (string | number)[] = [attVal];
			const dependent = this.userRoleController.checkIfAttMapIsRespected(this.convertInGroups(), attVal, toEnable);
			if (dependent.length) {
				const labels: string[] = [];
				for (const g of this.cachedAttList)
					for (const v of g.values)
						if (dependent.includes(v.value))
							labels.push(v.title);

				await new Promise(r => this.userRoleController.openAttMappingModal(labels, toEnable, () => r(target.push(...dependent))));
			}


			this.setState(s => {
				const ns = new Set(s.activeAttributes.values());
				
				if (toEnable)
					for (const att of target)
						ns.add(att);
				else
					for (const att of target)
						ns.delete(att);

				return {activeAttributes: ns};
			}, this.fullFormGroupValidation)
		}
	}

	protected getEditorRelativeItem(id?: string): Observable<UserRole | undefined> {
		const sup = super.getEditorRelativeItem(id);
		return new Observable((obs) => {
			sup.subscribe(
				val => {
					if (!val)
						return (obs.next(val), obs.complete());
					
					const ns: AUREState['activeAttributes'] = new Set();
					for (const a of val.attributes || [])
						ns.add(a)

					this.setState({activeAttributes: ns}, () => (obs.next(val), obs.complete()));
				},
				err => obs.error(err),
			);
		});
	}

	generateEditorSettings(val: UserRole = {} as any): TopLevelEditorPart<UserRole>[] {
		const availableAttrs = this.getAttList();

		const toR: TopLevelEditorPart<UserRole>[] = [
			{
				type: 'formControl',
				logic: {
					label: 'Nome Ruolo',
					component: 'TextField',
					key: 'name',
					required: true
				}
			},
			{type: "cut"},
			{
				type: "jsx",
				component: () => (
					<>
						<Button color='primary' onClick={this.handlers.onClickActivateAll}>Attiva tutti</Button>
						<Button color='primary' onClick={this.handlers.onClickDeactiveAll}>Disattiva tutti</Button>
					</>
				)
			},
			{
				type: 'jsx',
				component: () => (
					<div>
						{availableAttrs.map(a => {
							const present = this.state.activeAttributes;
							// const indeterminate = present.size && present.size !== a.values.length;
							// const allSelected = present.size === a.values.length;

							return (
								<React.Fragment key={a.title}>
									<h2>{a.title}</h2>
									{/* <FieldsFactory.Checkbox 
										label={(<h2>{a.title}</h2>)} 
										indeterminate={indeterminate} 
										checked={allSelected} 
										onClick={this.handlers.onClickGroupTitle}
										data-group={a.group}
									/> */}
									<Grid container>
										{a.values.map(att => (
											<Grid key={att.title} item xs={12} md={6}>
												<FieldsFactory.Checkbox 
													label={att.title} 
													checked={present.has(att.value)}
													data-value={att.value}
													data-parse-int={typeof att.value === 'number' ? 'true' : 'false'}
													onClick={this.handlers.onClickSingleAtt}
												/>
											</Grid>
										))}
									</Grid>
									<Divider/>
								</React.Fragment>
							)
						})}
					</div>
				)
			},
		];

		return toR;
	}


	generateToSaveObjectByFormGroup(toSave: UserRole) {
		// if the documentLocFilter was not created
		// then there is only 1 loc avaible
		// so set the default to it
		if (!toSave.documentLocationsFilter)
			toSave.documentLocationsFilter = this.availableLocationIds;

		toSave.attributes = Array.from(this.state.activeAttributes.values());
	}


}
