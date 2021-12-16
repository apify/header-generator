// @ts-expect-error not a ts library
import { BayesianNetwork } from 'generative-bayesian-network';

import ow from 'ow';
import { getBrowser, getUserAgent, getBrowsersFromQuery } from './utils';

import {
    SUPPORTED_BROWSERS,
    BROWSER_HTTP_NODE_NAME,
    MISSING_VALUE_DATASET_TOKEN,
    OPERATING_SYSTEM_NODE_NAME,
    DEVICE_NODE_NAME,
    SUPPORTED_OPERATING_SYSTEMS,
    SUPPORTED_DEVICES,
    SUPPORTED_HTTP_VERSIONS,
} from './constants';

import headerNetworkDefinition from './data_files/header-network-definition.json';

import inputNetworkDefinition from './data_files/input-network-definition.json';
import headersOrder from './data_files/headers-order.json';
import uniqueBrowserStrings from './data_files/browser-helper-file.json';

const http2SecFetchAttributes = {
    mode: 'sec-fetch-mode',
    dest: 'sec-fetch-dest',
    site: 'sec-fetch-site',
    user: 'sec-fetch-user',
};

const http1SecFetchAttributes = {
    mode: 'Sec-Fetch-Mode',
    dest: 'Sec-Fetch-Dest',
    site: 'Sec-Fetch-Site',
    user: 'Sec-Fetch-User',
};

/*
 * @private
 */
function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

/*
 * @private
 */
function browserVersionIsLesserOrEquals(browserVersionL: number[], browserVersionR: number[]) {
    return browserVersionL[0] <= browserVersionR[0];
}

const browserSpecificationShape = {
    name: ow.string,
    minVersion: ow.optional.number,
    maxVersion: ow.optional.number,
    httpVersion: ow.optional.string,
};

const headerGeneratorOptionsShape = {
    browsers: ow.optional.array.ofType(ow.any(ow.object.exactShape(browserSpecificationShape), ow.string)),
    operatingSystems: ow.optional.array.ofType(ow.string),
    devices: ow.optional.array.ofType(ow.string),
    locales: ow.optional.array.ofType(ow.string),
    httpVersion: ow.optional.string,
    browserListQuery: ow.optional.string,
};
/**
 * @typedef BrowserSpecification
 * @param {string} name - One of `chrome`, `firefox` and `safari`.
 * @param {number} minVersion - Minimal version of browser used.
 * @param {number} maxVersion - Maximal version of browser used.
 * @param {string} httpVersion - Http version to be used to generate headers (the headers differ depending on the version).
 *  Either 1 or 2. If none specified the httpVersion specified in `HeaderGeneratorOptions` is used.
 */

export interface BrowserSpecification {
    name: typeof SUPPORTED_BROWSERS[number];
    minVersion?: number;
    maxVersion?: number;
    httpVersion?: typeof SUPPORTED_HTTP_VERSIONS[number];
}

export type BrowsersType = BrowserSpecification[] | (typeof SUPPORTED_BROWSERS[number])[];

export interface HeaderGeneratorOptions {
    browsers: BrowsersType;
    browserListQuery: string;
    operatingSystems: (typeof SUPPORTED_OPERATING_SYSTEMS[number])[];
    devices: (typeof SUPPORTED_DEVICES[number])[];
    locales: string[];
    httpVersion: typeof SUPPORTED_HTTP_VERSIONS[number];
}

export type HttpBrowserObject = {
    name: BrowserSpecification['name'] | typeof MISSING_VALUE_DATASET_TOKEN,
    version: any[],
    completeString: string
    httpVersion: HeaderGeneratorOptions['httpVersion']
}

/**
 * @typedef HeaderGeneratorOptions
 * @param {Array<BrowserSpecification|string>} browsers - List of BrowserSpecifications to generate the headers for,
 *  or one of `chrome`, `firefox` and `safari`.
 * @param {string} browserListQuery - Browser generation query based on the real world data.
 *  For more info see the [query docs](https://github.com/browserslist/browserslist#full-list).
 *  If `browserListQuery` is passed the `browsers` array is ignored.
 * @param {Array<string>} operatingSystems - List of operating systems to generate the headers for.
 *  The options are `windows`, `macos`, `linux`, `android` and `ios`.
 * @param {Array<string>} devices - List of devices to generate the headers for. Options are `desktop` and `mobile`.
 * @param {Array<string>} locales - List of at most 10 languages to include in the
 *  [Accept-Language](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language) request header
 *  in the language format accepted by that header, for example `en`, `en-US` or `de`.
 * @param {string} httpVersion - Http version to be used to generate headers (the headers differ depending on the version).
 *  Can be either 1 or 2. Default value is 2.
 */

/**
 * HeaderGenerator randomly generates realistic browser headers based on specified options.
 */
export class HeaderGenerator {
    globalOptions: HeaderGeneratorOptions;

    browserListQuery: string | undefined;

    private inputGeneratorNetwork: any;

    private headerGeneratorNetwork: any;

    private uniqueBrowsers: HttpBrowserObject[]

    /**
     * @param {HeaderGeneratorOptions} options - default header generation options used unless overridden
     */
    constructor(options: Partial<HeaderGeneratorOptions> = {}) {
        ow(options, 'HeaderGeneratorOptions', ow.object.exactShape(headerGeneratorOptionsShape));
        // Use a default setup when the necessary values are not provided
        const {
            browsers = SUPPORTED_BROWSERS,
            operatingSystems = SUPPORTED_OPERATING_SYSTEMS as unknown as HeaderGeneratorOptions['operatingSystems'],
            devices = [SUPPORTED_DEVICES[0]],
            locales = ['en-US'],
            httpVersion = '2',
            browserListQuery = '',
        } = options;
        this.globalOptions = {
            browsers: this._prepareBrowsersConfig(browsers as BrowsersType, browserListQuery, httpVersion),
            operatingSystems,
            devices,
            locales,
            httpVersion,
            browserListQuery,
        };
        this.uniqueBrowsers = [];

        for (const browserString of uniqueBrowserStrings) {
            // There are headers without user agents in the datasets we used to configure the generator. They should be disregarded.
            if (browserString !== MISSING_VALUE_DATASET_TOKEN) {
                this.uniqueBrowsers.push(this._prepareHttpBrowserObject(browserString));
            }
        }

        this.inputGeneratorNetwork = new BayesianNetwork(inputNetworkDefinition);
        this.headerGeneratorNetwork = new BayesianNetwork(headerNetworkDefinition);
    }

    /**
     * Generates a single set of ordered headers using a combination of the default options specified in the constructor
     * and their possible overrides provided here.
     * @param {HeaderGeneratorOptions} options - specifies options that should be overridden for this one call
     * @param {Object} requestDependentHeaders - specifies known values of headers dependent on the particular request
     */
    getHeaders(options: Partial<HeaderGeneratorOptions> = {}, requestDependentHeaders: Record<string, string> = {}) {
        ow(options, 'HeaderGeneratorOptions', ow.object.exactShape(headerGeneratorOptionsShape));
        const headerOptions = { ...this.globalOptions, ...options };
        const possibleAttributeValues = this._getPossibleAttributeValues(headerOptions);

        // Generate a sample of input attributes consistent with the data used to create the definition files if possible.
        const inputSample = this.inputGeneratorNetwork.generateConsistentSampleWhenPossible(possibleAttributeValues);

        if (!inputSample) {
            throw new Error('No headers based on this input can be generated. Please relax or change some of the requirements you specified.');
        }

        // Generate the actual headers
        const generatedSample = this.headerGeneratorNetwork.generateSample(inputSample);

        // Manually fill the accept-language header with random ordering of the locales from input
        const generatedHttpAndBrowser = this._prepareHttpBrowserObject(generatedSample[BROWSER_HTTP_NODE_NAME]);
        let secFetchAttributeNames = http2SecFetchAttributes;
        let acceptLanguageFieldName = 'accept-language';
        if (generatedHttpAndBrowser.httpVersion !== '2') {
            acceptLanguageFieldName = 'Accept-Language';
            secFetchAttributeNames = http1SecFetchAttributes;
        }

        generatedSample[acceptLanguageFieldName] = this._getAcceptLanguageField(headerOptions.locales);

        // Add fixed headers if needed
        if (generatedHttpAndBrowser.name === 'chrome') {
            if (generatedHttpAndBrowser.version[0] >= 76) {
                generatedSample[secFetchAttributeNames.site] = 'same-site';
                generatedSample[secFetchAttributeNames.mode] = 'navigate';
                generatedSample[secFetchAttributeNames.user] = '?1';
                if (generatedHttpAndBrowser.version![0] >= 80) {
                    generatedSample[secFetchAttributeNames.dest] = 'document';
                }
            }
        }

        for (const attribute of Object.keys(generatedSample)) {
            if (attribute.startsWith('*') || generatedSample[attribute] === MISSING_VALUE_DATASET_TOKEN) delete generatedSample[attribute];
        }

        // Order the headers in an order depending on the browser
        return this.orderHeaders({
            ...generatedSample,
            ...requestDependentHeaders,
        }, (headersOrder as Record<string, any>)[generatedHttpAndBrowser.name]);
    }

    /**
     * Returns a new object that contains ordered headers.
     * @param {object} headers - specifies known values of headers dependent on the particular request
     * @param {string[]} order - an array of ordered header names, optional (will be deducted from `user-agent`)
     */
    orderHeaders(headers: Record<string, string>, order = this._getOrderFromUserAgent(headers)) {
        const orderedSample: Record<string, string> = {};

        for (const attribute of order) {
            if (attribute in headers) {
                orderedSample[attribute] = headers[attribute];
            }
        }

        for (const attribute of Object.keys(headers)) {
            if (!order.includes(attribute)) {
                orderedSample[attribute] = headers[attribute];
            }
        }

        return orderedSample;
    }

    private _prepareBrowsersConfig(
        browsers?: BrowsersType,
        browserListQuery?: string,
        httpVersion?: typeof SUPPORTED_HTTP_VERSIONS[number],
    ): BrowserSpecification[] {
        let finalBrowsers = browsers;

        if (browserListQuery) {
            finalBrowsers = getBrowsersFromQuery(browserListQuery);
        }

        return finalBrowsers!.map((browser) => {
            if (typeof browser === 'string') {
                return { name: browser, httpVersion };
            }

            browser.httpVersion = httpVersion;
            return browser;
        });
    }

    private _getBrowserHttpOptions(browsers: BrowserSpecification[]): string[] {
        const browserHttpOptions = [];
        for (const browser of browsers) {
            for (const browserOption of this.uniqueBrowsers) {
                if (browser.name === browserOption.name) {
                    if ((!browser.minVersion || browserVersionIsLesserOrEquals([browser.minVersion], browserOption.version))
                        && (!browser.maxVersion || browserVersionIsLesserOrEquals(browserOption.version, [browser.maxVersion]))
                        && browser.httpVersion === browserOption.httpVersion) {
                        browserHttpOptions.push(browserOption.completeString);
                    }
                }
            }
        }

        return browserHttpOptions;
    }

    private _getPossibleAttributeValues(headerOptions: Partial<HeaderGeneratorOptions>): Record<string, any> {
        const { browsers: optionsBrowser, browserListQuery, httpVersion, operatingSystems } = headerOptions;
        const browsers = this._prepareBrowsersConfig(optionsBrowser, browserListQuery, httpVersion);

        // Find known browsers compatible with the input
        const browserHttpOptions = this._getBrowserHttpOptions(browsers);
        const possibleAttributeValues: Record<string, any> = {};

        possibleAttributeValues[BROWSER_HTTP_NODE_NAME] = browserHttpOptions;

        possibleAttributeValues[OPERATING_SYSTEM_NODE_NAME] = operatingSystems;

        if (headerOptions.devices) {
            possibleAttributeValues[DEVICE_NODE_NAME] = headerOptions.devices;
        }

        return possibleAttributeValues;
    }

    private _getAcceptLanguageField(localesFromOptions: HeaderGeneratorOptions['locales']): string {
        let locales = localesFromOptions;
        let highLevelLocales = [];
        for (const locale of locales) {
            if (!locale.includes('-')) {
                highLevelLocales.push(locale);
            }
        }

        for (const locale of locales) {
            if (!highLevelLocales.includes(locale)) {
                let highLevelEquivalentPresent = false;
                for (const highLevelLocale of highLevelLocales) {
                    if (locale.includes(highLevelLocale)) {
                        highLevelEquivalentPresent = true;
                        break;
                    }
                }
                if (!highLevelEquivalentPresent) highLevelLocales.push(locale);
            }
        }

        highLevelLocales = shuffleArray(highLevelLocales);
        locales = shuffleArray(locales);

        const localesInAddingOrder = [];

        for (const highLevelLocale of highLevelLocales) {
            for (const locale of locales) {
                if (locale.includes(highLevelLocale) && !highLevelLocales.includes(locale)) {
                    localesInAddingOrder.push(locale);
                }
            }
            localesInAddingOrder.push(highLevelLocale);
        }

        let acceptLanguageFieldValue = localesInAddingOrder[0];

        for (let x = 1; x < localesInAddingOrder.length; x++) {
            acceptLanguageFieldValue += `,${localesInAddingOrder[x]};q=${1 - x * 0.1}`;
        }
        return acceptLanguageFieldValue;
    }

    /**
    * Extract structured information about a browser and http version in the form of an object from httpBrowserString.
    * @param {string} httpBrowserString - a string containing the browser name, version and http version, such as "chrome/88.0.4324.182|2"
    * @private
    */
    private _prepareHttpBrowserObject(httpBrowserString: string): HttpBrowserObject {
        const [browserString, httpVersion] = httpBrowserString.split('|');
        let browserObject;

        if (browserString === MISSING_VALUE_DATASET_TOKEN) {
            browserObject = { name: MISSING_VALUE_DATASET_TOKEN };
        } else {
            browserObject = this._prepareBrowserObject(browserString);
        }

        return {
            ...browserObject,
            httpVersion: httpVersion as HeaderGeneratorOptions['httpVersion'],
            completeString: httpBrowserString,
        } as HttpBrowserObject;
    }

    /**
    * Extract structured information about a browser in the form of an object from browserString.
    * @param {string} browserString - a string containing the browser name and version, such as "chrome/88.0.4324.182"
    * @private
    */
    private _prepareBrowserObject(browserString: string): HttpBrowserObject {
        const nameVersionSplit = browserString.split('/');
        const versionSplit = nameVersionSplit[1].split('.');
        const preparedVersion = [];
        for (const versionPart of versionSplit) {
            preparedVersion.push(parseInt(versionPart, 10));
        }

        return {
            name: nameVersionSplit[0],
            version: preparedVersion,
            completeString: browserString,
        } as HttpBrowserObject;
    }

    /**
     * @param {object} headers - non-normalized request headers
     * @returns {string[]} order
     * @private
     */
    private _getOrderFromUserAgent(headers: Record<string, string>) {
        const userAgent = getUserAgent(headers);
        const browser = getBrowser(userAgent);

        if (!browser) {
            return [];
        }

        return (headersOrder as Record<string, any>)[browser];
    }
}
