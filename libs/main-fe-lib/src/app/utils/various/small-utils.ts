import { SnackbarService } from '../../services/snackbars/snackbar.service';
import { RouterService } from '../../services/router/router-service';
import { SnackbarVariant } from '@sixempress/theme';


export class LibSmallUtils {

  /**
	 * Opens a snackabar to notify the user of something
	 * @param text The text for the notification
	 * @param opts The options for the notification
	 */
	static notify(message: string, opts?: SnackbarVariant): void {
		if (typeof opts === 'string') {
			SnackbarService.openSimpleSnack(message, {variant: opts});
		} else {
			SnackbarService.openSimpleSnack(message, opts);
		}
	}

  /**
	 * reloads the current page
	 */
	static reloadPage() {
		RouterService.reloadPage();
	}



}