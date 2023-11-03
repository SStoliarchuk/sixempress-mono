import { ActionRegister } from '@sixempress/utilities';
import { LibNotification } from './notifications.dtd';

export class NotificationsService {

	public static notificationsUpdate = new ActionRegister();

	public static notifications: LibNotification[] = [];

	/**
	 * adds notification and emits update
	 * @returns id of the notifications
	 */
	public static addNotification(n: LibNotification): string {
		if (typeof n.id === 'string') {
			let idx = NotificationsService.notifications.findIndex(open => open.id === n.id);
			if (idx !== -1) 
				NotificationsService.notifications.splice(idx, 1);
		}
		else {
			n.id = Math.random().toString();
		}

		NotificationsService.notifications.push(n);
		NotificationsService.notificationsUpdate.emit();

		return n.id;
	}

	/**
	 * Removes a notification and emits update
	 * @param id id of notifiaction to remove
	 */
	public static removeNotification(id: string) {
		let idx = NotificationsService.notifications.findIndex(n => n.id === id);
		if (idx === -1)
			return;
		
		if (NotificationsService.notifications[idx].onRemoved)
			NotificationsService.notifications[idx].onRemoved();

		NotificationsService.notifications.splice(idx, 1);
		NotificationsService.notificationsUpdate.emit();
	}


}