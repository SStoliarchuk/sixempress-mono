import React from 'react';
import { ModalService, FieldsFactory, RequestService } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import Box from '@material-ui/core/Box';
import Container from '@material-ui/core/Container';
import Paper from '@material-ui/core/Paper';
import { BusinessType, BusinessTypeLabel } from '../multip-content.dtd';
import { Divider, Grid } from '@material-ui/core';

export function openFirstStartup() {
	ModalService.open(FirstStartupRootConfig, {
			onClose: () => {},
			fullScreen: true,
			PaperProps: {style: {background: 'var(--page-bg)'}}
		},
	);
}


interface FSRCState {
	type?: BusinessType;
}


class FirstStartupRootConfig extends React.Component {


	private handleErr = (err) => {
		console.log(err);
	}

	private handleSave = () => {
		window.location.reload();
	}

	private onBack = () => {
		AuthService.logout();
		// window.location.href = '/';
	}


	private style: React.CSSProperties = {
		marginTop: '64px',
	}

	render() {
		return (
			<Container maxWidth='md' style={this.style}>
				<Paper className='def-box'>
					<h2 className='m-0'>Configurazione primo avvio di sistema</h2>
				</Paper>
			</Container>
		);
	}

}
