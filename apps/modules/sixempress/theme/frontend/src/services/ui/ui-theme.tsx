import { deepmerge } from '@material-ui/utils';
import { Theme, createMuiTheme, CssBaseline, ThemeProvider } from '@material-ui/core';
import { blue, deepOrange, yellow } from '@material-ui/core/colors';
import { useEffect, useState } from 'react';
import { createGenerateClassName, StylesProvider } from "@material-ui/core";

const globalProps: Theme['props'] = {
	MuiButtonBase: {
		disableRipple: true,
	},
};

const globalOverrides: Theme['overrides'] = {
	MuiLink: {
		root: {
			cursor: 'pointer',
		}
	},
	// remove the shadow cause its hard on the eyes
	MuiPaper: {
		elevation1: {
			boxShadow: "none",
			border: '1px solid var(--paper-border)',
		},
	},
	// prevent layer creation
	MuiTableHead: {
		root: {
			'& > tr > th > span': {
				position: 'unset',
			},
			// add the colors of the stickyHeader="true" cause they are cool
			'& > tr > th': {
				backgroundColor: 'var(--paper-accent)',
			}
		}
	},
	// prevent layer creation
	MuiTablePagination: {
		root: {
			'& button': {
				position: 'unset',
			}
		}
	},
	// we move the tabs above other content
	// because otherwise it creates a lot of layers for useless stuff
	// TODO activate this rule only for < md ??
	MuiTabs: {
		root: {
			position: 'relative',
			zIndex: 1,
		}
	}
	// MuiDialog: {
	// 	container: {
	// 		backdropFilter: "blur(2px)"
	// 	}
	// },
}

export const darkTheme = createMuiTheme({
	palette: {  primary: yellow, secondary: deepOrange, type: 'dark' }, 
	props: globalProps, 
	overrides: globalOverrides,
});
export const lightTheme = createMuiTheme({
	palette: {  primary: blue, secondary: deepOrange, type: 'light' }, 
	props: globalProps, 
	overrides: globalOverrides,
});
