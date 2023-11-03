import { Theme } from '@material-ui/core';
import { ActionEmitter, DataStorageService } from "@sixempress/utilities";
import { CacheKeys } from '../../utils/cache-keys';
import { darkTheme, lightTheme } from './ui-theme';

export class UiSettings {
	

	private static _colorsTheme: 'dark' | 'light';

	/**
	 * The theme of the content of the app
	 */
	public static contentTheme: Theme = lightTheme;

	/**
	 * An emitter for when the colors theme changes
	 */
	public static colorsThemeChanges = new ActionEmitter<['dark' | 'light']>();

	/**
	 * Controls the main theme of the app
	 */
	public static get colorsTheme(): 'dark' | 'light' { return UiSettings._colorsTheme; }

	
	public static set colorsTheme(theme: 'dark' | 'light') {

		// update the variables
		UiSettings._colorsTheme = theme;
		DataStorageService.localStorage.setItem(CacheKeys.appTheme, theme);
		document.getElementsByTagName('html')[0].className = theme;

		UiSettings.contentTheme = theme === 'dark' ? darkTheme : lightTheme;
		UiSettings.updateThemeCss();
		UiSettings.colorsThemeChanges(theme);
	}


	/**
	 * Updates the css variables with the data of the new selected content-theme
	 */
	private static updateThemeCss() {

		const pagebg = UiSettings.contentTheme.palette.type === 'dark' ? "#000000" : "#f1f1f1";

		// remove old style tag
		const el = document.getElementById('root-manual-css-tag');
		if (el) { el.remove(); }

		const meta = document.querySelector('meta[name=theme-color]'); 
		if (meta) { meta.setAttribute('content' , pagebg); }

		// create the variables for the CSS
		const style = document.createElement('style');
		style.id = 'root-manual-css-tag';
		style.innerHTML = `

			:root {

				--paper: ${UiSettings.contentTheme.palette.background.paper};
				--paper-border: ${UiSettings.contentTheme.palette.type === 'dark' ? '#232323' : 'lightgrey'};
				--paper-accent: ${UiSettings.contentTheme.palette.type === 'dark' ? '#303030' : '#f7f7f7'};

				--page-bg: ${pagebg};
				--main-text:${UiSettings.contentTheme.palette.type === 'dark' ? "white" : "black"};
				--sub-text: ${UiSettings.contentTheme.palette.text.secondary};

				--primary: ${UiSettings.contentTheme.palette.primary.main};
				--primary-text: ${UiSettings.contentTheme.palette.primary.contrastText};

				--secondary: ${UiSettings.contentTheme.palette.secondary.main};
				--secondary-text: ${UiSettings.contentTheme.palette.secondary.contrastText};

				--error: ${UiSettings.contentTheme.palette.error.main};
				--error-text: ${UiSettings.contentTheme.palette.error.contrastText};

				--xs: ${UiSettings.contentTheme.breakpoints.values.xs}px;
				--sm: ${UiSettings.contentTheme.breakpoints.values.sm}px;
				--md: ${UiSettings.contentTheme.breakpoints.values.md}px;
				--lg: ${UiSettings.contentTheme.breakpoints.values.lg}px;
				--xl: ${UiSettings.contentTheme.breakpoints.values.xl}px;

				--spacing: ${UiSettings.contentTheme.spacing(1)}px;

				--entering-screen: ${UiSettings.contentTheme.transitions.duration.enteringScreen}ms;
				--leaving-screen: ${UiSettings.contentTheme.transitions.duration.leavingScreen}ms;
			}
		`;
		document.head.prepend(style);
	}


	/**
	 * Updates the UI by the configuration given
	 */
	public static updateSettingsByConfiguration() {
		UiSettings.updateThemeCss();
	}

	// TODO remove ?
	public static lessSm() {
		return window.innerWidth <= UiSettings.contentTheme.breakpoints.values.sm;
	}
	public static moreSm() {
		return window.innerWidth >= UiSettings.contentTheme.breakpoints.values.sm;
	}
	public static lessMd() {
		return window.innerWidth <= UiSettings.contentTheme.breakpoints.values.md;
	}
	public static moreMd() {
		return window.innerWidth >= UiSettings.contentTheme.breakpoints.values.md;
	}
	public static lessLg() {
		return window.innerWidth <= UiSettings.contentTheme.breakpoints.values.lg;
	}
	public static moreLg() {
		return window.innerWidth >= UiSettings.contentTheme.breakpoints.values.lg;
	}
	public static lessXl() {
		return window.innerWidth <= UiSettings.contentTheme.breakpoints.values.xl;
	}
	public static moreXl() {
		return window.innerWidth >= UiSettings.contentTheme.breakpoints.values.xl;
	}

}
