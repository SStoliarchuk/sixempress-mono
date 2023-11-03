import { render, Component } from '@wordpress/element';

window.addEventListener('DOMContentLoaded', () => Array.from(document.querySelectorAll('[data-block-name="seprimio/{{blockname}}"]:not([data-edit])')).forEach(e => render(<Seprimio{{blocknamePascal}}/>, e)));
const {  } = window.__jsr;


class Seprimio{{blocknamePascal}} extends Component {

	render() {
		return (
			<div>
				Hello {{blocknamePascal}}
			</div>
		)
	}

}
