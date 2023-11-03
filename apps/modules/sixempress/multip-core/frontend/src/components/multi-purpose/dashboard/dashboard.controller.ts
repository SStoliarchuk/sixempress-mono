import { RequestService } from "@sixempress/main-fe-lib";
import { BePaths } from "apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths";

export class DashboardController {

	public static async getCards() {
		const d = await RequestService.client('get', BePaths.dashboarddata, { disableLoading: true });
		return d.data;
	}
	
}
