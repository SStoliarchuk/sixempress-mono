import React from 'react';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import { AuthService, ModalService } from '@sixempress/main-fe-lib';
import { MultipContentEditor } from './multip-content.editor';
import { Attribute } from '../../../utils/enums/attributes';

export class MultipContentSettings extends React.Component {

	private openEditor = () => {
		ModalService.open(MultipContentEditor, {}, {
			maxWidth: "md", 
			fullWidth: true,
			PaperProps: { style: { backgroundColor: "transparent", boxShadow: "none" } },
		});
	}


	render() {
		return (
			<Paper className='def-box'>
				{AuthService.isAttributePresent(Attribute.changeSystemContentConfig) && (
					<Button color='primary' onClick={this.openEditor}>Modifica informazioni Attivita'</Button>
				)}
				<React_use_hook ruhName='sxmp_business_locations_editor_modal_button'/>
				<React_use_hook ruhName='sxmp_settings_page_modal_buttons'/>
			</Paper>
		);
	}
}
