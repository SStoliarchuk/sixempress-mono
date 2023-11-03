import React from 'react';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
	cardsContainer: {
		marginBottom: theme.spacing(1),
		justifyContent: 'center',
	},
	paperCard: {
		height: '100%',
		padding: theme.spacing(2),
		textAlign: 'center',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
	},
	// .paperCard > div > div {
	// 	display: flex;
	// 	justify-content: center;
	// 	align-items: center;
	// },
}));

export function RecapCards(p: {children: any}) {

	const classes = useStyles();
	const items = Array.isArray(p.children) ? p.children : [p.children];

	return (
		<Grid container spacing={1} className={classes.cardsContainer}>
			{items.map((c, idx) => !c ? (null) : (
				<Grid key={'' + items.length + idx} item lg={4} sm={6} xs={12}>
					<Paper className={classes.paperCard}>
						{c}
					</Paper>
				</Grid>
			))}
		</Grid>
	)
}