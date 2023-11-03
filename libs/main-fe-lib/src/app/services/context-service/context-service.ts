import React from 'react';
import ReactDOM from 'react-dom/client';
import { BePaths } from "../../utils/enums/bepaths.enum";
import { CacheKeys } from "../../utils/enums/cache-keys.enum";
import { DataStorageService } from "@sixempress/utilities";
import { RequestService } from "../request-service/request-service";
import { TimeService } from "../time-service/time-service";
import { AuthResponse, AuthTokens, Configuration, DecodedAuthToken, DecodedAuthzToken, Environment, ILibConfig, SoftwareInstance } from "./context.dtd";
import { VersionService } from "../version.service";
import { BusinessLocationsService } from "../business/business-locations.service";
import { UrlService } from "../url-service/url.service";
import { QueryParametersEnum } from "../../utils/enums/query-parameters.enum";

export class ContextService {

}

