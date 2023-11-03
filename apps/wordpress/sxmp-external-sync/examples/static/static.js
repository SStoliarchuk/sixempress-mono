import './style.scss';
import './edit.scss';
import { registerBlockType } from '@wordpress/blocks';

registerBlockType('se-primio/static', {
	title: 'Static',
	icon: 'dismiss',
	category: 'seprimio',
	keywords: [],
	attributes: {
		val: {
			default: "_def",
			type: "string",
			source: "html",
			selector: "p"
		}
	},
	edit: ({setAttributes, attributes}) => {
		return (<input value={attributes.val} onChange={(e) => setAttributes({val: e.currentTarget.value || e.target.value || ""})}/>);
	},
	save: ({attributes}) => {
		return (<p>{attributes.val}</p>);
	},
});