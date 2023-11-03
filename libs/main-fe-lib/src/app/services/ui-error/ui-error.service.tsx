import React from 'react';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import { UiSettings } from '../ui/ui-settings.service';
import { FieldsFactory } from '../../helper-components/fields/fields-factory';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { ConnectionStatus } from '../../utils/enums/fe-error-codes.enum';
import { ConvertedError, NetworkErr } from '../../utils/errors/errors';
import { DataFormatterService } from '../data-formatter.service';
import { UESState, UiServiceTriggerRequest } from './dtd';
import { OfflineSnackbar } from './offline-snackbar';
import { RequestService } from '../request-service/request-service';
import { BePaths } from '../../utils/enums/bepaths.enum';
import to from 'await-to-js';
import { SnackbarService } from '../snackbars/snackbar.service';

/**
 * Class that shows the error given to the user
 */
export class UiErrorService extends React.Component<{}, UESState> {

	private static instance: UiErrorService;

	/**
	 * Shows a generic error modal 
	 * with the err data given
	 */
	static showErrorModal(err: ConvertedError, errId?: string) { 
		if (UiErrorService.instance)
			UiErrorService.instance.setState({err: {err, errId}});
	}

	/**
	 * Shows the snackbar that notifies the user that the connection is not working
	 * and it retries autoamtically the connection
	 */
	static showConnectionError(connection: ConnectionStatus) { 
		if (UiErrorService.instance)
			UiErrorService.instance.startOfflineSnackbar(connection);
	}
	
	constructor(props) { 
		super(props);
		UiErrorService.instance = this;
	}

	state: UESState = {
		err: null,
		systemOfflineCheck: false,
		openErrorReportDialog: false,
		errorReportSentSuccesfully: false,
	};

	/**
	 * Cleans the state back to the default pre-error object to wait for the next error
	 */
	private closeErrorModal = (e?: any) => {
		this.setState({
			err: null,
			openErrorReportDialog: false,
			errorReportSentSuccesfully: false,
		});
	}

	/**
	 * Opens the modal to describe the error
	 */
	private openReportDialog = (e?: any) => {
		this.setState({openErrorReportDialog: true});
	};

	/**
	 * Sends the user description of the error to the BE 
	 */
	private sendUserReportHandler = async (userDesc?: string) => {
		// no desc close the dialog
		if (!userDesc)
			return this.setState({openErrorReportDialog: false});
		
		const [error, sent] = await to(RequestService.client('patch', BePaths.errorreport + this.state.err.errId, {data: {message: userDesc}}));
		if (!error)
			return (SnackbarService.openSimpleSnack("Segnalazione inviata", {variant: 'success'}), this.closeErrorModal());

		const state = await RequestService.checkConnectionStatus();
		if (state === ConnectionStatus.ok)
			return SnackbarService.openSimpleSnack("Error di invio sengalazione", {variant: 'error'});
		
		this.startOfflineSnackbar(state);
		this.setState({openErrorReportDialog: false});
	}


	/**
	 * Shows the snackbar that signals that the system is offline
	 * and checks every couple of seconds for connection
	 */
	private startOfflineSnackbar(status: ConnectionStatus) {
		// set it 
		if (!this.state.systemOfflineCheck)
			return this.setState({systemOfflineCheck: status}); 

		// jiggle the thingy
		const e = document.getElementById('offlineSnackbar');
		if (!e)
			return;

		if (!e.classList.contains('rotate_shake'))
			e.classList.add('rotate_shake');

		setTimeout(() => e.classList.remove('rotate_shake'), 400);
	}

	/**
	 * Hides the snackbar for the internet check
	 */
	private onBackOnline = () => {
		this.setState({systemOfflineCheck: false});
	}

	render() {

		if (!this.state.err && !this.state.systemOfflineCheck)
			return (null);

		const bgErr = UiSettings.contentTheme.palette.error.main;
		const bgMain = UiSettings.contentTheme.palette.background.paper;

		return (
			<>
				{this.state.systemOfflineCheck && (
					<OfflineSnackbar id="offlineSnackbar" onBackOnline={this.onBackOnline} status={this.state.systemOfflineCheck}/>
				)}

				{this.state.err && (
					<>
						<Dialog 
							disableEnforceFocus={true}
							open={true}
							scroll='body'
							onClose={this.closeErrorModal}
						>
							<Box py={2} px={2} style={{backgroundColor: bgMain}}>
								<Typography variant='h2' color='error'><b>Oops!</b></Typography>
								<Typography variant='h6' className='dynamic-text-color'>Si e' verificato un errore imprevisto</Typography>
		
								<Box mt={1} mb={2}>
									<Accordion style={{backgroundColor: bgMain, boxShadow: 'none'}} className='dynamic-text-color'>
										<AccordionSummary expandIcon={<ExpandMoreIcon className='dynamic-text-color'/>}>
											<Typography style={{flexGrow: 1, marginRight: '1em'}}>{this.state.err.err.message || "Errore sconosciuto"}</Typography>
											<Typography style={{alignSelf: 'center'}} variant='subtitle2'>Dettagli</Typography>
										</AccordionSummary>
										<AccordionDetails>
											<Typography 
												style={{wordBreak: 'break-word'}} 
												dangerouslySetInnerHTML={{__html: DataFormatterService.objToHtml({error: this.state.err.err})}}
											/>
										</AccordionDetails>
									</Accordion>
								</Box>
								
								<Box display='flex'>
									<Box flexGrow={1}>
										<Button variant='outlined' className='dynamic-border-color dynamic-text-color' onClick={this.closeErrorModal}>Chiudi</Button>
									</Box>
									{this.state.err.errId && !this.state.errorReportSentSuccesfully && !this.state.systemOfflineCheck && (
										<Button variant='contained' onClick={this.openReportDialog} style={{background: bgErr, color: 'white'}}>Segnala</Button>
									)}
								</Box>
							</Box>
						</Dialog>
						<ErrorReportDialog open={this.state.openErrorReportDialog} onClose={this.sendUserReportHandler}/>
					</>
				)}

			</>
		);
		
	


	}

}


/**
 * This component is a dialg that allows the user to write a report for the an error
 */
export function ErrorReportDialog(props: {open: boolean, onClose: (userDesc?: string) => void}) {

	const [desc, setDesc] = React.useState<string>('');

	const close = (sendDesc?: boolean) => (e?: any) => props.onClose(sendDesc && desc);
	const onChange = (e: React.ChangeEvent<any>) => setDesc(e.currentTarget.value);

	return (
		<Dialog open={props.open} onClose={close(false)}>
			<DialogTitle >Segnalazione Errore</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Descrivi le ultime azioni effettuate in modo da permettere di ricreare il problema e risolverlo
					<br/>
					<small>(max 400 caratteri)</small>
				</DialogContentText>
				<div data-testid="report-text-area-description">
					<FieldsFactory.TextArea
						autoFocus={true}
						fullWidth={true}
						variant='outlined'
						value={desc}
						error={Boolean(desc && desc.length > 400)}
						onChange={onChange}
					/>
				</div>
			</DialogContent>
			<DialogActions>
				<Button onClick={close(false)} color="primary">
					Annulla
				</Button>
				<Button disabled={!desc || desc.length > 400} onClick={close(true)} color="primary">
					Invia segnalazione
				</Button>
			</DialogActions>
		</Dialog>
	);
}
