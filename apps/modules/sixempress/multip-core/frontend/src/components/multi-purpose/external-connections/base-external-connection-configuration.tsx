import React from 'react';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import Container from '@material-ui/core/Container';
import Button from '@material-ui/core/Button';
import Sync from '@material-ui/icons/Sync';
import Delete from '@material-ui/icons/Delete';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import CompareArrows from '@material-ui/icons/CompareArrows';
import TableHead from '@material-ui/core/TableHead';
import TableBody from '@material-ui/core/TableBody';
// import IconButton from '@material-ui/core/IconButton';
import { ExternalConnection, ExternalConnectionType } from 'apps/modules/sixempress/multip-core/frontend/src/base-components/settings/multip-content/multip-content.dtd';
import { MultipService } from 'apps/modules/sixempress/multip-core/frontend/src/services/multip/multip.service';
import { SmallUtils, FieldsFactory, ObjectUtils, BusinessLocationsService, ModalService, UrlService, RequestService, LoadingOverlay } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Divider from '@material-ui/core/Divider';
import { Product } from '../products/Product';
import { ProductsJsxRender } from '../products/products-render';
import { FormHelperText, Tooltip, Typography } from '@material-ui/core';
import { ProductGroup } from '../products/ProductGroup';
import type { WooProductSimple } from '@sixempress/contracts-agnostic';
import to from 'await-to-js';
import { FetchOptions } from '@stlse/frontend-connector';
import { LibSmallUtils } from 'libs/main-fe-lib/src/app/utils/various/small-utils';

interface BECCSTate {
	connections: ExternalConnection[],
	connectionsLoaded: boolean,
	syncs: {active: boolean, statuses: SyncStatuses[]},
	isExtSyncModulePresent: boolean,
}

type SyncStatuses = {
	total: number,
	processed: number,
	byModel: {[modelClass: string]: {processed: number, total: number}}
} & (
	{ type: 'local' } | 
	{ type: 'remote', name: string }
)

type MappingQuery = {
	localRemote: {[localId: string]: number},
	remoteLocal: {[remoteId: string]: string},
}

type NameMappingReturn = MappingQuery & {
	localProducts: {[groupId: string]: ProductGroup},
	remoteProducts: {[remoteId: string]: WooProductSimple},
}

interface ExternalConnectionConfig {
	externalConnections?: ExternalConnection[],
};

type SyncPayload = {
	productMaps?: MappingQuery,
	syncStockFrom?: 'remote' | 'local',
	syncToLocal?: {
		customers?: boolean,
		productCategories?: boolean,
		products?: boolean,
		orders?: boolean
	},
	syncToRemote?: {
		customers?: boolean,
		productCategories?: boolean,
		products?: boolean,
		orders?: boolean
	},
}

export class BaseExternalConnectionConfiguration extends React.Component<{}, BECCSTate> {

	/**
	 * Flag that signals if a connection had a location ids settings changed
	 * 
	 * we use this to trigger the "update stock" notification on saving
	 */
	private wasLocationUpdatedSomewhere: false | string = false;

	/**
	 * add this to the url to notify the user to update its stock
	 * as when we save we reload the page to rebuild data
	 */
	private static RESTOCK_QUERY_KEY = 'rld';

	private pollingIntervalId: any;
	private pollingMSnoSync = 5_000;
	private pollingMSwithSync = 1_000;
	private pollingMS = this.pollingMSnoSync;

	state: BECCSTate = {
		connections: [],
		connectionsLoaded: false,
		syncs: {active: false, statuses: []},
		isExtSyncModulePresent: false,
	};

	async componentDidMount() {

		if (use_action.stlse_modules_get_list().some(v => v.slug === 'sixempress__external_sync'))
			this.setState({isExtSyncModulePresent: true});


		if (!this.state.connectionsLoaded) {
			this.startPolling();
			const [err, res] = await to(RequestService.client('GET', BePaths.multipexternalconnections));
			const body: ExternalConnectionConfig = (res && res.data) || {};
			MultipService.exts = body; // update local refs
			return this.setState({connectionsLoaded: true, connections: body.externalConnections || []});
		}

		const stk = UrlService.getUrlX('query', BaseExternalConnectionConfiguration.RESTOCK_QUERY_KEY);
		if (!stk)
			return;

		// remove key
		UrlService.removeUrlX('query', BaseExternalConnectionConfiguration.RESTOCK_QUERY_KEY);

		const conn = this.state.connections.find(c => c._id === stk);
		if (!conn || conn.isDisabled)
			return;

		const modal = ModalService.open({
			title: 'Aggiorna giacenza',
			content: 'Sono state cambiate le impostazioni delle posizioni, pertanto e\' possibile le giacenze non siano piu\' sincronizzate',
			actions: <Button color='primary' onClick={() => {modal.close(); this.openStockDiscrepancies(conn)}}>Controlla</Button>
		});

	}

	componentWillUnmount(): void {
		this.stopPolling();
	}

	private startPolling() {
		this.stopPolling();
		this.updateSyncsPollingState();
		this.pollingIntervalId = setTimeout(() => this.startPolling(), this.pollingMS);
	}

	private stopPolling() {
		if (this.pollingIntervalId)
			clearInterval(this.pollingIntervalId);
	}

	private async updateSyncsPollingState() {
		const [err, res] = await to(this.makeRequest('GET', BePaths.multipexternalconnections + 'sync/status', {disableLoading: true}));
		if (!res)
			return;

		const data: {active: boolean, statuses: SyncStatuses[]} = res.data;
		// update the polling rhytm
		if (data.active && this.pollingMS !== this.pollingMSwithSync)
			this.pollingMS = this.pollingMSwithSync;
		else if (!data.active && this.pollingMS !== this.pollingMSnoSync)
			this.pollingMS = this.pollingMSnoSync;

		return this.setState({syncs: data});
	}

	private async makeRequest(method: string, bePath: string, params: FetchOptions & {disableLoading?: true} = {}) {
		if (params.disableLoading !== true)
			LoadingOverlay.loading = true;
		
		const [e, d] = await to(use_action.stlse_request(method, bePath, {module: 'sixempress__external_sync', ...params}));

		if (params.disableLoading !== true)
			LoadingOverlay.loading = false;

		if (e)
			throw e;
		return d;
	}

	private locationIds = BusinessLocationsService.formatLocationsForSelect(BusinessLocationsService.getLocationsFilteredByUser(true));

	private handlers = {
		onClickAdditionalStock: (e: React.MouseEvent<any>) => {
			const idx = e.currentTarget.dataset.idx;
			const conn = this.state.connections[idx];
			if (!conn || !conn.locationId) 
				return;

			const model = ModalService.open({
				title: 'Giacenza aggiuntiva per ' + conn.name,
				content: AdditionalStockHandle,
			}, {
				mainLocation: conn.locationId,
				config: conn.additionalStockLocation,
				onConfirm: (c) => {
					this.wasLocationUpdatedSomewhere = conn._id;

					const conns = [...this.state.connections];
					conns[idx].additionalStockLocation = c;
					this.setState({connections: conns});
					model.close();
					LibSmallUtils.notify('Ricorda di salvare le modifiche');
				},
			});

		},
		onClickSync: (e: React.MouseEvent<any>) => {
			const conn = this.state.connections[e.currentTarget.dataset.idx];
			if (!conn) return;
			this.openSyncModal(conn);
		},
		onClickStockDiscrepancies: (e: React.MouseEvent<any>) => {
			const conn = this.state.connections[e.currentTarget.dataset.idx];
			if (!conn) return;
			this.openStockDiscrepancies(conn);
		},
		onClickToggleDefaultPrimarySite: (e: React.MouseEvent<any>) => {
			const {conns, rel} = this.getClonedStateByIdx(e.currentTarget.dataset.idx);
			if (!rel) return;

			// disable current
			if (rel.useFor.defaultClientSite) {
				delete rel.useFor.defaultClientSite;
			} 
			// disable all others and enable current
			else { 
				for (const c of conns)
					delete c.useFor.defaultClientSite;
				rel.useFor.defaultClientSite = true;
			}

			this.setState({connections: conns});
		},
		onClickToggleActive: (e: React.MouseEvent<any>) => {
			const {conns, rel} = this.getClonedStateByIdx(e.currentTarget.dataset.idx);
			if (!rel) return;

			rel.isDisabled = Boolean(!rel.isDisabled);
			this.setState({connections: conns});
		},
		onClickSave: () => {
			RequestService.client('put', BePaths.multipexternalconnections, {data: this.state.connections})
			.then(r => {
				// reload as to show the multi tabs
				LibSmallUtils.notify('Salvato con successo', 'success');
				
				if (this.wasLocationUpdatedSomewhere)
					UrlService.setUrlX('query', 'rld', this.wasLocationUpdatedSomewhere);
			});
		},
		onChangeLocationId: (e: React.ChangeEvent<any>	) => {
			const {conns, rel} = this.getClonedStateByIdx(e.currentTarget.dataset.idx);
			if (!rel) return;

			this.wasLocationUpdatedSomewhere = rel._id;
			rel.locationId = e.target.value;
			this.setState({connections: conns});
			LibSmallUtils.notify('Ricorda di salvare le modifiche');
		},
		// onClickAddFileServer: (e: React.MouseEvent<any>) => {
		// 	RequestService.control<{apikey: string, endpoint: string}>('post', BePaths.multip_create_file_server_control)
		// 	.then((r) => {
		// 		const body = r.data;
		// 		this.setState(s => {
		// 			const conns = [...s.connections];
		// 			conns.push({
		// 				auth: {type: 'apikey', apiKey: body.apikey},
		// 				useFor: {rawFiles: true},
		// 				name: 'File',
		// 				originUrl: body.endpoint,
		// 				type: ExternalConnectionType.rawfileservernode,
		// 			});
		// 			return {connections: conns};
		// 		}, () => this.handlers.onClickSave());
		// 	});
		// },
	}

	private openStockDiscrepancies(conn: ExternalConnection) {

		this.makeRequest('get', BePaths.multipexternalconnections + conn._id + '/stock')
		.then((res) => {
			const d: void | Array<{local: number, remote: number, product: Product}> = res.data;

			// no discprenacies
			if (!d || !d.length) {
				const modal = ModalService.open({
					title: 'Giacenza sincronizzata',
					content: <>Nessuna discrepanza di giacenza trovata<br/>Le giacenze fra il sistema ed il sito sono sincronizzate</>,
					actions: <Button color='primary' onClick={() => modal.close()}>Chiudi</Button>,
				});
			}
			// list the errors
			else {
				const modal = ModalService.open({
					title: 'Discrepanza giacenze',
					content: (
						<>
							I seguenti prodotti non sono sincronizzati correttamente:
							<br/>
							<br/>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Prodotto</TableCell>
										<TableCell>Giacenza Locale</TableCell>
										<TableCell>Giacenza Remota</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{d.map(i => (
										<TableRow key={i.product._id}>
											<TableCell>{ProductsJsxRender.formatFullProductName(i.product)}</TableCell>
											<TableCell>{i.local}</TableCell>
											<TableCell>{i.remote}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</>
					),
					actions: (
						<>
							<Button color='primary' onClick={() => { modal.close(); }}>Chiudi</Button>
							<Button color='primary' onClick={() => { modal.close(); this.openSyncModal(conn); }}>Sincronizza</Button>
						</>
					),
				});
			}
		});
	}

	private openSyncModal(conn: ExternalConnection) {

		const model = ModalService.open({
			title: 'Sincronizza ' + conn.name,
			content: SyncWoocommerce,
		}, ({
			onConfirm: async (d) => {

				const body: SyncPayload = {}

				if (Object.keys(d.ltr).length) 
					body.syncToRemote = d.ltr;
				if (Object.keys(d.rtl).length) 
					body.syncToLocal = d.rtl;
				if (d.stock) 
					body.syncStockFrom = d.stock;

				// if we either sync to local or remote the items
				// then we check for the possibile mappings
				if (body.syncToLocal || body.syncToRemote) {
					const mapData: void | NameMappingReturn = (await this.makeRequest(
						'get', 
						BePaths.multipexternalconnections + conn._id + '/products/mapping',
						// we dont need any additional projection, only name
						// {params: {projection: projection as any}},
					)).data;
						
					// add mapping
					if (mapData) {
						const res = await this.openMappingModal(mapData);
						if (res) body.productMaps = res;
					}
				}

				// post the changes
				await this.makeRequest('post', BePaths.multipexternalconnections + conn._id + '/sync', {data: body});
				
				// notify the user
				LibSmallUtils.notify('Sincronizzazione iniziata', 'success');
				this.updateSyncsPollingState();
				model.close();

			},
		}) satisfies Parameters<typeof SyncWoocommerce>[0]);
	}

	private async openMappingModal(maps: NameMappingReturn): Promise<void | MappingQuery> {
		return new Promise((r, j) => {

			const modal = ModalService.open({
				title: 'Prodotti simili',
				content: MapProducts,
			}, {
				maps,
				onConfirm: (d) => {
					r(d);
					modal.close();
				},
			});

		});
	}

	/**
	 * returns a shallow cloned state.connection array and the idx item desired
	 * @param idx the idx to return
	 */
	private getClonedStateByIdx(idx: number | string) {
		const conns = [...this.state.connections];
		const rel = conns[parseInt(idx as any)];
		if (!rel) return {};

		return {conns, rel};
	}

	private canSave() {
		// for (const e of this.state.connections) {
		// 	if (!e.locationId) 
		// 		return false;
		// }
		return true;
	}

	render() {

		if (!this.state.connectionsLoaded) {
			return (
				<Container maxWidth='lg' disableGutters={true}>
					<Paper className='def-box'>
						Caricamento connessioni...
					</Paper>
				</Container>
			)
		}
		
		if (this.state.connections.length === 0) {
			return (
				<Container maxWidth='lg' disableGutters={true}>
					<Paper className='def-box'>
						Non ci sono Siti Esterni connessi al sistema.
						<br/>
						E' possibile connettere un sito WordPress al sistema. Per farlo e' sufficiente installare l'apposita estensione e configurarla.
						<br/>
					</Paper>
				</Container>
			)
		}

		return (
			<Container maxWidth='lg' disableGutters={true}>

				<Paper className='def-box'>
					<TableContainer className='def-box-expand'>
						<Table size='small'>
							<TableHead><TableRow><TableCell colSpan={100}>Stato sincronizzazioni</TableCell></TableRow></TableHead>
							<TableBody> 
								{!this.state.syncs.active 
									? (
										<TableRow><TableCell>Nessuna operazione attiva</TableCell></TableRow>
									) 
									: (
										<>
											<TableRow><TableCell><Typography color='primary'>Sincronizzazione in corso...</Typography></TableCell></TableRow>
											{this.state.syncs.statuses.map((i, idx) => (
												<React.Fragment key={'' + this.state.syncs.statuses.length + idx}>
													<TableRow>
														<TableCell colSpan={100}>Da {i.type === 'local' ? 'Gestionale' : i.name}</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>
																Totale :<br/>
																{i.processed}/{i.total}&nbsp;&nbsp;
															</TableCell>
															{Object.keys(i.byModel).map(m => (
																<TableCell key={m}>
																	{m}:<br/>
																	{i.byModel[m].processed}/{i.byModel[m].total}&nbsp;&nbsp;
																</TableCell>
															))}
													</TableRow>
												</React.Fragment>
											))}
										</>
									)
								}
							</TableBody>
						</Table>
					</TableContainer>
				</Paper>

				<Paper className='def-box'>
					{!this.state.isExtSyncModulePresent && this.state.connections.find(c => !c.isDisabled && [ExternalConnectionType.wordpress].includes(c.type)) && (
						<Typography color='secondary'>La sincronizzazione con Wordpress/Woocommerce richiede il modulo "@sixempress/external_sync"<br/><br/></Typography>
					)}
					<TableContainer className='def-box-expand'>
						<Table size='small'>
							<TableHead>
								<TableRow>
									<TableCell width={1} padding='checkbox' align='center'>Sync</TableCell>
									<TableCell>Configurazione</TableCell>
									<TableCell>Tipo</TableCell>
									<TableCell>Indirizzo Esterno</TableCell>
									<TableCell>Posizione Associata</TableCell>
								</TableRow>
							</TableHead>
							<TableBody> 
								{this.state.connections.map((c, idx) => (
									<TableRow key={c._id || idx}>
										<TableCell width={1} align='center'>
											{!c.isDisabled && [ExternalConnectionType.wordpress].includes(c.type) && (
												<>
													<Tooltip title='Sincronizza'>
														<IconButton data-idx={idx} color='primary' onClick={this.handlers.onClickSync}>
															<Sync/>
														</IconButton>
													</Tooltip>
													<Tooltip title='Controlla giacenze'>
														<IconButton data-idx={idx} color='primary' onClick={this.handlers.onClickStockDiscrepancies}>
															<CompareArrows/>
														</IconButton>
													</Tooltip>
												</>
											)}
										</TableCell>
										<TableCell>
											<FieldsFactory.Switch
												data-idx={idx}
												label='Attivato'
												disabled={!AuthService.isAttributePresent(Attribute.modifyExternalConnection)}
												checked={!c.isDisabled}
												onClick={this.handlers.onClickToggleActive}
											/>
											<br/>
											{[ExternalConnectionType.wordpress].includes(c.type) && (
												<FieldsFactory.Switch
													data-idx={idx}
													label='Sito principale'
													disabled={!AuthService.isAttributePresent(Attribute.modifyExternalConnection)}
													checked={Boolean(c.useFor.defaultClientSite)}
													onClick={this.handlers.onClickToggleDefaultPrimarySite}
												/>
											)}
										</TableCell>
										<TableCell>
											{
												c.type === ExternalConnectionType.wordpress
												? "WordPress/WooCommerce" :

												c.type === ExternalConnectionType.rawfileservernode
												? "Server Dati" :

												c.type === ExternalConnectionType.addons
												? "Integrazioni SixEmpress" :

												"Altro"
											}
										</TableCell>
										<TableCell>
											{c.originUrl}
										</TableCell>
										<TableCell>
											{[ExternalConnectionType.wordpress].includes(c.type) && (
												<>
													<FieldsFactory.SelectField
														value={c.locationId || ''}
														data-idx={idx}
														label="Posizione"
														margin='none'
														error={!c.locationId}
														onChange={this.handlers.onChangeLocationId}
														values={this.locationIds}
													/>
													<br/>
													<br/>
													<Button color='primary' data-idx={idx} onClick={this.handlers.onClickAdditionalStock}>Giacenze aggiuntive</Button>
												</>
											)}
										</TableCell>
									</TableRow>
								))}				
							</TableBody>
						</Table>
					</TableContainer>
					<br/>
					{AuthService.isAttributePresent(Attribute.modifyExternalConnection) && (
						<Button color='primary' variant='outlined' disabled={!this.canSave()} onClick={this.handlers.onClickSave}>Salva</Button>
					)}
				</Paper>
			</Container>
		);
	}

}

function SyncWoocommerce(p: {onConfirm: (d: {rtl: SyncPayload['syncToLocal'], ltr: SyncPayload['syncToRemote'], stock?: 'remote' | 'local'}) => void}) {

	const totKeys = 4;
	const [Ltr, setLtr] = React.useState<SyncPayload['syncToRemote']>({customers: true, orders: true, productCategories: true, products: true});
	const [Rtl, setRtl] = React.useState<SyncPayload['syncToLocal']>({customers: true, orders: true, productCategories: true, products: true});
	const [stock, setStock] = React.useState<'remote' | 'local' | null>(null);

	const RtlChecked = Object.values(Rtl).filter(v => v).length;
	const LtrChecked = Object.values(Ltr).filter(v => v).length;
	const onConfirm = () => p.onConfirm({ltr: Ltr, rtl: Rtl, stock: stock});

	return (
		<div>
			<FieldsFactory.Checkbox 
				label='Scarica dati dal Sito al Sistema' 
				checked={RtlChecked === totKeys} indeterminate={RtlChecked > 0 && RtlChecked !== totKeys} 
				onClick={() => setRtl(RtlChecked === totKeys ? {} : {customers: true, orders: true, productCategories: true, products: true})}/>
			<Box ml={2}>
				<FieldsFactory.Checkbox label='Clienti' checked={Rtl.customers} onClick={() => setRtl({...Rtl, customers: !Rtl.customers})}/>
				<FieldsFactory.Checkbox label='Categorie' checked={Rtl.productCategories} onClick={() => setRtl({...Rtl, productCategories: !Rtl.productCategories})}/>
				<FieldsFactory.Checkbox label='Prodotti' checked={Rtl.products} onClick={() => setRtl({...Rtl, products: !Rtl.products})}/>
				<FieldsFactory.Checkbox label='Ordini' checked={Rtl.orders} onClick={() => setRtl({...Rtl, orders: !Rtl.orders})}/>
			</Box>

			<br/>
			<FieldsFactory.Checkbox 
				label='Carica dati dal Sistema al Sito' 
				checked={LtrChecked === totKeys} indeterminate={LtrChecked > 0 && LtrChecked !== totKeys} 
				onClick={() => setLtr(LtrChecked === totKeys ? {} : {customers: true, orders: true, productCategories: true, products: true})}/>
			<Box ml={2}>
				<FieldsFactory.Checkbox label='Clienti' checked={Ltr.customers} onClick={() => setLtr({...Ltr, customers: !Ltr.customers})}/>
				<FieldsFactory.Checkbox label='Categorie' checked={Ltr.productCategories} onClick={() => setLtr({...Ltr, productCategories: !Ltr.productCategories})}/>
				<FieldsFactory.Checkbox label='Prodotti' checked={Ltr.products} onClick={() => setLtr({...Ltr, products: !Ltr.products})}/>
				<FieldsFactory.Checkbox label='Ordini' checked={Ltr.orders} onClick={() => setLtr({...Ltr, orders: !Ltr.orders})}/>
			</Box>

			<Divider className='def-mui-divider'/>
			Sincronizzazione Giancenza:
			<Box pl={2}>
				<FieldsFactory.Radio label='Scarica giacenza dal Sito al Sistema' checked={stock === 'remote'} onClick={() => setStock('remote')}/>
				<FieldsFactory.Radio label='Carica giacenza dal Sistema al Sito' checked={stock === 'local'} onClick={() => setStock('local')}/>
				<FieldsFactory.Radio label='Non Sincronizzare giacenza' checked={!stock} onClick={() => setStock(null)}/>
			</Box>
			<Box mt={2} display='flex' flexDirection='row-reverse'>
				<Button color='primary' onClick={onConfirm}>
					Conferma	
				</Button>
			</Box>
		</div>
	);
}

function AdditionalStockHandle(p: {mainLocation: string, config?: ExternalConnection['additionalStockLocation'], onConfirm: (data: ExternalConnection['additionalStockLocation']) => void}) {

	const [order, setOrder] = React.useState(p.config?.orderedIds || []);
	const [useAll, setUseAll] = React.useState(p.config?.useAll || false);
	
	const getAvailableLocIds = (usedIds: string[]) => {
		const filtered = BusinessLocationsService.getLocationsFilteredByUser(false).filter(i => i._id !== p.mainLocation && !usedIds.includes(i._id));
		return BusinessLocationsService.formatLocationsForSelect(filtered)
	}

	const [availableIds, setAvailableIds] = React.useState(getAvailableLocIds(order));
	const [menuAnchor, setAnchorEl] = React.useState(null);

	const onOpenMenu = (e: React.MouseEvent<any>) => {
		setAnchorEl(e.currentTarget);
	}

  const onCloseMenu = () => {
		setAnchorEl(null);
  };

	const onConfirm = () => {
		const o: ExternalConnection['additionalStockLocation'] = {};
		
		if (order.length)
			o.orderedIds = order;
		
		if (useAll)
			o.useAll = true;
		
		p.onConfirm(o);
	};

	const onAddToOrder = (id: string) => {
		const t = [...order];
		t.push(id);
		setOrder(t);
		
		const av = getAvailableLocIds(t);
		if (!av.length)
			onCloseMenu();

		setAvailableIds(av);
	}

	const remove = (i: number) => {
		const t = [...order]; 
		t.splice(i, 1); 
		setOrder(t);
		setAvailableIds(getAvailableLocIds(t));
	};

	return (
		<>
			<Box border='1px solid gray' borderRadius='5px' p={2}>
				Preferenza ordine giacenza aggiuntiva
				<Table>
					<TableBody>
						{order.map((id, idx) => (
							<TableRow key={id}>
								<TableCell width='1px'>
									<IconButton onClick={() => remove(idx)}><Delete/></IconButton>
								</TableCell>
								<TableCell>
									{BusinessLocationsService.getNameById(id)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				{availableIds.length !== 0 && (
					<Button color='primary' onClick={onOpenMenu}>+ Aggiungi posizione</Button>
				)}
				<Menu
					anchorEl={menuAnchor}
					keepMounted
					open={Boolean(menuAnchor)}
					onClose={onCloseMenu}
				>
					{availableIds.map(i => (
						<MenuItem key={i.value} onClick={() => onAddToOrder(i.value.toString())}>{i.menuLabel || i.label}</MenuItem>
					))}
				</Menu>
			</Box>
			<br/>
			<FieldsFactory.Checkbox label='Usa tutte le posizioni' checked={useAll} onClick={() => setUseAll(!useAll)}/>
			<FormHelperText>Verrano usate anche le posizioni non elencate e quelle future</FormHelperText>
			<Box mt={2} display='flex' flexDirection='row-reverse'>
				<Button color='primary' onClick={onConfirm}>
					Conferma	
				</Button>
			</Box>
		</>
	);
}

function MapProducts(p: {maps: NameMappingReturn, onConfirm: (d: void | MappingQuery) => void}) {

	const [skip, setSkip] = React.useState({});

	const toggleSkip = (e: React.MouseEvent<any>) => {
		const gid = e.currentTarget.dataset.groupId;

		const copy = {...skip};
		if (copy[gid])
			delete copy[gid];
		else 
			copy[gid] = 1;

		setSkip(copy);
	}

	const onConfirm = () => {
		const dataLR = {...p.maps.localRemote};
		const dataRL = {...p.maps.remoteLocal};
		
		for (const id in skip) {
			delete dataRL[dataLR[id]];
			delete dataLR[id];
		}

		p.onConfirm(Object.keys(dataLR).length
			? {localRemote: dataLR, remoteLocal: dataRL}
			: undefined
		);
	}

	return (
		<>
			<Box border='1px solid gray' borderRadius='5px' p={2}>
				<div>
					Vi sono prodotti con nomi simili sia sul sistema che sul sito, desideri trattarli come lo stesso prodotto?
				</div>
				<Button color='primary' onClick={onConfirm}>
					Conferma
				</Button>
				<br/>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell></TableCell>
							<TableCell>Prodotto sul Sistema</TableCell>
							<TableCell>Prodotto sul Sito</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{Object.keys(p.maps.localRemote).map((trackGroup, idx) => (
							<TableRow key={trackGroup}>
								<TableCell width='1px'>
									<FieldsFactory.Checkbox onClick={toggleSkip} data-group-id={trackGroup} checked={!skip[trackGroup]}></FieldsFactory.Checkbox>
								</TableCell>
								<TableCell>
									{ProductsJsxRender.formatFullProductName(p.maps.localProducts[trackGroup])}
								</TableCell>
								<TableCell>
									{
										(p.maps.remoteProducts[p.maps.localRemote[trackGroup]].sku 
											? '[' + p.maps.remoteProducts[p.maps.localRemote[trackGroup]].sku + ']' 
											: '' ) + ' '
										+ p.maps.remoteProducts[p.maps.localRemote[trackGroup]].name
									}
									
									<br/><small><i>  id: {p.maps.remoteProducts[p.maps.localRemote[trackGroup]].id}  </i></small>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Box>
			<Box mt={2} display='flex' flexDirection='row-reverse'>
				<Button color='primary' onClick={onConfirm}>
					Conferma
				</Button>
			</Box>
		</>
	)

}
