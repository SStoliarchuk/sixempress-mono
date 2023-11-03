import { FetchableField, MediaFile } from "@sixempress/main-fe-lib";

export interface ISxmpRepairsSettings {
  entrancePdf?: {
    title?: string,
    logo?: FetchableField<MediaFile>,
    infoRows?: string,
    disclaimer?: string,
  },
  interventPdf?: {
    title?: string,
    interventTitle?: string,
    logo?: FetchableField<MediaFile>,
    infoRows?: string,
    disclaimer?: string,
  },
}
