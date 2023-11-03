import './raw-files.list.css';
import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import Visibility from '@material-ui/icons/Visibility';
import { RawFile } from '../raw-files.dtd';
import { FieldsFactory, ModalService, ReactUtils } from '@sixempress/main-fe-lib';

interface RFProps<A extends Partial<RawFile>> {
	files: A[];
	selected: {[id: string]: 0};
	/**
	 * Adds the ability to toggle selected state
	 */
	onToggleSelected: (f: A) => void,
	/**
	 * in case you want to wrap the element into something
	 */
	wrapElement?: (r: JSX.Element, rf: A) => JSX.Element,
}

export class RawFilesList<A extends Partial<RawFile>> extends React.Component<RFProps<A>> {

	private onClickOpenDetail = (e: React.MouseEvent<any>) => {
		e.stopPropagation();
		const idx = parseInt(e.currentTarget.dataset.idx);
		const file = this.props.files[idx];
		ModalService.open({
			title: file.name, 
			content: (<div className='fullscreen-file-detail-container'>{this.getItemPreview(file, true)}</div>)
		}, {}, {
			fullScreen: true,
			TransitionComponent: ReactUtils.getSlideTransition()
		})
	};

	private onClickToggleSelect = (e: React.MouseEvent<any>) => {
		const idx = e.currentTarget.dataset.idx;
		this.props.onToggleSelected(this.props.files[idx]);
	}

	private getItemPreview(f: A, detailed?: true): JSX.Element {
			// no url so we show some genric thing
		if (!f.url)
			return detailed ? <code>{f.url}</code> : <span>{f.name || 'Oggetto'}</span>;

		// video 
		if (f.mimeType && f.mimeType.includes('video'))
			return (<div className={detailed ? '' : 'rfl-video-container'}><video controls={detailed}><source src={f.url} type='video/mp4'></source></video></div>);
		
		// image
		return (<img src={f.url} alt={f.name}/>)
	}

	render() {
		return (
			<ul className='file-table'>
				{this.props.files.map((f, idx) => {
					const isSelected = Boolean(this.props.selected[f.id]);

					const toR = (
						<li key={f.id} onClick={this.onClickToggleSelect} data-idx={idx} className={'file-container ' + (isSelected ? 'selected' : '')}>

							{this.getItemPreview(f)}
							{Boolean(f.name) && <span>{f.name}</span>}

							{/* left */}
							<FieldsFactory.Checkbox size='medium' className='file-btn file-select-btn' color='primary' checked={isSelected}/>
							{/* right */}
							<IconButton data-idx={idx} className='file-btn file-view-btn' onClick={this.onClickOpenDetail}> <Visibility/> </IconButton>
						</li>
					);

					return this.props.wrapElement ? this.props.wrapElement(toR, f) : toR;
				})}
			</ul>
		)
	}

}

