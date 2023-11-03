import React from 'react';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Divider from '@material-ui/core/Divider';
import { MultipService } from 'apps/modules/sixempress/multip-core/frontend/src/services/multip/multip.service';
import { ConfirmModalComponent, LoadingOverlay, ModalComponentProps, ModalService, SmallUtils } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import TablePagination from '@material-ui/core/TablePagination';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import { ErrorCodes } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/various';
import CircularProgress from '@material-ui/core/CircularProgress';
import { RawFilesUploadStatus, RawFile, RFTProps, RFTState } from './raw-files.dtd';
import DialogActions from '@material-ui/core/DialogActions';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import { UploadArea } from './upload-area';
import { RawFilesList } from './file-list/raw-files.list';
import to from 'await-to-js';
import { LibSmallUtils } from 'libs/main-fe-lib/src/app/utils/various/small-utils';
import { FetchOptions, FetchResponse } from '@stlse/frontend-connector';

export class RawFilesTables extends React.Component<RFTProps & ModalComponentProps, RFTState> {

	state: RFTState = {
		conns: MultipService.exts.externalConnections.filter(ec => !ec.isDisabled && ec.useFor.rawFiles),
		files: [],
		totalElements: 0,
		filesLoadStatus: 'done',

		isExtSyncModulePresent: false,
		selectedConnIdx: 0,
		currentPage: 0,
		perPage: 10,

		selected: {},
	};

	componentDidMount() {
		if (use_action.stlse_modules_get_list().some(v => v.slug === 'sixempress__raw_files'))
			return;

		this.setState({isExtSyncModulePresent: true});
		if (this.state.conns.length)
			this.getFiles();
	}

	private handlers = {
		onClickSelectTab: (e: React.MouseEvent<any>) => {
			this.setConnTabIdx(parseInt(e.currentTarget.dataset.idx));
		},
		onChangePage: (event: unknown, newPage: number) => {
			this.setState({currentPage: newPage}, this.getFiles);
		},
		onChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => {
			const val = parseInt(event.target.value, 10);
			this.setState({perPage: val, currentPage: 0}, this.getFiles);
		},
		onClickLoadToCurrentEC: () => {
			const selected = this.state.conns[this.state.selectedConnIdx];
			ModalService.open({title: 'Carica su ' + selected.name, content: UploadArea}, {onFilesConfirm: (f) => {
				this.uploadFiles(f, selected._id).then(d => d && this.getFiles() );
			}});
		},
		onClickStartImageUpload: (files: File[]) => {
			this.uploadFiles(files).then(d => {
				if (d) {
					this.props.onSelectConfirm(d.data.images || []);
					this.props.modalRef && this.props.modalRef.close();
				}
			});
		},
		onClickDelete: (e: React.MouseEvent<any>) => {
			e.stopPropagation();

			const files = Object.values((this.state.selected[this.state.conns[this.state.selectedConnIdx]._id] || {}) as RFTState['selected'][0])
				.map(f => f.id);

			ConfirmModalComponent.open(
				'Eliminazione File', 
				(<span>Conferma l'eliminazione dei file selezionati</span>),
				(r) => {
					if (r) {
						this.deleteFiles(files, this.state.conns[this.state.selectedConnIdx]._id)
							.then(r => this.getFiles());

						this.setState({selected: {}});
					}
				},
			);
		},
		onClickToggleSelect: (rf: RawFile) => {
			this.toggleSelectedItems(this.state.conns[this.state.selectedConnIdx]._id, [rf]);
		},
		onClickConfirmSelect: () => {
			this.confirmFilesSelect();
		},
	}

	private async makeRequest<T = any>(method: string, bePath: string, params: FetchOptions & {disableLoading?: true} = {}): Promise<FetchResponse<T>> {
		if (params.disableLoading !== true)
			LoadingOverlay.loading = true;
		const [e, d] = await to(use_action.stlse_request<T>(method, bePath, {module: 'sixempress__raw_files', ...params}));
		if (params.disableLoading !== true)
			LoadingOverlay.loading = false;

		if (e)
			throw e;
		return d;
	}

	/**
	 * Emits the selected items
	 */
	private confirmFilesSelect() {
		const toPass: RawFile[] = [];
		for (const loc in this.state.selected) 
			toPass.push(...Object.values(this.state.selected[loc]));

		this.props.onSelectConfirm && this.props.onSelectConfirm(toPass);
		this.props.modalRef        && this.props.modalRef.close();
	}

	/**
	 * Changes the selected state of the specified items
	 */
	private toggleSelectedItems(connId: string, toggleFiles: RawFile[], forceStateTo?: boolean) {
		// ensure connid is present
		if (!this.state.conns.find(c => c._id === connId)) 
			return;

		this.setState(s => {
			const sels = {...s.selected};

			if (!sels[connId])
				sels[connId] = {}

			// add all files
			for (const f of toggleFiles) {
				if (forceStateTo === true) {
					sels[connId][f.id] = f;
				}
				else if (forceStateTo === false) {
					delete sels[connId][f.id];
				}
				else {
					if (sels[connId][f.id]) {
						delete sels[connId][f.id];
					} else {
						sels[connId][f.id] = f;
					}
				}
			}

			// clear connId object if not present any items inside
			if (!Object.keys(sels[connId]).length)
				delete sels[connId];

			return {selected: sels};
		});
	}

	/**
	 * Changes the table visualized
	 * and always reloads, if the idx is not present or -1 then reloads the current table
	 */
	private setConnTabIdx(idx: number): void {
		if (!this.state.conns[idx] || this.state.selectedConnIdx === idx) 
			return this.getFiles();

		// remove the selected items as to make clearer the "delete" button
		if (!this.props.selectMode)
			this.setState({selected: {}});
		
		// restore
		this.setState({selectedConnIdx: idx, currentPage: 0, totalElements: 0, files: []}, this.getFiles);
	}

	/**
	 * Opens a modal with some generic information about files uploadable
	 */
	private openErrorUploadModal() {
		ModalService.open((p: ModalComponentProps) => (
			<>
				<DialogTitle>
					Errore di Caricamento
				</DialogTitle>
				<DialogContent>
					Si e' verificato un errore di caricamento dei file.<br/>
					Possibili Cause:<br/>
					<ul>
						<li>
							Il Server di destinazione ha esaurito lo spazio
						</li>
						<li>
							Si sta tentando di caricare un formato non supportato dal Server di destinazione
						</li>
						<li>
							Per alcuni hosting vi sono restrizioni della dimensione dei file<br/>
							Per verificare e' possibile ritagliare un immagine al minimo e caricarla come prova
						</li>
						<li>
							Per alcuni hosting vi sono restrizioni del traffico internet<br/>
							E' possible riprovare piu' tardi per verificare se l'errore persiste
						</li>
						<li>
							Per utenti cPanel: Disabilitare ModSecurity
						</li>
					</ul>
				</DialogContent>
				<DialogActions>
					<Button onClick={p.modalRef.onClickClose} color='primary'>Chiudi</Button>
				</DialogActions>
			</>
		))
	}

	/**
	 * Uploads the files to the first available extConnection, or the specified one if present
	 * @param files the files to load
	 * @param externalConnectionId try to upload to this specific connection
	 */
	private async uploadFiles(files: File[], externalConnectionId?: string): Promise<RawFilesUploadStatus | void> {
		if (!files.length)
			return;

		const formData = new FormData();

		// TODO add this check or nah ? 
		// // MAX size for any file
		// if ((f.size / 1024 / 1024) > 2)
		// 	return this.openErrorUploadModal();
		for (const f of files)
			formData.append(f.type.indexOf('image') === 0 ? 'images[]' : 'others[]', f, f.name);
		
		const res = await this.makeRequest('GET', BePaths.rawfilesgetuploadendpoint);
		const base = res.data.endpoint[res.data.endpoint.length - 1] === '/' ? res.data.endpoint : res.data.endpoint + '/';
		const endpoint = base + BePaths.rawfiles + (externalConnectionId || '');

		LoadingOverlay.loading = true;
		const [e, r] = await to(use_action.stlse_request_fetch(endpoint, {method: 'POST', body: formData}));
		LoadingOverlay.loading = false;

		if (e)
			throw e;

		const body = await r.json();

		if (!r.ok) {
			if (body?.code === ErrorCodes.noEndpointsCanBeUsedForRawFiles) {
				// do something
			}
	
			if (body?.code === ErrorCodes.allExternalMediaStorageEndpoinsErrored)
				return this.openErrorUploadModal();

			return LibSmallUtils.notify('Error durante il caricamento', 'error');
		}

		LibSmallUtils.notify('Caricamento Completo', 'success');
		// update the table
		// this.setConnTabIdx(this.state.conns.findIndex(c => c._id === parsed.externalConnectionId));
		return body;
	}

	/**
	 * updates the currently viewed table data
	 */
	private getFiles() {
		this.setState({filesLoadStatus: 'loading'});
		
		const currSelectedIdx = this.state.selectedConnIdx;
		this.makeRequest<RawFile[]>(
			'get', 
			BePaths.rawfiles + this.state.conns[this.state.selectedConnIdx]._id, 
			{params: {
				limit: this.state.perPage,
				skip: (this.state.currentPage) * this.state.perPage,
			}, disableLoading: true},
		)
		.then(res => {
			// if the table has been changed, then we dont set the items
			// as for some slow connection the result can arrive after the new table
			// :/
			if (this.state.selectedConnIdx !== currSelectedIdx)
				return;
		
			const filtered = +res.headers['x-filtered-count'];

			this.setState({
				filesLoadStatus: 'done',
				files: res.data,
				totalElements: isNaN(filtered) ? -1 : filtered,
			});
		})
		.catch(error => {
			const err = error.body;
			if (err) {
				if (err.code === ErrorCodes.externalEndpointCannotBeReached)
					return this.setState({filesLoadStatus: 'endpointUnreachable'});
				
				else if (err.code === ErrorCodes.externalEndpointNotAcceptingAPIKEY)
					return this.setState({filesLoadStatus: 'endpointNotConfigured'});
			}
			throw error;
		});
	}
	
	/**
	 * Bye bye files
	 */
	private deleteFiles(ids: (string | number)[], extConnId: string) {
		return this.makeRequest('delete', BePaths.rawfiles + extConnId, {data: {ids}});
	}

	private paginationFn = ({ from, to, count }) => {
		return `${from}-${to} su ${count !== -1 ? count : `più di ${to}`}`;
	}
	
	render() {

		if (!this.state.isExtSyncModulePresent)
			return (<Paper className='def-box'>La gestione dei file richiede il module "@sixempress/raw_files"</Paper>)

		if (this.state.conns.length === 0)
			return (<Paper className='def-box'>Non vi sono collegamenti esterni attivati per gestire i media</Paper>)

		return (
			<>
				{this.props.selectMode && (
					<UploadArea onFilesConfirm={this.handlers.onClickStartImageUpload}/>
				)}
				<Paper>
					<Tabs
						value={this.state.selectedConnIdx}
						indicatorColor="primary"
						textColor="primary"
						scrollButtons='off'
						variant="scrollable"
					>
						{this.state.conns.map((t, idx) => (
							<Tab key={t.name + idx} label={t.name} data-idx={idx} onClick={this.handlers.onClickSelectTab}/>
						))}
					</Tabs>
					<Divider/>
					{
						this.state.filesLoadStatus === 'loading'
						? (<Box py={2} className='text-center'><CircularProgress/></Box>)

						: this.state.filesLoadStatus === 'endpointUnreachable'
						? (<Box py={2} className='text-center'>Impossibile Connetersi al Server Esterno</Box>)

						: this.state.filesLoadStatus === 'endpointNotConfigured'
						? (<Box py={2} className='text-center'>Server Esterno non configurato per accettare richieste da questo sistema</Box>)
						
						: (
							<>
								<Box p={2}>
									{this.props.selectMode && (
										<Button onClick={this.handlers.onClickConfirmSelect} disabled={!Object.keys(this.state.selected).length} color='primary' variant='outlined'>
											Seleziona
										</Button>
									)}
									{AuthService.isAttributePresent(Attribute.addRawFiles) && (
										<Button onClick={this.handlers.onClickLoadToCurrentEC} color='primary' variant='outlined'>
											Carica
										</Button>
									)}
									{AuthService.isAttributePresent(Attribute.deleteRawFiles) && !this.props.selectMode && (
										<Button onClick={this.handlers.onClickDelete} color='secondary' disabled={Object.keys(this.state.selected).length === 0} variant='outlined'>
											Elimina
										</Button>
									)}
								</Box>
								<RawFilesList selected={this.state.selected[this.state.conns[this.state.selectedConnIdx]._id] || {}} files={this.state.files} onToggleSelected={this.handlers.onClickToggleSelect}/>
								<TablePagination
									rowsPerPageOptions={[10, 25, 50]}
									component="div"
									onPageChange={this.handlers.onChangePage}
									onRowsPerPageChange={this.handlers.onChangeRowsPerPage}
									count={this.state.totalElements}
									rowsPerPage={this.state.perPage}
									page={this.state.currentPage}
									
									data-testid="datatable-table-pagination"

									backIconButtonText="Indietro"
									labelRowsPerPage="Elementi"
									nextIconButtonText="Avanti"
									labelDisplayedRows={this.paginationFn}
								/>
							</>
						)
					}
				</Paper>
			</>
		);
	}

}
