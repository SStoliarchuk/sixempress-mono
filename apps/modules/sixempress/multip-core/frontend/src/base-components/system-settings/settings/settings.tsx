import React from 'react';
import { BarcodeConfigurationSettings } from '../barcode-configuration/barcode-configuration';
import Container from '@material-ui/core/Container';
import { MultipContentSettings } from '../../settings/multip-content/multip-content-settings.page';
import { CodeScannerEventsCache } from '../../settings/code-scanner-events/code-scanner-events.cache';
import { SPrintSettings } from '../../settings/s-print/s-print.settings';
import { SaleDeskSettings } from '../../settings/sale-desk/sale-desk.settings';
import { IconButton, Paper, Tooltip } from '@material-ui/core';
import ErrorIcon from '@material-ui/icons/Error';
import { GlobalErrorHandler } from '@sixempress/main-fe-lib';

export class Settings extends React.Component {

	private onClickReportError = () => {
		GlobalErrorHandler.handleError(new Error("Report errore manuale"));
	}

	render() {
		return (
			<Container component="div" maxWidth="lg" disableGutters={true}>
				
				{/* {(ContextService.environment.libSetup.settingsPages || []).map((Comp, idx) => (<Comp key={idx}/>))} */}
				
				<MultipContentSettings/>
				<BarcodeConfigurationSettings/>
				<CodeScannerEventsCache/>
				<SPrintSettings/>
				<SaleDeskSettings/>
				<React_use_hook ruhName='sxmp_system_settings_content'/>

				<Paper className='def-box'>
					<Tooltip title='Segnala errore'>
						<IconButton color='inherit' onClick={this.onClickReportError}>
							<ErrorIcon/>
						</IconButton>
					</Tooltip>
				</Paper>

			</Container>
		);
	}

}
