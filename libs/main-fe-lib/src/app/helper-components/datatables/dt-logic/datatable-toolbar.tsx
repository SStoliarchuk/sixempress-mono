import React from 'react';
import clsx from 'clsx';
import { withStyles, Theme } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import { DTProps, DTToolbarProps, DTButton } from './datatable.dtd';
import { Subject } from 'rxjs';
import TextField from '@material-ui/core/TextField';
import { debounceTime } from 'rxjs/operators';
import Button, { ButtonProps } from '@material-ui/core/Button';
import { MenuButton } from './datatable-toolbar-buttons';

/**
 * exporting for test
 */
export interface DTTProps {
	selected: any[];
	canSelect: boolean;
	config: DTProps<any>['toolbar'],

	onSearch?: (value: string) => void,
	initialSearchValue?: string,

	/**
	 * @default 500ms
	 */
	searchDebounceMs?: number;
}

interface DTTProps_Internal extends DTTProps {
	classes: {[A in keyof ReturnType<typeof useStyles>]: string};
}

const useStyles = (theme: Theme) => ({
	root: {
		paddingLeft: theme.spacing(2),
		paddingRight: theme.spacing(1),
	},
	buttonsContainer: {
		flexGrow: '1',
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "center",
	},
	fixBorderRadius: {
		borderTopLeftRadius: '4px',
		borderTopRightRadius: '4px',
	},
	lowOpacityText: {
		opacity: '0.4',
		// color: fade(theme.palette.text.primary, 0.4)
	},
	complexToolbarContainer: {
		flexDirection: 'row-reverse',
		display: "flex",
		flexWrap: 'wrap',
		flex: '1 1 100%',
		padding: '9px 9px',
	},
	highOpacitySelected: {
		color: theme.palette.primary.main
	},
	complexSpacer: {
		flex: '100',
		padding: '0 5px',
	},
	flex: {
		display: 'flex',
	},
	expanded: {
		flex: '1 1 100%',
	},
	defaultButton: {
		transition: 'all 250ms, opacity 150ms',
		overflow: "hidden",
		whiteSpace: 'nowrap',
	},
	visibleButton: {
		marginRight: '4px',
		marginTop: '4px',
	},
	searchInput: {
		marginTop: '4px',
	},
	hiddenDisabledButton: {
		maxWidth: 0,
		minWidth: 0,
		opacity: 0,

		paddingRight: 0,
		paddingLeft: 0,
		marginRight: 0,

		// used to match the visibleButton margin and
		// prevents the button from being squished 
		marginTop: '4px',
		/* fixes extra space between buttons */
		// margin: "0 0 1em 0",
	}
});


/**
 * exporting for test
 */
export class DatatableToolbar_Internal extends React.Component<DTTProps_Internal> {
	
	public static DEFAULT_DEBOUNCE_TIME_MS = 400;

	/**
	 * A subject that emits every time there is a key press in the search field
	 */
	private searchFieldEmitter = new Subject<string>();


	private debounceTimeMs = DatatableToolbar_Internal.DEFAULT_DEBOUNCE_TIME_MS;

	constructor(p: DTTProps_Internal) {
		super(p);

		if (typeof p.searchDebounceMs !== 'undefined') {
			this.debounceTimeMs =  p.searchDebounceMs;
		}
	}

	componentDidMount() {
		this.bindSearchEmitter();
	}

	/**
	 * Listen to the search field
	 */
	private bindSearchEmitter(): void {
		this.searchFieldEmitter.pipe(
			debounceTime(this.debounceTimeMs)
		).subscribe(value => {
			this.props.onSearch(value);
		});
	}

	private emitSearchHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (this.debounceTimeMs === 0) {
			this.props.onSearch(event.target.value);
		} else {
			this.searchFieldEmitter.next(event.target.value);
		}
	}

	private handleButtonClick = (e: React.MouseEvent<any>) => {
		const idx = e.currentTarget.dataset.idx;
		const btn = (this.props.config as DTToolbarProps<any>).buttons![idx];
		
		if (btn.onClick) { btn.onClick(e, this.props.selected); }
	}


	private generateButton = (b: DTButton<any>, idx: number): JSX.Element | null => {
		
		const isDisabled = b.enabled === false || (typeof b.enabled === 'function' && b.enabled(this.props.selected) === false);

		const baseProps: ButtonProps = {
			color: 'primary',
			variant: 'outlined',
			key: b.title.toString() + idx,
			className: this.props.classes.defaultButton,
			['data-idx' as any]: idx,
			onClick: this.handleButtonClick,
			disabled: isDisabled,
			size: 'small',
			...(b.props || {}),
		};

		// ensure the colors are the same
		// we add the custom class only when active to ensure the disabled buttons colrors are equal
		if (isDisabled){
			baseProps.color = 'primary';
		} else {
			baseProps.className += " " + (b.className || "");
		}

		// hide deactive button
		if (isDisabled && (b.hideDisabled || (this.props.config as DTToolbarProps<any>).hideDisabledButtons)) { 
			baseProps.className += " " + this.props.classes.hiddenDisabledButton;
		} else {
			baseProps.className += " " + this.props.classes.visibleButton;
		}

		if (b.type && b.type.name === 'menu') {
			return (
				<MenuButton
					{...baseProps}
					values={b.type.items.map(mb => ({
						label: mb.title as string,
						onClick: (e: React.MouseEvent<any>) => mb.onClick && mb.onClick(e, this.props.selected)
					}))}
				>
					{b.title}
				</MenuButton>
			);
			// return (
			// 	<SplitButton {...baseProps} values={b.type.items}/>
			// )
		}
		else {
			return (
				<Button {...baseProps}>
					{b.title}
				</Button>
			);
		}
	}

	private inputProps = {role: "search"};

	render() {
		const p = this.props;
		const classes = p.classes;
		const numSelected = p.selected.length;
		const info = p.config;
	
		const search = p.onSearch && <TextField defaultValue={p.initialSearchValue} inputProps={this.inputProps} className={p.classes.searchInput} placeholder='Cerca...' onChange={this.emitSearchHandler}/>;
		
		if (typeof info === 'string' || typeof info === 'boolean') {
			return (
				<Toolbar className={classes.root}>
					{numSelected > 0 ? (
						<Typography className={clsx(classes.expanded, classes.fixBorderRadius, classes.highOpacitySelected)} color="inherit" variant="subtitle1" component="div">
							{numSelected} {numSelected === 1 ? "Riga Selezionata" : "Righe Selezionate"}
						</Typography>
					) : (
						<Typography className={clsx(classes.expanded, classes.fixBorderRadius)} variant="h6" id="tableTitle" component="div">
							{typeof info === 'string' ? info : "Tavola Dati"}
						</Typography>
					)}

					{search}
				</Toolbar>
			);
		}
		else if (typeof info === 'object') {
	
			const defaultConf = p.config as DTToolbarProps<any>;
			let conf = info;
			if (info.withSelectedRows && numSelected !== 0) {
				if (info.withSelectedRows === true) {
					conf = info;
				}
				else if (typeof info.withSelectedRows === 'function') {
					conf = info.withSelectedRows(p.selected) as DTToolbarProps<any>;
				}
				else if (numSelected === 1) {
					conf = info.withSelectedRows.single as DTToolbarProps<any>;
				}
				else {
					conf = info.withSelectedRows.multi as DTToolbarProps<any>;
				}
			}

			const selectedToTop = (defaultConf.buttons && defaultConf.buttons.length !== 0) || (info.buttons && info.buttons.length !== 0);

			
			return (
				<>
					<Toolbar variant="dense" className={clsx(classes.root, classes.complexToolbarContainer)}>
							<div className={classes.flex}>
								{conf.search !== false && search}
								{typeof conf.additional === 'function' ? conf.additional() : conf.additional}
							</div>

							<div className={classes.complexSpacer}/>

							{selectedToTop 
								// buttons
								? (
									<div className={classes.buttonsContainer}>
										{conf.buttons && conf.buttons.map(this.generateButton)}
									</div>
								)
								// simple text
								: ( numSelected > 0 
									? (
										<Typography color="inherit" variant="subtitle1" component="div">
											{numSelected} {numSelected === 1 ? "Riga Selezionata" : "Righe Selezionate"}
										</Typography>
									)  : (
										<Typography variant="h6" id="tableTitle" component="div">
											{conf.title}
										</Typography>
									) 
								) 
							}
					</Toolbar>
					{/* <Divider/> */}
					{/* small text underneath the buttons */}
					{selectedToTop && (
						<Typography 
							className={clsx(classes.root, classes.fixBorderRadius, {[classes.highOpacitySelected]: numSelected !== 0, [classes.lowOpacityText]: p.canSelect && numSelected === 0})} 
							color="inherit" 
							variant="subtitle1" 
							component="div"
						>
							{numSelected === 0 
								? info.title || (p.canSelect ? "Clicca su una riga per selezionarla" : (<span>&nbsp;</span>))
								: numSelected + " " + (numSelected === 1 ? "Riga Selezionata" : "Righe Selezionate")
							}
						</Typography>
					)}
				</>
			);
	
		}

		return (null);
	}
}

export const DatatableToolbar: React.ComponentType<DTTProps> = (withStyles as any)(useStyles)(DatatableToolbar_Internal);
