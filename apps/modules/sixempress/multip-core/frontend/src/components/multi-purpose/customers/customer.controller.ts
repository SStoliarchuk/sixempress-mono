import { Customer } from "./Customer";
import { CustomersTable } from "./customers.table";
import { CustomerEditor } from "./customer.editor";
import { DbObjectSettings, AbstractDbItemController,  EditorAmtsConfig, FetchableField } from "@sixempress/main-fe-lib";
import { AuthService } from '@sixempress/abac-frontend';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';

export class CustomerController extends AbstractDbItemController<Customer> {
	
	bePath = BePaths.customers;
	modelClass = ModelClass.Customer;
	
	protected fetchInfo: DbObjectSettings<Customer> = {
	};

	public static formatNameProjection: {[k: string]: 1} = {name: 1, _progCode: 1, lastName: 1};

	public static formatCustomerName(c?: Customer | FetchableField<Customer>): string {
		return CustomerController.formatName(c);
	}

	public static formatName(value: Customer | FetchableField<Customer>): string {
		if (!value)
			return '';

		const model: Customer = (value as FetchableField<Customer>).fetched || value as Customer;
		
		if (model) {
			const name = model.name + (model.lastName ? ' ' + model.lastName : '');
			return model._progCode 
				? model._progCode + ' | ' + name
				: name;
		}
	}

	
	/** 
	 * splits a string by its spaces to search for $elemMatch name + lastName combitnation possible
	 * we need to keep the order of the string the same, changing only the matching name|lastName order
	 * 
	 * firstName  |  lastName  \
	 * A B C D |  -  | A B C D \
	 * A B C | D  -  A | B C D \
	 * A B | C D  -  C D | A B \
	 * A | B C D  -  B C D | A
	 * 
	 * @param s the string to search for
	 * @param deepPath the path to the FetchableField in case the query is for another object not Customer
	 */
	public static createCustomerNameQuery(s: string, deepPath?: string, firstNameKey: string = ('name' as keyof Customer), lastNameKey: string = ('lastName' as keyof Customer)) {
		const split = s.trim().split(' ').map(i => i.trim());
		const matches = [];

		const kPrefix = deepPath ? deepPath + '.' : '';
		const name = kPrefix + firstNameKey;
		const lastName = kPrefix + lastNameKey;

		for (let i = 0; i < split.length; i++) {
			const part1 = split.slice(0, i).join(' ');
			const part2 = split.slice(i).join(' ');

			if (part1 && part2) {
				matches.push({[name]: {$regex: part1, $options: 'i'}, [lastName]: {$regex: part2, $options: 'i'}});
				matches.push({[name]: {$regex: part2, $options: 'i'}, [lastName]: {$regex: part1, $options: 'i'}});
			}
			else if (part1) {
				matches.push({[name]: {$regex: part1, $options: 'i'}});
				matches.push({[lastName]: {$regex: part1, $options: 'i'}});
			}
			else if (part2) {
				matches.push({[name]: {$regex: part2, $options: 'i'}});
				matches.push({[lastName]: {$regex: part2, $options: 'i'}});
			}
		}

		return matches;
	}

	public static AmtsFieldProps(p: Partial<Omit<EditorAmtsConfig<Customer>, 'amtsInput'> & { amtsInput: Partial<EditorAmtsConfig<Customer>['amtsInput']>}> = {}): EditorAmtsConfig<Customer> {
		return {
			renderValue: CustomerController.formatCustomerName,
			modelClass: ModelClass.Customer,
			...p,
			amtsInput: {
				bePath: BePaths.customers,
				editor: AuthService.isAttributePresent(Attribute.addCustomers) && CustomerEditor,
				infoConf: { columns: [{
					title: 'Cod.',
					data: '_progCode',
					searchOptions: {
						castToInt: true
					}
				}, {
					title: 'Nome',
					data: 'name',
				}, {
					title: 'Cognome',
					data: 'lastName',
				}, {
					title: 'N. Tel',
					data: 'phone'
				}] },
				...(p.amtsInput || {}),
			}
		}
	}

}
