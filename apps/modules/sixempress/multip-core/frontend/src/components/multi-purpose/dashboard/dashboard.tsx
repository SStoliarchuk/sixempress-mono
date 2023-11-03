import React from 'react';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import { Graph } from './graph';
import { Cards } from './cards';

interface DState {

}

export class Dashboard extends React.Component<{}, DState> {


	render() {
		return (
			<Container maxWidth='lg' disableGutters>
				<Cards/>
				<Graph/>
			</Container>
		)
	}

}

