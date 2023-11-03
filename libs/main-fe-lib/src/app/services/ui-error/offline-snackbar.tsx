import React from 'react';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { UiSettings } from '../ui/ui-settings.service';
import CloudOff from '@material-ui/icons/CloudOff';
import WifiOff from '@material-ui/icons/WifiOff';
import Snackbar from '@material-ui/core/Snackbar';
import Paper from '@material-ui/core/Paper';
import { ConnectionStatus } from '../../utils/enums/fe-error-codes.enum';
import { OSState } from './dtd';
import { RequestService } from '../request-service/request-service';


/**
 * Offline snackbar
 * shows the user that the connection is not working
 */
export class OfflineSnackbar extends React.Component<{id?: string, onBackOnline: () => void, status: ConnectionStatus}, OSState> {

	/**
	 * The interval in seconds to check the BE
	 */
	private checkInterval = 5;

	private intervalId: NodeJS.Timeout;

	state: OSState = {
		status: this.props.status,
		secondsLeft: this.checkInterval,
	};

	componentDidMount() { 
		this.setTimeoutForUpdate();
	}

	private async updateStatus() {
		const r = await RequestService.checkConnectionStatus();
		if (r === ConnectionStatus.ok) 
			return this.props.onBackOnline(); 

		this.setState({status: r, secondsLeft: this.checkInterval});
		this.setTimeoutForUpdate();
	}

	private setTimeoutForUpdate() {
		this.intervalId = setInterval(() => {

			if (this.state.secondsLeft === 0) {
				clearInterval(this.intervalId);
				this.updateStatus();
			}
			else if (this.state.secondsLeft > 0) {
				this.setState(s => ({secondsLeft: s.secondsLeft - 1}));
			}
		}, 1000);
	}


	// TODO add a way to "condense"/"lower" the snackbar to a small size
	render() {
		return (
			<Snackbar id={this.props.id} open={true} anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}>
				<Paper>
					<Box width='24em' display='flex' alignItems='center' px={2} py={1} style={{color: 'white', backgroundColor: UiSettings.contentTheme.palette.error.main}}>
					
						<Box mr={2}>
							{this.state.status === ConnectionStatus.clientDown ? <WifiOff/> : <CloudOff/> }
						</Box>
						<Typography variant='body1'>
							{this.state.status === ConnectionStatus.clientDown 
							? (
								<>
									Nessuna connessione attiva 
									<br/>
									Connettiti ad una rete wifi {UiSettings.lessMd() && "o utilizza il 4g"}
								</>
							)
							: (
								<>
									Server non raggiungibile 
									{/* <br/>
									Supporto: <a href={"mailto:info@sixempress.com?Subject=Server%20non%20raggiungibile"} target="_top">info@sixempress.com</a>  */}
								</>
								)
							}
							<br/>
							{this.state.secondsLeft ? "Tentativo di connesione in " + this.state.secondsLeft + "s" : "Connesione in corso..."}
						</Typography>

					</Box>
				</Paper>
			</Snackbar>
		);
	}

}
