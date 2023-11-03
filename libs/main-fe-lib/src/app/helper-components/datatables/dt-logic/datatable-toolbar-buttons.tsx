import React from 'react';
import Button, { ButtonProps } from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Grow from '@material-ui/core/Grow';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import Menu from '@material-ui/core/Menu';
import { PopoverOrigin } from '@material-ui/core';


export function MenuButton(p: ButtonProps & {values: {label: any, onClick: ButtonProps['onClick']}[]}) {
	const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
	const { values, ...other } = p;

	// const anchorOrigin: PopoverOrigin = {horizontal: "center", vertical: "bottom"};
	const anchorOrigin: PopoverOrigin = {horizontal: "left", vertical: "bottom"};
	const transformOrigin: PopoverOrigin = {horizontal: "left", vertical: "top"};

	const close = () => {
		setAnchorEl(null);
	};

	return (
		<>
			<Button {...other} onClick={(e) => setAnchorEl(e.currentTarget)}/>
			<Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={close} anchorOrigin={anchorOrigin} transformOrigin={transformOrigin} getContentAnchorEl={undefined}>
				{values.map((v, idx) => (
					<MenuItem key={v.label.toString() + idx} onClick={(e) => { close(); v.onClick && v.onClick(e as any);  }}>{v.label}</MenuItem>
				))}
			</Menu>
		</>
	);
}



export function SplitButton(p: ButtonProps & {values: {label: any, onClick: ButtonProps['onClick']}[]}) {

	const [open, setOpen] = React.useState(false);
	const [selectedIndex, setSelectedIndex] = React.useState(1);
	const anchorRef = React.useRef<HTMLDivElement>(null);

	const { values, children, ...other } = p;

	const handleMenuItemClick = (event: React.MouseEvent<HTMLLIElement, MouseEvent>, index: number) => {
		setSelectedIndex(index);
		setOpen(false);
	};

	const handleToggle = () => {
		setOpen((prevOpen) => !prevOpen);
	};

	const handleClose = (event: React.MouseEvent<Document, MouseEvent>) => {
		if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
			return;
		}

		setOpen(false);
	};

	return (
		<>
			<ButtonGroup variant="contained" color="primary" ref={anchorRef} aria-label="split button">
				<Button {...other} onClick={values[selectedIndex].onClick}>{values[selectedIndex].label}</Button>
				<Button {...other} color="primary" size="small" onClick={handleToggle}>
					<ArrowDropDownIcon />
				</Button>
			</ButtonGroup>
			<Popper open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal style={{zIndex: 20}}>
				{({ TransitionProps, placement }) => (
					<Grow
						{...TransitionProps}
						style={{
							transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
						}}
					>
						<Paper>
							<ClickAwayListener onClickAway={handleClose}>
								<MenuList>
									{values.map((option, index) => (
										<MenuItem
											key={option.label.toString() + index}
											selected={index === selectedIndex}
											onClick={(event) => handleMenuItemClick(event, index)}
										>
											{option.label}
										</MenuItem>
									))}
								</MenuList>
							</ClickAwayListener>
						</Paper>
					</Grow>
				)}
			</Popper>
		</>
	);
}
