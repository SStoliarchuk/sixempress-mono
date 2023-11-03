
export class UiSettings {

	static get contentTheme() {
		return use_action.sxmp_ui_get_active_theme_mui_v4();
	}
	static get colorsThemeChanges() {
		return use_action.sxmp_ui_get_theme_changes_emitter();
	}
	static set colorsTheme(v: 'light' | 'dark') {
		use_action.sxmp_ui_set_active_theme_palette(v);
	}
	static get colorsTheme(): 'light' | 'dark' {
		return UiSettings.contentTheme.palette.type;
	}

	// TODO remove ?
	static lessSm = () => window.innerWidth <= UiSettings.contentTheme.breakpoints.values.sm;
	static moreSm = () => window.innerWidth >= UiSettings.contentTheme.breakpoints.values.sm;
	static lessMd = () => window.innerWidth <= UiSettings.contentTheme.breakpoints.values.md;
	static moreMd = () => window.innerWidth >= UiSettings.contentTheme.breakpoints.values.md;
	static lessLg = () => window.innerWidth <= UiSettings.contentTheme.breakpoints.values.lg;
	static moreLg = () => window.innerWidth >= UiSettings.contentTheme.breakpoints.values.lg;
	static lessXl = () => window.innerWidth <= UiSettings.contentTheme.breakpoints.values.xl;
	static moreXl = () => window.innerWidth >= UiSettings.contentTheme.breakpoints.values.xl;
	
}
