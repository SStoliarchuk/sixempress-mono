import React from 'react';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import { Checkbox, FormControlLabel, TextField } from '@material-ui/core';

export interface LPState {
	slug: string,
	username: string,
	password: string,
	keepInMemory: boolean,
}

export interface LPProps {
	onLogin: (state: LPState) => any,
	initialState?: Partial<LPState>,
	showSlug?: boolean
}

class _LoginPage extends React.Component<LPProps & {classes: any}, LPState> {

	private classes: ReturnType<typeof styled>['defaultProps']['classes'];

	constructor(p: LPProps & {classes: any}) {
		super(p);

		this.classes = p.classes;

		this.state = {
			slug: '',
			username: '',
			password: '',
			keepInMemory: false,
			...(p.initialState || {}),
		};	
	}


	private handlers = {
		onChangeField: (e: React.ChangeEvent<any>) => {
			const value = e.currentTarget.value;
			const field = e.currentTarget.parentElement.parentElement.dataset.field;
			this.setState({[field]: value} as any);
		}
	}

	/**
	 * Just checks if all fields have been filled
	 */
	private isFormValid = (): boolean => {
		return Boolean(this.state.slug && this.state.username && this.state.password);
	}

	/**
	 * Submit function
	 */
	private onSumbit = (e) => {
		e.preventDefault();
		
		if (!this.isFormValid())
			return;

		// AuthService.auth // prevents circular dependency issue ...
		this.props.onLogin(this.state)
	}

	render() {

		return (
			<Container maxWidth='xs' className={this.classes.container}>
				<Avatar className={this.classes.avatar}>
					<LockOutlinedIcon/>
				</Avatar>
				<Typography component="h1" variant="h5" color='textPrimary'>
					Esegui il login
				</Typography>
				<form onSubmit={this.onSumbit} className={this.classes.form}>
					{this.props.showSlug && (
						<div>
							<TextField
								margin='normal'
								label='Codice Sistema'
								variant='outlined'
								fullWidth
								data-field='slug'
								value={this.state.slug}
								onChange={this.handlers.onChangeField}
							/>
						</div>
					)}
					<div>
						<TextField
							margin='normal'
							label='Username'
							variant='outlined'
							fullWidth
							data-field='username'
							value={this.state.username}
							onChange={this.handlers.onChangeField}
						/>
					</div>
					<div>
						<TextField
							margin='normal'
							label='Password'
							variant='outlined'
							fullWidth
							type='password'
							data-field='password'
							value={this.state.password}
							onChange={this.handlers.onChangeField}
						/>
					</div>
					<FormControlLabel
						label={(<Typography color='textPrimary'>Resta collegato</Typography>)}
						value={this.state.keepInMemory}
						control={<Checkbox
							color='primary'
							data-field='keepInMemory'
							onChange={this.handlers.onChangeField}
						/>}
					/>
					<Button
						type="submit"
						fullWidth
						variant="contained"
						color="secondary"
						disabled={!this.isFormValid()}
					>
						Login
					</Button>
				</form>
			</Container>
		);
	}
}

const styled = withStyles(theme => ({
	container: {
		marginTop: theme.spacing(8),
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
	},
	avatar: {
		margin: theme.spacing(1),
		backgroundColor: theme.palette.primary.dark,
	},
	form: {
		width: '100%',
		marginTop: theme.spacing(1),
	},
}));
export const LoginPage =  styled(_LoginPage);
