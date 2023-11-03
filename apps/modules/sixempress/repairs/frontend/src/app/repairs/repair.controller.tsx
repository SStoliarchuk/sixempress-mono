import React from 'react';
import { Repair, RepairStatusLabel, DeviceTypeLabel, CustomerNoticeLabel, RepairStatus } from "./Repair";
import { RepairsTable, RTProps } from "./repairs.table";
import { RepairEditor } from "./repair-editor/repair-editor";
import { DbObjectSettings,  DataFormatterService, SnackbarService, RouterService } from "@sixempress/main-fe-lib";
import { ModelClass } from '../../enums/model-class';
import { Attribute } from '../../enums/attributes';
import { BePaths } from '../../enums/bepaths';
import { MultiPCKeys } from '../../enums/various';
import { AdditionalScannedItemType, SelectQuickActionValue } from '@sixempress/multi-purpose';
import { CustomerController } from '@sixempress/multi-purpose';
import { MultipUserController } from '@sixempress/multi-purpose';
import { PricedRowsSaleController } from '@sixempress/multi-purpose';
import { AuthService } from '@sixempress/abac-frontend';
import { HookActions, HookFilters } from '@stlse/frontend-connector';
import { QuickChose } from 'apps/modules/sixempress/multip-core/frontend/src/utils/quick-chose/quick-chose';
import { checkRepairForDelivery } from './modals/check-repair-for-delivery.dialog';

export enum CSECRepairsValues {
	openWorkForm = 'CSEC_repairs_workform',
	deliver = 'CSEC_repairs_deliver',
}

export const repairsBarcodePrefix = AdditionalScannedItemType.repairs;

export class RepairController extends PricedRowsSaleController<Repair> {


	public static getFinalStatuses() {
		return [
			RepairStatus.deliveredFailure,
			RepairStatus.delivered,
			RepairStatus.deliveredWillPay,
		];
	}

	bePath = BePaths.Repair;
	modelClass = ModelClass.Repair;
	protected editorJsx = RepairEditor;
	protected tableJsx = RepairsTable;
	protected fetchInfo: DbObjectSettings<Repair> = {
		customer: {  },
		assignedTo: {  },
		_opReportLastAuthor: { _author: { } },
	};


	public static filterHooks: HookFilters = {
		sxmp_codescanner_events_decompose_codescan_type: (ctx, ret, decoded, code) => {
			const match = code.match(new RegExp('^' + repairsBarcodePrefix + "([0-9]+$)"));
			return match ? {prefix: repairsBarcodePrefix, fixedCode: match[1]} : ret;
		}
	}

	public static actionHooks: HookActions = {
		sxmp_codescanner_events_process_read: async (ctx, r, decoded) => {
			if (decoded.prefix !== repairsBarcodePrefix || !AuthService.isAttributePresent(Attribute.viewRepairs))
				return;

			const res = await new RepairController().getMulti({params: {filter: {_progCode: +decoded.fixedCode}}});
			const rep = res.data[0];

			// no items with this barcode
			if (!rep)
				return SnackbarService.openSimpleSnack("Riparazione non trovata", {variant: 'error'});

			if (rep.endDate)
				return SnackbarService.openSimpleSnack("Riparazione gia\' consegnata", {variant: 'error'});

			QuickChose.selectQuickChoseOptions({
				cacheKey: RepairController.codeScanActionCacheKey,
				values: RepairController.getCodeScanActionValues(),
				onChose: (v) => {
					switch (v) {
						case CSECRepairsValues.deliver:
							return checkRepairForDelivery(rep).toPromise().then(v => v && SnackbarService.openSimpleSnack('Consegnato con Successo!', {variant: 'success'}));

						case CSECRepairsValues.openWorkForm:
							return RouterService.goto("/repairs/operations/" + rep._id);
					}
				}
			});

		}
	}

	public static codeScanActionCacheKey = MultiPCKeys.csecRepairs;

	public static getCodeScanActionValues(): SelectQuickActionValue[] {
		return [{
			label: 'Consegna',
			value: CSECRepairsValues.deliver,
			visible: AuthService.isAttributePresent(Attribute.modifyRepairs),
		}, {
			label: 'Apri lavorazione',
			value: CSECRepairsValues.openWorkForm,
			visible: AuthService.isAttributePresent(Attribute.modifyRepairs),
		}];
	}

	protected getDetailsRender(item: Repair) {
		return (
			<div className='peek-div-info-container'>
				<div className='peek-div-info-card'>
					<table className='peek-card-table'>
						<tbody>
							<tr>
								<th>Codice: </th>
								<td>{item._progCode}</td>
							</tr>
							<tr>
								<th>Entrato il: </th>
								<td>{DataFormatterService.formatUnixDate(item.date)}</td>
							</tr>
							<tr>
								<th>Cliente: </th>
								<td>{CustomerController.formatCustomerName(item.customer.fetched)}</td>
							</tr>
							<tr>
								<th>N. Telefono: </th>
								<td>{item.customer.fetched.phone ? item.customer.fetched.phone : 'Non fornito'}</td>
							</tr>
							<tr>
								<th>Dispositivo: </th>
								<td>{DeviceTypeLabel[item.deviceType]}</td>
							</tr>
							<tr>
								<th>Modello: </th>
								<td>{item.model}</td>
							</tr>
							<tr>
								<th>Colore: </th>
								<td>{item.color}</td>
							</tr>
							{typeof item.deviceCode !== 'undefined' && (
								<tr>
									<th>Codice: </th>
									<td>{item.deviceCode}</td>
								</tr>
							)}
							{typeof item.accessories !== 'undefined' && (
								<tr>
									<th>Accessori: </th>
									<td>{item.accessories}</td>
								</tr>
							)}
							{typeof item.visibleDefects !== 'undefined' && (
								<tr>
									<th>Difetti visibili: </th>
									<td>{item.visibleDefects}</td>
								</tr>
							)}
							{typeof item.estimatedRepairTime !== 'undefined' && (
								<tr>
									<th>Tempo riparazione: </th>
									<td>{DataFormatterService.formatUnixDate(item.estimatedRepairTime)}</td>
								</tr>
							)}
							{typeof item.assignedTo !== 'undefined' && (
								<tr>
									<th>Assegnato a: </th>
									<td>{item.assignedTo.fetched._progCode} | {item.assignedTo.fetched.name}</td>
								</tr>
							)}
							{typeof item.totalPrice !== 'undefined' && (
								<tr>
									<th>Preventivo: </th>
									<td>€ {DataFormatterService.centsToScreenPrice(item.totalPrice)}</td>
								</tr>
							)}
							<tr>
								<th>Stato: </th>
								<td>{RepairStatusLabel[item.status]}</td>
							</tr>
							{RepairController.getFinalStatuses().includes(item.status) && (
								<tr>
									<th>Consegnato: </th>
									<td>{DataFormatterService.formatUnixDate(item.endDate)}</td>
								</tr>
							)}
							{typeof item.customerNotice !== 'undefined' && (
								<tr>
									<th>Comunicazione: </th>
									<td>{CustomerNoticeLabel[item.customerNotice]}</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				<div className='peek-div-info-card peek-card-table'>
					<div>Difetti dichiarati:</div>
					<div>
						<pre className='pre-span'>
							{item.defects}
						</pre>
					</div>
					{typeof item.notes !== 'undefined' && (
						<>
							<div>Note:</div>
							<pre className='pre-span'>
								{item.notes}
							</pre>
						</>
					)}
					{typeof item.opReport !== 'undefined' && (
						<>
							<div>Rapporto Intervento: {item._opReportLastAuthor && MultipUserController.formatName(item._opReportLastAuthor._author)}</div>
							<pre className='pre-span'>
								{item.opReport}
							</pre>
						</>
					)}
				</div>

				{RepairController.generatePeekPreviewCard(item)}

			</div>
		);
	}


}
