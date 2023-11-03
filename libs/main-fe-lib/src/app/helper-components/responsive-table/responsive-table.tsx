import React from 'react';
import { ComplexRow, TableInput, ComplexCell, TableHead, TableBody, TableConf } from './dtd';
import Ttable from '@material-ui/core/Table';
import Tthead from '@material-ui/core/TableHead';
import Ttbody from '@material-ui/core/TableBody';
import Ttr from '@material-ui/core/TableRow';
import Ttd from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';


/**
 * Generates a simple table with JSXconf
 * @WARNING
 * body tds.length HAS to be equal to head ths.length >>:[
 */
export function ResponsiveTable(props: {
	headTh: TableHead, 
	bodyTr: TableBody,
	configuration?: TableConf
}): JSX.Element {

	const conf: TableConf = props.configuration || {};

	// transform body rows once
	const bodyRows: {tds: {el: any, props?: any, key: any}[], props?: any, key: string}[] = [];

	for (let trIdx = 0; trIdx < props.bodyTr.length; trIdx++) {

		// create tds
		const tds = ((props.bodyTr[trIdx] as ComplexRow).tds || props.bodyTr[trIdx] as TableInput[]);
		const els: {el: any, props?: any, key: any}[] = [];

		for (let i = 0; i < tds.length; i++) {
			// fix the null|undefined columns
			if (tds[i] === null || tds[i] === undefined) {
				tds[i] = '';
			}

			// simple celll
			if (typeof (tds[i] as ComplexCell).jsxEl === 'undefined') {
				els.push({el: (tds[i] as TableInput), key: '' + props.bodyTr.length + tds.length + i});
			}
			// complex cell
			else {
				els.push({el: (tds[i] as ComplexCell).jsxEl, key: '' + props.bodyTr.length + tds.length + i, props: (tds[i] as ComplexCell).props});
			}
		}

		// simple row
		if (props.bodyTr[trIdx].constructor === Array) {
			bodyRows.push( {tds: els, key: '' + props.bodyTr.length + trIdx} );
		}
		// complex row
		else {
			bodyRows.push( {tds: els, key: '' + props.bodyTr.length + trIdx, props: (props.bodyTr[trIdx] as ComplexRow).props} );
		}
	}

	return (
		<TableContainer component='div' {...(conf.tableContainerProps || {})}>
			<Ttable size='small' {...(conf.tableProps || {})}>
				<Tthead>
					<Ttr {...((props.headTh as ComplexRow).props || {})}>
						{
							((props.headTh as ComplexRow).tds || (props.headTh as TableInput[])).map((th, idx) => 
								typeof (th as ComplexCell).jsxEl === 'undefined'
									? ( <Ttd key={'' + ((props.headTh as ComplexRow).tds || (props.headTh as TableInput[])).length + idx}>{th as any}</Ttd> )
									: ( <Ttd key={'' + ((props.headTh as ComplexRow).tds || (props.headTh as TableInput[])).length + idx} {...(th as ComplexCell).props}>{(th as ComplexCell).jsxEl}</Ttd> )
							)
						}
					</Ttr>
				</Tthead>
				<Ttbody>
					{bodyRows.map(r => {
						const cells = r.tds.map(t => t.props 
							? <Ttd {...t.props} key={t.key}>{t.el}</Ttd>
							: <Ttd key={t.key}>{t.el}</Ttd>
						);
						
						return r.props 
							? <Ttr {...r.props} key={r.key}>{cells}</Ttr> 
							: <Ttr key={r.key}>{cells}</Ttr>;
					})}
				</Ttbody>
			</Ttable>
		</TableContainer>
	);

}


