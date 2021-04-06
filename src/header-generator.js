const fs = require('fs');
const path = require('path');
const { BayesianNetwork } = require('bayesian-network');
const { default: ow } = require('ow');

const headerNetworkDefinitionPath = path.join(__dirname, './data_files/header-network-definition.json');
const inputNetworkDefinitionPath = path.join(__dirname, './data_files/input-network-definition.json');
const browserHelperFilePath = path.join(__dirname, './data_files/browser-helper-file.json');
const headersOrderFilePath = path.join(__dirname, './data_files/headers-order.json');

const browserHttpNodeName = '*BROWSER_HTTP';
const operatingSystemNodeName = '*OPERATING_SYSTEM';
const deviceNodeName = '*DEVICE';
const missingValueDatasetToken = '*MISSING_VALUE*';

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
function getRandomInteger(minimum, maximum) {
    return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

/*
 * @private
 */
function shuffleArray(array) {
    if (array.length > 1) {
        for (let x = 0; x < array.length; x++) {
            const position1 = getRandomInteger(0, array.length - 1);
            const position2 = getRandomInteger(0, array.length - 1);
            const holder = array[position1];
            array[position1] = array[position2];
            array[position2] = holder;
        }
    }

    return array;
}

/*
 * @private
 */
function browserVersionIsLesserOrEquals(browserVersionL, browserVersionR) {
    return browserVersionL[0] <= browserVersionR[0];
}

/**
 * Extract structured information about a browser and http version in the form of an object from httpBrowserString.
 * @param {string} httpBrowserString - a string containing the browser name, version and http version, such as "chrome/88.0.4324.182|2"
 * @private
 */
function prepareHttpBrowserObject(httpBrowserString) {
    const [browserString, httpVersion] = httpBrowserString.split('|');
    const browserObject = browserString === missingValueDatasetToken ? { name: missingValueDatasetToken } : prepareBrowserObject(browserString);
    return {
        ...browserObject,
        ...{
            httpVersion,
            completeString: httpBrowserString,
        },
    };
}

/**
 * Extract structured information about a browser in the form of an object from browserString.
 * @param {string} browserString - a string containing the browser name and version, such as "chrome/88.0.4324.182"
 * @private
 */
function prepareBrowserObject(browserString) {
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
    };
}

const browserSpecificationShape = {
    name: ow.string,
    minVersion: ow.optional.number,
    maxVersion: ow.optional.number,
    httpVersion: ow.optional.string,
};

const headerGeneratorOptionsShape = {
    browsers: ow.optional.array.ofType(ow.object.exactShape(browserSpecificationShape)),
    operatingSystems: ow.optional.array.ofType(ow.string),
    devices: ow.optional.array.ofType(ow.string),
    locales: ow.optional.array.ofType(ow.string),
    httpVersion: ow.optional.string,
};

/**
 * @typedef BrowserSpecification
 * @param {string} name - One of `chrome`, `firefox` and `safari`.
 * @param {number} minVersion - Minimal version of browser used.
 * @param {number} maxVersion - Maximal version of browser used.
 * @param {string} httpVersion - Http version to be used to generate headers (the headers differ depending on the version).
 *  Either 1 or 2. If none specified the httpVersion specified in `HeaderGeneratorOptions` is used.
 */
/**
 * @typedef HeaderGeneratorOptions
 * @param {Array<BrowserSpecification>} browsers - List of BrowserSpecifications to generate the headers for.
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
class HeaderGenerator {
    /**
     * @param {HeaderGeneratorOptions} options - default header generation options used unless overridden
     */
    constructor(options = {}) {
        ow(options, 'HeaderGeneratorOptions', ow.object.exactShape(headerGeneratorOptionsShape));
        this.defaultOptions = options;
        this.headersOrder = JSON.parse(fs.readFileSync(headersOrderFilePath, { encoding: 'utf8' }));
        const uniqueBrowserStrings = JSON.parse(fs.readFileSync(browserHelperFilePath, { encoding: 'utf8' }));
        this.uniqueBrowsers = [];
        for (const browserString of uniqueBrowserStrings) {
            if (browserString === missingValueDatasetToken) {
                this.uniqueBrowsers.push({
                    name: missingValueDatasetToken,
                });
            } else {
                this.uniqueBrowsers.push(prepareHttpBrowserObject(browserString));
            }
        }
        this.inputGeneratorNetwork = new BayesianNetwork(inputNetworkDefinitionPath);
        this.headerGeneratorNetwork = new BayesianNetwork(headerNetworkDefinitionPath);
    }

    /**
     * Generates a single set of headers using a combination of the default options specified in the constructor
     * and their possible overrides provided here.
     * @param {HeaderGeneratorOptions} options - specifies options that should be overridden for this one call
     * @param {Object} requestDependentHeaders - specifies known values of headers dependent on the particular request 
     */
    getHeaders(options = {}, requestDependentHeaders = {}) {
        ow(options, 'HeaderGeneratorOptions', ow.object.exactShape(headerGeneratorOptionsShape));
        const headerOptions = { ...this.defaultOptions, ...options };

        // Set up defaults
        if (!headerOptions.locales) {
            headerOptions.locales = ['en-US'];
        }
        if (!headerOptions.httpVersion) {
            headerOptions.httpVersion = '2';
        }
        if (!headerOptions.browsers) {
            headerOptions.browsers = [
                { name: 'chrome' },
                { name: 'firefox' },
                { name: 'safari' },
            ];
        }
        if (!headerOptions.operatingSystems) {
            headerOptions.operatingSystems = [
                'windows',
                'macos',
                'linux',
                'android',
                'ios',
            ];
        }

        headerOptions.browsers = headerOptions.browsers.map((browserObject) => {
            if (!browserObject.httpVersion) {
                browserObject.httpVersion = headerOptions.httpVersion;
            }
            return browserObject;
        });

        const possibleAttributeValues = {};

        // Find known browsers compatible with the input
        const browserHttpOptions = [];
        for (const browser of headerOptions.browsers) {
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

        possibleAttributeValues[browserHttpNodeName] = browserHttpOptions;

        possibleAttributeValues[operatingSystemNodeName] = headerOptions.operatingSystems;

        if (headerOptions.devices) {
            possibleAttributeValues[deviceNodeName] = headerOptions.devices;
        }

        // Generate a sample of input attributes consistent with the data used to create the definition files if possible.
        const inputSample = this.inputGeneratorNetwork.generateSampleWheneverPossible(possibleAttributeValues);

        if (!inputSample) {
            throw new Error('No headers based on this input can be generated. Please relax or change some of the requirements you specified.');
        }

        // Generate the actual headers
        let generatedSample = this.headerGeneratorNetwork.generateSample(inputSample);

        // Manually fill the accept-language header with random ordering of the locales from input
        const generatedHttpAndBrowser = prepareHttpBrowserObject(generatedSample[browserHttpNodeName]);
        let secFetchAttributeNames = http2SecFetchAttributes;
        let acceptLanguageFieldName = 'accept-language';
        if (generatedHttpAndBrowser.httpVersion !== '2') {
            acceptLanguageFieldName = 'Accept-Language';
            secFetchAttributeNames = http1SecFetchAttributes;
        }

        let highLevelLocales = [];
        for (const locale of headerOptions.locales) {
            if (!locale.includes('-')) {
                highLevelLocales.push();
            }
        }

        for (const locale of headerOptions.locales) {
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
        headerOptions.locales = shuffleArray(headerOptions.locales);
        const localesInAddingOrder = [];
        for (const highLevelLocale of highLevelLocales) {
            for (const locale of headerOptions.locales) {
                if (locale.includes(highLevelLocale) && !highLevelLocales.includes(locale)) {
                    localesInAddingOrder.push(locale);
                }
            }
            localesInAddingOrder.push(highLevelLocale);
        }

        let acceptLanguageFieldValue = localesInAddingOrder[0];
        for (let x = 1; x < localesInAddingOrder.length; x++) {
            acceptLanguageFieldValue += `,${localesInAddingOrder[x]};${1 - x * 0.1}`;
        }

        generatedSample[acceptLanguageFieldName] = acceptLanguageFieldValue;

        // Add fixed headers if needed
        if (generatedHttpAndBrowser.name === 'chrome') {
            if (generatedHttpAndBrowser.version[0] >= 76) {
                generatedSample[secFetchAttributeNames.site] = 'same-site';
                generatedSample[secFetchAttributeNames.mode] = 'navigate';
                generatedSample[secFetchAttributeNames.user] = '?1';
                if (generatedHttpAndBrowser.version[0] >= 80) {
                    generatedSample[secFetchAttributeNames.dest] = 'document';
                }
            }
        }

        for (const attribute of Object.keys(generatedSample)) {
            if (attribute.startsWith('*') || generatedSample[attribute] === missingValueDatasetToken) delete generatedSample[attribute];
        }

        generatedSample = { ...generatedSample, ...requestDependentHeaders };

        // Order the headers in an order depending on the browser
        const orderedSample = {};
        for (const attribute of this.headersOrder[generatedHttpAndBrowser.name]) {
            if (attribute in generatedSample) {
                orderedSample[attribute] = generatedSample[attribute];
            }
        }

        return orderedSample;
    }
}

module.exports = HeaderGenerator;
