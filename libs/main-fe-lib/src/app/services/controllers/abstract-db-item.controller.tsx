import React from 'react';
import { AbstractDbItemControllerLogic } from "./abstract-db-item.controller.logic";
import { IBaseModel } from './controllers.dtd';
import CircularProgress from '@material-ui/core/CircularProgress';
import Box from '@material-ui/core/Box';
import { ModalService } from '../modal-service/modal.service';
import { ModalProps } from '@material-ui/core';

export abstract class AbstractDbItemController<T extends IBaseModel> extends AbstractDbItemControllerLogic<T> {

	public static get FullDetailJsx() {
		const Controller = new (this as any)() as AbstractDbItemController<any>;
		return (p: {id: string}) => <Controller.FullDetailJsx id={p.id} controller={Controller}/>;
	}

	public openFullDetailModal(id: string, opts: {componentProps?: {id: string}, modalProps?: ModalProps} = {}) {
		return ModalService.open(
			{content: this.FullDetailJsx, title: 'Dettagli'},
			{id: id, controller: this, ...(opts.componentProps || {})},
			{fullWidth: true, maxWidth: 'md', ...(opts.modalProps || {})}
		);
	}

	public FullDetailJsx(p: {controller: AbstractDbItemController<any>, id: string}) {
		return <FullDetailJsx key={p.id} {...p} />;
	}

	protected getDetailsRender(item: T): JSX.Element {
		return (<div>Nessun dettaglio disponibile</div>); 
	}

}


interface FDJState {
	fetchComplete: boolean;
	jsxToShow: null | JSX.Element;
	error?: any,
}
class FullDetailJsx extends React.Component<{id: string, controller: AbstractDbItemController<any>}, FDJState> {

	state: FDJState = {
		fetchComplete: false,
		jsxToShow: null,
	};

	componentDidMount() {
		this.props.controller.getSingle(this.props.id, {params: {fetch: true}, disableLoading: true})
			.then(r => {
				this.setState({ fetchComplete: true, jsxToShow: this.props.controller['getDetailsRender'](r) });
			})
			.catch(e => {
				this.setState({ fetchComplete: true, error: e });
				throw e;
			});
	}

	render() {
		if (!this.state.fetchComplete)
			return <Box textAlign='center'><CircularProgress/></Box>

		if (this.state.error)
			return <Box textAlign='center'>Si e' verificato un errore</Box>

		return <Box>{this.state.jsxToShow}</Box>;
	}

}
