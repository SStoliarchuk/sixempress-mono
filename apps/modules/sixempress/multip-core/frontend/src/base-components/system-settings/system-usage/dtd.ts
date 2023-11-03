export interface RequestsSizeTrace {
	_id?: string;
	slug: string;
	month: string;
	year: string;
	requests: {
		[day: string]: {
			[hour: string]: {
				[userId: string]: {
					w: number,
					r: number,
				}
			}
		}
	};
}

export interface SUState {
	kbSize: number;
	monthlyUsage: {
		writtenToServer: number,
		sentFromServer: number,

		usageGraph?: {
			/**
			 * Array of days ordered from the oldest day to the latest day  old ===> new
			 * the day will be used as the string to show in the UI
			 */
			days: {day: number, kb: number}[],
			/**
			 * Hashmap Hour-Kilobyte
			 */
			singleDay: {[hour: string]: number},
			singleDayDate: string;
		},
		data?: RequestsSizeTrace,
	};
}
