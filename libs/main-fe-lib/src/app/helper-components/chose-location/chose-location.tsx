import React from 'react';
import { Observable } from "rxjs";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import { ModalService } from "../../services/modal-service/modal.service";
import { FieldsFactory } from '../fields/fields-factory';
import { SelectFieldValue } from '../fields/dtd';
import { BusinessLocationsService } from '../../services/business/business-locations.service';
import { ModalComponentProps } from '@sixempress/theme';
import { BusinessLocation } from '../../services/context-service/context.dtd';

interface CLOptions {
	/**
	 * Forces the user to chose a location manually
	 */
	forceManual?: boolean;
	/**
	 * Choses the locaitons only from the ui locations, ignoring the ones for the
	 */
	onlyUiLocations?: boolean;
	/**
	 * IF true allows one of the locations to chose to be GLOBAL (*) (return value is null)
	 */
	allowGlobal?: boolean;
	/**
	 * Selects multiple locations
	 */
	multipleSelect?: boolean;
	
	title?: string;

	content?: string | JSX.Element;

	value?: string | string[];
}



/**
 * Returns an observable that tells the system which location the user has selected
 * If the system has only 1 location, or the ui is chosen it returns that location
 * else it opens a modal to let the user decide
 * 
 * @param forceManual Forces the user to chose a location manually
 * @param onlyUiLocations Choses the locaitons only from the ui locations, ignoring the ones for the
 * @param allowGlobal IF true allows one of the locations to chose to be GLOBAL (*) (return value is null)
 * @returns false if the user has ignored to chose (when the modal opens and the user clicks away)
 * @returns null if the choice is a global location (possibile only if onlyUiLocations !== true)
 * @returns string the _id of the chosen location
 * @returns array of string if give multiple is true
 */
export function choseLocation(options: CLOptions = {}): Observable<string | string[] | null> {
	return new Observable<string | string[] | null>(obs => {

		let fastToR: string;

		const locs = options.onlyUiLocations ? BusinessLocationsService.getLocationsFilteredByUser(false) : BusinessLocationsService.getLocationsFilteredByUser(false);

		if (locs.length === 1) {
			fastToR = locs[0]._id;
		} else if (!options.forceManual && BusinessLocationsService.chosenLocationId) {
			fastToR = BusinessLocationsService.chosenLocationId;
		}

		// if can return the do so
		if (fastToR) {
			// ret array
			if (options.multipleSelect) { obs.next([fastToR]); } 
			// ret string
			else { obs.next(fastToR); }
			return;
		}
		ModalService.open(ChoseLocationModal, {possibleLocations: locs, ...options}, {onClosed: (data) => obs.next(data)});
	});
}

/**
 * A modal that lets the user chose a location from the possible ones
 */
function ChoseLocationModal(props: {possibleLocations: BusinessLocation[]} & CLOptions & ModalComponentProps) {

	const [val, setVal] = React.useState(props.value || (props.multipleSelect ? [] : ''));

	// on select change
	const onChange = (e: React.ChangeEvent<any>) => setVal(e.target.value);
	
	// confirm click handler
	const onClick = (e) => {
		// return global filter
		if (val.constructor === Array && (val as string[]).indexOf('*') !== -1) { props.modalRef.close(['*']); } 
		// return no filter
		else if (!val) { props.modalRef.close(null); }
		// return selected filter
		else { props.modalRef.close(val); }
	};


	// generate the values array
	const values: SelectFieldValue[] = props.possibleLocations.map(l => ({
		value: l._id,
		label: l.name,
		menuLabel: l.address 
			? ( <span>{l.name}<br/><small>{l.address}</small></span> ) 
			: l.name,
	}));
	// add global value
	if (props.allowGlobal) { values.unshift({value: '*', label: "GLOBALE"}); }


	return (
		<>
			<DialogTitle>
				{props.title || 'Seleziona la posizione'}
			</DialogTitle>
			<DialogContent>
				{props.content}
				<FieldsFactory.SelectField
					values={values}
					label="Posizione"
					error={!val}
					multiple={props.multipleSelect}
					onChange={onChange}
				/>
			</DialogContent>
			<DialogActions>
				<Button color='primary' onClick={onClick}>Conferma</Button>
			</DialogActions>
		</>
	);

}

