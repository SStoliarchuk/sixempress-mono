// import React, { render, Component } from '@wordpress/element';
import { TextControl as _TextControl, Button as _Button, Dashicon as _Dashicon } from '@wordpress/components';
import { __ } from "@wordpress/i18n";

const TextControl = _TextControl as any, Button = _Button as any, Dashicon = _Dashicon as any;

export class BaseComponents {

	public static Loader = function Loader() {
		// public static Loader = function Loader(p: {align?: "center" | "left" | "right"}) {
		// <div className={'text-' + (p.align || "center")}>

		return (
			<div className='text-center se-expand'>
				<div className="lds-dual-ring"></div>
			</div>
		)
	}

	public static SearchForm = function SearchForm(p: {
		onChange: (val: string) => void, 
		onSubmit: (val: string) => void, 
		queryKey: string, 
		value: string
	}) {

		const onSubmit = (e: React.FormEvent<any>) => {
			e.preventDefault();
			p.onSubmit(p.value);
		};

		return (
			<form role="search" className="search-form" method="GET" onSubmit={onSubmit}>
				<label>
					<span className="screen-reader-text">{__("Search")}</span>
				</label>
				
				<TextControl 
					placeholder={__("Search") + "..."}
					type="search" 
					className="search-field" 
					name={p.queryKey}
					value={p.value} 
					onChange={p.onChange}
				/>
				
				<Button type="submit" className="search-submit">
					<Dashicon icon="search" className="icon"/>
				</Button>
			</form>
		)
	}

}