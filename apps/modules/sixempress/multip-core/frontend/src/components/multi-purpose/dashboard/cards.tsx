import React from 'react';
import Paper from '@material-ui/core/Paper';
import Divider from '@material-ui/core/Divider';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import CircularProgress from '@material-ui/core/CircularProgress';
import ChevronRight from '@material-ui/icons/ChevronRight';
import Clear from '@material-ui/icons/Clear';
import SupervisedUserCircle from '@material-ui/icons/SupervisedUserCircle';
import LocalShipping from '@material-ui/icons/LocalShipping';
import AllInbox from '@material-ui/icons/AllInbox';
import Language from '@material-ui/icons/Language';
import CompareArrows from '@material-ui/icons/CompareArrows';
import Storefront from '@material-ui/icons/Storefront';
import Autorenew from '@material-ui/icons/Autorenew';
import BarChart from '@material-ui/icons/BarChart';
import Check from '@material-ui/icons/Check';
import { RouterService, DataFormatterService } from '@sixempress/main-fe-lib';
import { CardsResponse } from './dashboard.dtd';
import { DashboardController } from './dashboard.controller';
import { Typography } from '@material-ui/core';

const CTX = React.createContext(false);

interface CState {
	loading: boolean;
	data?: CardsResponse;
}

export class Cards extends React.Component<{}, CState> {

	state: CState = {
		loading: true,
	}

	componentDidMount() {
		DashboardController.getCards()
		.then(d => this.setState({data: d, loading: false}));
	}

	render() {
		return (
			<CTX.Provider value={!this.state.loading}>
				<Grid container spacing={1}>
					<DashItem title='Clienti' icon={<SupervisedUserCircle/>} url='/customers'>
						Nuovi: {this.state.data?.clients.today}
						<br/>
						Totale: {this.state.data?.clients.total}
					</DashItem>

					<DashItem title='Ordini' icon={<LocalShipping/>} url='/orders/customer'>
						Nuovi: {this.state.data?.orders.today}
						<br/>
						Da completare: {this.state.data?.orders.toComplete}
					</DashItem>

					<DashItem title='Prodotti' icon={<AllInbox/>} url='/products/dashboard'>
						Venduti: {this.state.data?.products.sold}
						<br/>
						Totale: {this.state.data?.products.total}
					</DashItem>

					<DashItem title='Reso' icon={<Autorenew/>} url='/returns'>
						Oggi: {this.state.data?.returns.today}
						<br/>
						Totale: {this.state.data?.returns.total}
					</DashItem>

					<DashItem title='Vendite' icon={<Storefront/>} url='/movements/sales'>
						Oggi: {this.state.data?.sales.today}
						<br/>
						Totale: {this.state.data?.sales.total}
					</DashItem>

					<DashItem title='Movimenti' icon={<CompareArrows/>} url='/saleanalysis/report'>
						Entrate: €&nbsp;{DataFormatterService.centsToScreenPrice(this.state.data?.movements.in)}
						<br/>
						Uscite: €&nbsp;{DataFormatterService.centsToScreenPrice(this.state.data?.movements.out)}
					</DashItem>

					<DashItem title='Analisi' icon={<BarChart/>} url='/saleanalysis'>
						Netto: €&nbsp;{DataFormatterService.centsToScreenPrice(this.state.data?.analysis.net)}
						<br/>
						Credito: €&nbsp;{DataFormatterService.centsToScreenPrice(this.state.data?.analysis.toPay)}
					</DashItem>

					<DashItem title='Sito' icon={<Language/>} url='/extconn'>
						<div className='d-flex df-v-c'>
							{
								!this.state.data ? 'Caricamento...' :
								this.state.data.site.stockIssue === true ? <Typography color='error'>Errore Giacenza</Typography>: 
								this.state.data.site.stockIssue === 'loading' ? <>Controllo Giacenza...</> : 
								this.state.data.site.connected === true ? <>Collegato&nbsp;<Check/></> :
								<>Non Collegato&nbsp;<Clear/></>
							}
						</div>
					</DashItem>

				</Grid>
			</CTX.Provider>
		)
	}

}

function DashItem(p: {children: any, icon: any, title: string, url: string}) {
	return (
		<Grid item xs={6} lg={3}>
			<Paper style={{height: '100%'}} className='mouse-link' onClick={() => RouterService.goto(p.url)}>
				<Box p={1} display='flex' alignItems='center' color='var(--primary)' justifyContent='space-between'>
					<div className='d-flex df-v-c'>
						{p.icon}&nbsp;&nbsp;{p.title}
					</div>
					<ChevronRight/>
				</Box>
				<Divider/>
				<Box p={1}>
					<CTX.Consumer>
						{value => value ? p.children : <Box textAlign='center'><CircularProgress color='inherit' disableShrink/></Box>}
					</CTX.Consumer>
				</Box>
			</Paper>
		</Grid>
	);
}