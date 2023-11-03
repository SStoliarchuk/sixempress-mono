import './customer-details.css';
import React from 'react';
import ChevronRight from '@material-ui/icons/ChevronRight';
import { Customer } from '../Customer';
import { ComponentCommunicationService, RouteComponentProps, DataFormatterService, RouterService } from '@sixempress/main-fe-lib';
import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';
import Container from '@material-ui/core/Container';
import { CustomerController } from '../customer.controller';
import { SaleAnalysisTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/sale-analyses/SaleAnalysis.table';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';

interface CDState {
	customer: Customer;
}

export class CustomerDetails extends React.Component<RouteComponentProps, CDState> {

	controller = new CustomerController();

	custId = '';

	state: CDState = {
		customer: null,
	};

	constructor(p: RouteComponentProps) {
		super(p);
		this.custId = RouterService.match(this.props).customerDetailsId;
	}

	componentDidMount() {
		this.controller.getSingle(this.custId)
			.then(c => this.setState({customer: c}));
	}

	private handleGotoRelativeItemsTable = (e: React.MouseEvent<any>) => {
		ComponentCommunicationService.setData('dt-filters', {"customer.id": this.state.customer._id});
		
		const path = e.currentTarget.dataset.path;
		RouterService.goto(path);
	}

	render() {

		if (!this.state.customer) { return (null); }

		return (
			<Container disableGutters>
				<Paper className='def-box customer-info-container'>
					<Typography variant='h5'>{CustomerController.formatCustomerName(this.state.customer)}</Typography> 
					<Divider className='def-mui-divider'/>
					<Box>
						<table>
							<tbody>
								<tr><th>Provincia</th><td>{this.state.customer.phone}</td></tr>
								<tr><th>Email</th><td>{this.state.customer.email}</td></tr>
								<tr><th>Indirizzo</th><td>{this.state.customer.address}</td></tr>
							</tbody>
						</table>
					</Box>
					<hr/>
					{this.state.customer.notes && (
						<>
							<b>Note:</b>
							<br/>
							{this.state.customer.notes}
						</>
					)}
				</Paper>

				<Paper style={{borderBottom: 0, position: 'relative', bottom: '-10px'}}>
					<Box pl={3} pt={2}>
						<Typography className='def-link d-flex df-v-c' onClick={this.handleGotoRelativeItemsTable} data-path="/movements/sales" variant='h5' >
							Lista Vendite <ChevronRight/>
						</Typography>
					</Box>
				</Paper>
				<SaleAnalysisTable
					emeddedData={undefined} 
					isEmbedded={undefined} 
					embedReportTemp 
					defaultFilters={{'customer.id': this.custId, '_generatedFrom.modelClass': ModelClass.Sale}}
				/>
				<br/>
				<br/>

				<Paper style={{borderBottom: 0, position: 'relative', bottom: '-10px'}}>
					<Box pl={3} pt={2}>
						<Typography className='def-link d-flex df-v-c' onClick={this.handleGotoRelativeItemsTable} data-path="/orders/customer" variant='h5' >
							Lista Ordini <ChevronRight/>
						</Typography>
					</Box>
				</Paper>
				<SaleAnalysisTable
					emeddedData={undefined} 
					isEmbedded={undefined} 
					embedReportTemp 
					defaultFilters={{'customer.id': this.custId, '_generatedFrom.modelClass': ModelClass.CustomerOrder}}
				/>

			</Container>
		);
	}

}
