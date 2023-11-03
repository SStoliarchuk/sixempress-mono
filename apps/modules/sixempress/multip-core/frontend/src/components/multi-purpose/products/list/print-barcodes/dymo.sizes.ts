import { BarcodeType } from "apps/modules/sixempress/multip-core/frontend/src/services/barcode/barcode-service";
import { MultipService } from "apps/modules/sixempress/multip-core/frontend/src/services/multip/multip.service";

export enum PrinterPaper {
	largeAddress = "Indirizzo Largo 36mm x 89mm",
	medium = "Medio 32mm x 57mm",
}

export function getTemplate(paper: PrinterPaper, barocdeType: BarcodeType, skipLogo?: boolean): string {

	const conf = MultipService.content || {};
	let logo = conf.logo && conf.logo.fetched.content;
	if (logo) { logo = logo.replace(/^data.*base64,/, ''); }
	
	switch (paper) {

		case PrinterPaper.medium:
			return `<?xml version="1.0" encoding="utf-8"?>
			<DieCutLabel Version="8.0" Units="twips">
				<PaperOrientation>Portrait</PaperOrientation>
				<Id>Small30334</Id>
				<PaperName>30334 2-1/4 in x 1-1/4 in</PaperName>
				<DrawCommands>
					<RoundRectangle X="0" Y="0" Width="3240" Height="1800" Rx="270" Ry="270" />
				</DrawCommands>
				<ObjectInfo>
					<BarcodeObject>
						<Name>${"barcode"}</Name>
						<ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
						<BackColor Alpha="0" Red="255" Green="255" Blue="255" />
						<LinkedObjectName></LinkedObjectName>
						<Rotation>Rotation0</Rotation>
						<IsMirrored>False</IsMirrored>
						<IsVariable>True</IsVariable>
						<Text></Text>
						<Type>${barocdeType}</Type>
						<Size>Small</Size>
						<TextPosition>Bottom</TextPosition>
						<TextFont Family="Arial" Size="7.3125" Bold="False" Italic="False" Underline="False" Strikeout="False" />
						<CheckSumFont Family="Arial" Size="7.3125" Bold="False" Italic="False" Underline="False" Strikeout="False" />
						<TextEmbedding>Full</TextEmbedding>
						<ECLevel>0</ECLevel>
						<HorizontalAlignment>Center</HorizontalAlignment>
						<QuietZonesPadding Left="0" Top="0" Right="0" Bottom="0" />
					</BarcodeObject>
					<Bounds X="68" Y="86" Width="3123.77954101563" Height="600.944885253906" />
				</ObjectInfo>
				<ObjectInfo>
					<TextObject>
						<Name>${"name"}</Name>
						<ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
						<BackColor Alpha="0" Red="255" Green="255" Blue="255" />
						<LinkedObjectName></LinkedObjectName>
						<Rotation>Rotation0</Rotation>
						<IsMirrored>False</IsMirrored>
						<IsVariable>True</IsVariable>
						<HorizontalAlignment>CenterBlock</HorizontalAlignment>
						<VerticalAlignment>Middle</VerticalAlignment>
						<TextFitMode>ShrinkToFit</TextFitMode>
						<UseFullFontHeight>True</UseFullFontHeight>
						<Verticalized>False</Verticalized>
						<StyledText>
							<Element>
								<String></String>
								<Attributes>
									<Font Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False" />
									<ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
								</Attributes>
							</Element>
						</StyledText>
					</TextObject>
					<Bounds X="68" Y="671" Width="3125" Height="817" />
				</ObjectInfo>
				<ObjectInfo>
					<TextObject>
						<Name>${"price"}</Name>
						<ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
						<BackColor Alpha="0" Red="255" Green="255" Blue="255" />
						<LinkedObjectName></LinkedObjectName>
						<Rotation>Rotation0</Rotation>
						<IsMirrored>False</IsMirrored>
						<IsVariable>False</IsVariable>
						<HorizontalAlignment>Right</HorizontalAlignment>
						<VerticalAlignment>Top</VerticalAlignment>
						<TextFitMode>ShrinkToFit</TextFitMode>
						<UseFullFontHeight>True</UseFullFontHeight>
						<Verticalized>False</Verticalized>
						<StyledText>
							<Element>
								<String></String>
								<Attributes>
									<Font Family="Arial" Size="12" Bold="True" Italic="False" Underline="False" Strikeout="False" />
									<ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
								</Attributes>
							</Element>
						</StyledText>
					</TextObject>
					<Bounds X="138" Y="1398" Width="2880" Height="285" />
				</ObjectInfo>
				${!logo || skipLogo === true ? '' : `
				<ObjectInfo>
					<ImageObject>
						<Name>image</Name>
						<ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
						<BackColor Alpha="0" Red="255" Green="255" Blue="255" />
						<LinkedObjectName></LinkedObjectName>
						<Rotation>Rotation0</Rotation>
						<IsMirrored>False</IsMirrored>
						<IsVariable>False</IsVariable>
						<Image>${logo}</Image>
						<ScaleMode>Uniform</ScaleMode>
						<BorderWidth>0</BorderWidth>
						<BorderColor Alpha="255" Red="0" Green="0" Blue="0" />
						<HorizontalAlignment>Left</HorizontalAlignment>
						<VerticalAlignment>Center</VerticalAlignment>
					</ImageObject>
					<Bounds X="150" Y="1413" Width="1395" Height="300" />
				</ObjectInfo>
				`}
			</DieCutLabel>`;

		case PrinterPaper.largeAddress:
			return `<?xml version="1.0" encoding="utf-8"?>
			<DieCutLabel Version="8.0" Units="twips">
				<PaperOrientation>Landscape</PaperOrientation>
				<Id>LargeAddress</Id>
				<PaperName>30321 Large Address</PaperName>
				<DrawCommands>
					<RoundRectangle X="0" Y="0" Width="2025" Height="5020" Rx="270" Ry="270" />
				</DrawCommands>
				<ObjectInfo>
					<BarcodeObject>
						<Name>${"barcode"}</Name>
						<ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
						<BackColor Alpha="0" Red="255" Green="255" Blue="255" />
						<LinkedObjectName></LinkedObjectName>
						<Rotation>Rotation0</Rotation>
						<IsMirrored>False</IsMirrored>
						<IsVariable>True</IsVariable>
						<Text></Text>
						<Type>${barocdeType}</Type>
						<Size>Small</Size>
						<TextPosition>Bottom</TextPosition>
						<TextFont Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False" />
						<CheckSumFont Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False" />
						<TextEmbedding>Full</TextEmbedding>
						<ECLevel>0</ECLevel>
						<HorizontalAlignment>Center</HorizontalAlignment>
						<QuietZonesPadding Left="0" Top="0" Right="0" Bottom="0" />
					</BarcodeObject>
					<Bounds X="322" Y="57.9999999999999" Width="4328" Height="720" />
				</ObjectInfo>
				<ObjectInfo>
					<TextObject>
						<Name>${"name"}</Name>
						<ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
						<BackColor Alpha="0" Red="255" Green="255" Blue="255" />
						<LinkedObjectName></LinkedObjectName>
						<Rotation>Rotation0</Rotation>
						<IsMirrored>False</IsMirrored>
						<IsVariable>False</IsVariable>
						<HorizontalAlignment>Center</HorizontalAlignment>
						<VerticalAlignment>Middle</VerticalAlignment>
						<TextFitMode>AlwaysFit</TextFitMode>
						<UseFullFontHeight>True</UseFullFontHeight>
						<Verticalized>False</Verticalized>
						<StyledText>
							<Element>
								<String></String>
								<Attributes>
									<Font Family="Arial" Size="12" Bold="False" Italic="False" Underline="False" Strikeout="False" />
									<ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
								</Attributes>
							</Element>
						</StyledText>
					</TextObject>
					<Bounds X="322" Y="960" Width="2175" Height="870" />
				</ObjectInfo>
				<ObjectInfo>
					<TextObject>
							<Name>${"price"}</Name>
							<ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
							<BackColor Alpha="0" Red="255" Green="255" Blue="255" />
							<LinkedObjectName></LinkedObjectName>
							<Rotation>Rotation0</Rotation>
							<IsMirrored>False</IsMirrored>
							<IsVariable>False</IsVariable>
							<HorizontalAlignment>Right</HorizontalAlignment>
							<VerticalAlignment>Middle</VerticalAlignment>
							<TextFitMode>AlwaysFit</TextFitMode>
							<UseFullFontHeight>True</UseFullFontHeight>
							<Verticalized>False</Verticalized>
							<StyledText>
								<Element>
									<String></String>
									<Attributes>
										<Font Family="Arial" Size="72" Bold="True" Italic="False" Underline="False" Strikeout="False" />
										<ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
									</Attributes>
								</Element>
						</StyledText>
					</TextObject>
					<Bounds X="2895" Y="930" Width="1875" Height="980" />
				</ObjectInfo>
			</DieCutLabel>`;
	}
}
