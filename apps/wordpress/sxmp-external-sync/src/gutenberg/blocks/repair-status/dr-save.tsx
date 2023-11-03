import { render, Component } from '@wordpress/element';

window.addEventListener('DOMContentLoaded', () => Array.from(document.querySelectorAll('[data-block-name="sxmpes/repair-status"]:not([data-edit])')).forEach(e => render(<SxmpesRepairStatus/>, e)));
const { UrlService, ClientApiService, BaseComponents } = window.__jsr;


interface SRSState {
	searchValue: string;
	/**
	 * False if not object has been found after the query
	 * undefined if not initialized
	 */
	fromBe?: undefined | false | any;
	/**
	 * Wheter the request for the info is complete,
	 */
	beRequestComplete: boolean;
}


class _SxmpesRepairStatus extends Component<{}, SRSState> {

	/**
	 * This parameter key is used in WPRedirects.php, so dont change it please
	 */
	public static readonly PARAMETER_KEY = 'id';

	state: SRSState = {
		searchValue: UrlService.getUrlParameter(_SxmpesRepairStatus.PARAMETER_KEY, 'number') || "",
		beRequestComplete: true,
	};

	/**
	 * update the component with the value in the query
	 * or remove the value if it's invalid
	 */
	componentDidMount() {
		if (this.state.searchValue) { this.updateViewedObject(); }
	}

	/**
	 * Updates the query string in the url and the fetches the searched object
	 */
	private updateViewedObject = (searchValue: string = this.state.searchValue) => {
		this.setState({beRequestComplete: false});
		UrlService.setUrlParameterValue(_SxmpesRepairStatus.PARAMETER_KEY, searchValue);

		ClientApiService.get("get_repair_info", {id: searchValue})
			.then(v => this.setState({beRequestComplete: true, fromBe: v || false}));
	};


	private onChangeValue = (val: string) => {
		this.setState({searchValue: val})
	};

	render() {
		return (
			<div>
				<div>
					<BaseComponents.SearchForm 
						queryKey={_SxmpesRepairStatus.PARAMETER_KEY}
						value={this.state.searchValue} 
						onChange={this.onChangeValue}
						onSubmit={this.updateViewedObject}
					/>
				</div>
				<br/>
				<div>
					{
						this.state.beRequestComplete === false 
						? "Caricamento..."
						
						: typeof this.state.fromBe === 'undefined' 
						? "Cerca usando il codice riparazione"
						
						: this.state.fromBe === false 
						? "Nessuna riparazione trovata con questo codice"
						
						: (
							<>
								<table>
									<tbody>
										<tr><th>Modello</th><td>{this.state.fromBe.model}</td></tr>
										<tr><th>Colore</th><td>{this.state.fromBe.color}</td></tr>
									</tbody>
								</table>
							</>
						)
					}
				</div>
			</div>
		);
	}

}

const SxmpesRepairStatus = _SxmpesRepairStatus as any;
