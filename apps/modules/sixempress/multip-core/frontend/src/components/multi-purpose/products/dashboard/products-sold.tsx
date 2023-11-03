import React from 'react';
import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import { DataFormatterService, Datatable, DTProps, ModalComponentProps } from '@sixempress/main-fe-lib';
import { ProductsJsxRender } from '../products-render';
import CircularProgress from '@material-ui/core/CircularProgress';
import { TopSoldReportDetails } from './dtd';
import { ProductsDashboard } from './products-dashboard';
import { Product } from '../Product';

type PSState = {
	products: false | TopSoldReportDetails['items'];
}

export class ProductsSold extends React.Component<{from: number, to: number} & ModalComponentProps, PSState> {

	state: PSState = {
		products: false,
	}
	
	componentDidMount() {
		ProductsDashboard.getTopSold(this.props.from, this.props.to, true).then((r: TopSoldReportDetails) => {
			
			for (const pg of r.items) {
				if (!pg.variationData)
					pg.variationData = {};	

				pg.groupData.name = ProductsJsxRender.formatFullProductName(pg);
				pg.variationData.sellPrice = 0;
				pg.variationData.supplier = {} as any;

				for (const m of pg.models) {
					(m as any).total = m.amount * m.variationData.sellPrice;
					pg.variationData.sellPrice += (m as any).total;
					m.groupData.name = ProductsJsxRender.formatFullProductName(m);
					if (m.variationData.supplier) {
						const name = r.suppHm[m.variationData.supplier.id]._progCode + ' | ' + r.suppHm[m.variationData.supplier.id].name as any;
						(pg.variationData.supplier as any)[m.variationData.supplier.id] = name;
						m.variationData.supplier = name;
					}
				}

				(pg.variationData.supplier as any) = Object.values(pg.variationData.supplier as any).join(', ');
			}

			this.setState({products: r.items});
		});
	}

	private get safeProductsArray() {
		return this.state.products || [];
	}

	private detailColumns: DTProps<Product & {total: number}>['columns'] = [
		{
			title: 'Nome',
			data: 'groupData.name',
		},
		{
			title: 'Fornitore',
			data: 'variationData.supplier',
		},
		{
			title: '€ Acquisto',
			data: 'variationData.buyPrice',
			render: (d, m) => '€ ' + DataFormatterService.centsToScreenPrice(m.variationData.buyPrice),
		},
		{
			title: '€ Vendita',
			data: 'variationData.sellPrice',
			render: (d, m) => '€ ' + DataFormatterService.centsToScreenPrice(m.variationData.sellPrice),
		},
		{
			title: 'Venduto',
			data: 'amount',
		},
		{
			title: 'In Giacenza',
			data: '_totalAmount',
			render: (d, m) => ProductsJsxRender.generateFullAmountInfo(m),
		},
		{
			title: '€ Tot.Guadagno',
			data: 'total',
			render: (d, m) => '€ ' + DataFormatterService.centsToScreenPrice(m.total),
		},
	]

	private dtConf: DTProps<TopSoldReportDetails['items'][0]> = {
		data: () => ( { data: this.state.products || [] } ),
		sortAndProcessData: true,
		toolbar: { search: true, buttons: [{title: 'Chiudi', onClick: () => this.props.modalRef.close()}] },
		columns: [
			{
				title: 'Venduto',
				data: 'amount',
			},
			{
				title: 'In Giacenza',
				data: '_totalAmount',
			},
			{
				title: 'Nome',
				data: 'groupData.name',
			},
			{
				title: 'Fornitore/i',
				data: 'variationData.supplier',
			},
			{
				title: '€ Totale',
				data: 'variationData.sellPrice',
				render: (d, pg) => '€ ' + DataFormatterService.centsToScreenPrice(pg.variationData.sellPrice),
			},
		],
		renderDetails: (m) => <Datatable columns={this.detailColumns} sortAndProcessData={true} data={m.models}/>
	}

	render() {
		if (!this.state.products)
			return (
				<Paper>
					<Box p={2}>Dettagli prodotto</Box>
					<Box p={2} textAlign={'center'}><CircularProgress/></Box>
				</Paper>
			);

		return <Datatable {...this.dtConf}/>
	}
	
}