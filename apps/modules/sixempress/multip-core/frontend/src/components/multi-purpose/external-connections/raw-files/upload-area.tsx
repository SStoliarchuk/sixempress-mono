import React from 'react';
import { FieldsFactory, LoadingOverlay, ModalComponentProps } from '@sixempress/main-fe-lib';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import { DropzoneArea } from 'material-ui-dropzone'
import imageCompression from 'browser-image-compression';

export interface UAProps {
	onFilesConfirm: (f: File[]) => void,
}

export interface UAState {
	resizeSize: FileSize,
	currentFiles: File[],
}

export enum FileSize { 
	xs = 1, 
	sm, 
	md, 
	lg, 
	xl, 
}

export const FileSizeInMb = {
	[FileSize.xs]: 0.05,
	[FileSize.sm]: 0.2,
	[FileSize.md]: 0.8,
	[FileSize.lg]: 1.5,
	[FileSize.xl]: 2,
}

const formatMbString = (size: FileSize) => FileSizeInMb[size] > 1
	? '(' + FileSizeInMb[size] + ' MB)' 
	: '(' + Math.floor(FileSizeInMb[size] * 1000) + ' KB)';

export const FileSizeLabel = {
	[FileSize.sm]: 'Piccola ' + formatMbString(FileSize.sm),
	[FileSize.md]: 'Media ' + formatMbString(FileSize.md),
	[FileSize.lg]: 'Grande ' + formatMbString(FileSize.lg),
}


export class UploadArea extends React.Component<UAProps & ModalComponentProps, UAState> {

	private static resizeSelectValues = Object.keys(FileSizeLabel).map(e => ({
		label: FileSizeLabel[e],
		value: parseInt(e),
	}));

	state: UAState = {
		resizeSize: FileSize.md,
		currentFiles: [],
	}

	private handlers = {
		onChangeFileLoadDuringSelect: (files: File[]) => {
			this.setState({currentFiles: files});
		},
		onClickUploadAndSelect: () => {
			LoadingOverlay.loading = true;
			LoadingOverlay.text = 'Ridimensionamento...';

			this.resizeAndConvert(this.state.currentFiles)
			.then(d => {
				this.setState({currentFiles: []});
				this.props.onFilesConfirm(d);
				this.props.modalRef && this.props.modalRef.close();
			})
			.catch(e => { throw e; })
			.finally(() => LoadingOverlay.loading = false);
		},
		onChangeFileSize: (e: React.ChangeEvent<any>) => {
			const v = e.target.value;
			this.setState({resizeSize: v});
		},
	}

	/**
	 * resizes the images to the specified size and converts to jpeg
	 * @param files The files to convert 
	 */
	private async resizeAndConvert(files: File[]): Promise<File[]> {
		const tor: File[] = [];
		for (const f of files) {

			const targetSize = FileSizeInMb[this.state.resizeSize];

			// compress and convert image, disable exifOrientation, we want to upload as is
			if (f.type.indexOf('image') === 0) {
				// if (((f.type !== 'image/jpeg') || ((f.size / 1024 / 1024) > targetSize)))
				const compressedFile = await imageCompression(f, { maxSizeMB: targetSize, fileType: 'image/jpeg', exifOrientation: 1 })
				tor.push( new File([compressedFile], f.name.replace(/\.[a-z]{1,4}$/i, '') + '.jpeg', {type: 'image/jpeg'}) );
			}
			else {
				tor.push(f);
			}
		}
		return tor;
	}


	render() {
		const isModal = this.props.modalRef;
		
		const o = (
			<>
				<DropzoneArea
					// as we cannot clear the files inside becuase its a function component
					// and as we can't control the files array
					//
					// we regenerate each time the whole component instead
					// TODO instead of doing this
					// we should add a specific flag in the state
					// as to regenerate the component only when needed
					// instaed of regenerating when a user adds another image
					key={this.state.currentFiles.length}
					initialFiles={this.state.currentFiles}

					showAlerts={false}
					maxFileSize={Infinity}
					filesLimit={Infinity}
					onChange={this.handlers.onChangeFileLoadDuringSelect}
					dropzoneText='Carica nuovo o Seleziona sotto'
					{...!isModal ? {} : {
						dropzoneText: (
							<>
								<span>Trascina un Elemento o Premi qui per Caricare</span><br/>
								<small className='dz-sm'>Dimensione Massima 2MB</small><br/>
								<small className='dz-sm dz-info'>(Le immagini verranno ridimensionate automaticamente)</small>
							</>
						) as any,
					}}
				/>
				<Box display='flex' flexDirection='row-reverse'>
					<Button onClick={this.handlers.onClickUploadAndSelect} color='primary'>
						{isModal ? 'Carica' : 'Carica e seleziona'}
					</Button>
					<br/>
					<FieldsFactory.SelectField
						variant='outlined'
						label='Ridimensiona'
						value={this.state.resizeSize}
						values={UploadArea.resizeSelectValues}
						onChange={this.handlers.onChangeFileSize}
					/>
				</Box>
			</>
		);

		return isModal ? o : <Paper className='def-box'>{o}</Paper>
	}

}

