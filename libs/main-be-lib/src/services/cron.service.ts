import schedule from 'node-schedule';
import { EnvKeys } from '../utils/env-keys';

export class CronService {

	/**
	 * A wrapper on the scheduleJob function 
	 */
	static schedule(
		timeString: string | number | schedule.RecurrenceRule | schedule.RecurrenceSpecDateRange | schedule.RecurrenceSpecObjLit | Date, 
		callback: schedule.JobCallback,
	): void {
	}

}
