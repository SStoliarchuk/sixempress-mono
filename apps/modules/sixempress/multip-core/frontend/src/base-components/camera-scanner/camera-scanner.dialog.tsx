import React from 'react';
import { NotFoundException, BrowserMultiFormatReader } from '@zxing/library';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import IconButton from '@material-ui/core/IconButton';
import Close from '@material-ui/icons/Close';
import Switch from '@material-ui/core/Switch';
import { DataStorageService } from '@sixempress/utilities';
import { CacheKeys, CodeScannerService, FieldsFactory, GlobalDraggable } from '@sixempress/main-fe-lib';

interface QCSDState {
	open: boolean;
	closeOnScan: boolean;
	errorType?: "permission" | 'noCameras' | 'unknown';
	multipleCameras?: {label: string, value: string}[];
	selectedCameraId?: string;
}

/**
 * This component should be mounted at root
 */
export class CameraScannerDialog extends React.Component {


	private static instance: CameraScannerDialog;

	private static keyDownOpen(e: React.KeyboardEvent<any>) {
		if (e.key === 'F2')
			CameraScannerDialog.toggle();
	}
	
	public static startKeydownListener() { 
		document.addEventListener('keydown', CameraScannerDialog.keyDownOpen as any); 
	}
	public static stopKeydownListener() {
		document.removeEventListener('keydown', CameraScannerDialog.keyDownOpen as any);
	}

	public static open() { 
		CameraScannerDialog.instance.changeOpenState(true); 
	}

	public static close() { 
		CameraScannerDialog.instance.changeOpenState(false); 
	}

	public static toggle() { 
		CameraScannerDialog.instance.changeOpenState('toggle'); 
	}

	constructor(props) {
		super(props);
		CameraScannerDialog.instance = this;
	}

	state: QCSDState = {
		open: false,
		closeOnScan: DataStorageService.localStorage.getItem(CacheKeys.closeCameraCodeReaderOnScan) === 'false' ? false : true,
	};

	
	/**
	 * How much to wait for next item scan
	 */
	private scanDelayMs = 2000;

	private lastResultTimeMs: number;
	
	private codeReader: BrowserMultiFormatReader;


	private changeOpenState(req: boolean | 'toggle') {
		const newState = req === 'toggle' ? !this.state.open : req;
		
		if (newState === true) {
			this.setState({open: newState});
			this.destroyCodeReader();
			this.codeReader = new BrowserMultiFormatReader();
			this.setupCamera();
		}
		else {
			this.setState({open: newState});
			this.destroyCodeReader();
			this.lastResultTimeMs = undefined;
		}
	}

	private destroyCodeReader() {
		if (this.codeReader) {
			this.codeReader.reset();
			this.codeReader = undefined;
		}
	}

	componentWillUnmount() {
		this.destroyCodeReader();
	}


	/**
	 * asks permissions gets the camera and starts the first camera available
	 */
	private setupCamera() {

		this.codeReader.listVideoInputDevices()
			.then((videoInputDevices) => {
				
				// no cameras on the device
				if (videoInputDevices.length === 0) {
					this.setState({errorType: 'noCameras'});
					return;
				}

				// add choices for the cameras
				if (videoInputDevices.length > 1) {
					this.setState({multipleCameras: videoInputDevices.map(e => ({label: e.label, value: e.deviceId}))});
				}

				// start with the secondary camera (usually it's the back one)
				this.startCamera((videoInputDevices[1] || videoInputDevices[0]).deviceId);
			})
			// not permitted to access cameras
			.catch((err) => {
				this.setState({errorType: 'permission'});
			});

	}

	/**
	 * Start watching the camera and outputs on the first scan
	 */
	private startCamera(cameraId: string) {
		this.setState({selectedCameraId: cameraId});

		this.codeReader.reset();
		this.codeReader.decodeFromVideoDevice(cameraId, 'video', (result, err) => {
			if (result) {

				// check for required delay
				const now = new Date().getTime();
				if (this.lastResultTimeMs && now - this.lastResultTimeMs < this.scanDelayMs) { 
					return; 
				}
				this.lastResultTimeMs = now;
				
				CodeScannerService.emit({origin: 'camera', value: result.getText(), type: result.getBarcodeFormat()});

				if (this.state.closeOnScan) {
					this.changeOpenState(false);
				}
			}
			else if (err && !(err instanceof NotFoundException)) {
				this.setState({errorType: 'unknown'});
				throw err;
			}
		}).catch(err => {
			this.setState({errorType: 'unknown'});
		});
	}

	/**
	 * Changes the camera that is being used
	 */
	private cameraOnChange = (e: React.ChangeEvent<{value: any}>) => {
		this.startCamera(e.target.value);
	}

	private handleClose = (e?) => this.changeOpenState(false);

	private handleCloseOnScan = (e?) => {
		DataStorageService.localStorage.setItem(CacheKeys.closeCameraCodeReaderOnScan, Boolean(!this.state.closeOnScan).toString())
		this.setState({closeOnScan: !this.state.closeOnScan});
	}

	render() {

		if (this.state.open === false) {
			return (null);
		}
		const width = 200;
		const windowWidth = window.innerWidth;
		const dialogLeft = windowWidth > (width + 90) ? windowWidth - (width + 90) : 0;

		if (this.state.errorType) {
			const errText = this.state.errorType === 'noCameras' 
				? "Nessuna videocamera rilevata"
				: this.state.errorType === 'permission' 
					? "Accesso alla videocamera negato, modificare i permessi nelle impostazioni del browser"
					: "Errore sconosciuto";

			return (
				<GlobalDraggable addScroll={true} left={dialogLeft} top={50}>
					<Paper style={{border: '1px solid black'}}>
						<IconButton style={{float: "right"}} size='small' onClick={this.handleClose}><Close/></IconButton>
						<Box p={1} textAlign='center'>Scansione codice</Box>
						<Box p={2} pt={1}>
							{errText}
						</Box>
					</Paper>
				</GlobalDraggable>
			);
		}

		return (
			<GlobalDraggable addScroll={true} left={dialogLeft} top={50}>
				<Paper style={{border: '1px solid black'}}>
					<IconButton style={{float: "right"}} size='small' onClick={this.handleClose}><Close/></IconButton>
					<Box p={1} textAlign='center'>Scansione codice</Box>
					<Box p={1}>
						<div>
							<video id="video" width={200} height="310"></video>
						</div>
						
						{this.state.multipleCameras && (
							<FieldsFactory.SelectField
								variant='standard'
								label="Seleziona camera"
								values={this.state.multipleCameras}
								value={this.state.selectedCameraId}
								onChange={this.cameraOnChange}
							/>
						)}

						<div>
							Scansiona e chiudi
							<Switch checked={this.state.closeOnScan} onChange={this.handleCloseOnScan} color='primary'/>
						</div>
					</Box>
				</Paper>
			</GlobalDraggable>
		);

	}

}
