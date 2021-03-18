const fs = require('fs');
const path = require('path');
const { BayesianNetwork } = require('bayesian-network');

const headerNetworkDefinitionPath = path.join(__dirname, './headerNetworkDefinition.json');
const inputNetworkDefinitionPath = path.join(__dirname, './inputNetworkDefinition.json');
const browserHelperFilePath = path.join(__dirname, './browserHelperFile.json');

const httpVersionNodeName = '*HTTP_VERSION';
const browserNodeName = '*BROWSER';
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

function getRandomInteger(minimum, maximum) {
    return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

function shuffleArray(array) {
    if (array.length > 1) {
        for (let x = 0; x < 10; x++) {
            const position1 = getRandomInteger(0, array.length - 1);
            const position2 = getRandomInteger(0, array.length - 1);
            const holder = array[position1];
            array[position1] = array[position2];
            array[position2] = holder;
        }
    }

    return array;
}

function browserVersionIsLesserOrEquals(browserVersionL, browserVersionR) {
    return browserVersionL[0] <= browserVersionR[0];
}

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

/**
 * @typedef Browser
 * @param {string} name - One of "chrome", "firefox", "safari", "edge" for now.
 * @param {number} minVersion - Minimal version of browser used.
 * @param {number} maxVersion - Maximal version of browser used.
 * @param {string} httpVersion - Either 1 or 2. If none specified the global `httpVersion` is used.
 */
/**
 * @typedef HeaderGeneratorOptions
 * @param {Array<Browser>} browsers - List of Browsers to generate the headers for.
 * @param {Array<string>} operatingSystems - List of operating systems the headers for.
 *  “windows” “macos” “linux” “android” “ios”. We don't need more I guess.
 * @param {Array<string>} browserList - Browser definition based on the https://www.npmjs.com/package/browserslist.
 * @param {Array<string>} devices - List of devices to generate the headers for. One of "desktop", "mobile".
 * @param {Array<string>} locales - List of at most 10 languages to include in the `Accept-Language` request header.
 * @param {string} httpVersion - Http version to be used to generate headers. http 1 and http 2 sends different header sets.
 * @param {string} strategies - Strategies for generating headers - used for simplifying the configuration. For example: "modern-browsers".
 */

/**
 * Class generating random browser headers based on input.
 */
class HeaderGenerator {
    /**
     * @param {HeaderGeneratorOptions} options
     */
    constructor(options = {}) {
        this.defaultOptions = options;
        const uniqueBrowserStrings = JSON.parse(fs.readFileSync(browserHelperFilePath, { encoding: 'utf8' }));
        this.uniqueBrowsers = [];
        for (const browserString of uniqueBrowserStrings) {
            if (browserString === missingValueDatasetToken) {
                this.uniqueBrowsers.push({
                    name: missingValueDatasetToken,
                });
            } else {
                this.uniqueBrowsers.push(prepareBrowserObject(browserString));
            }
        }
        this.inputGeneratorNetwork = new BayesianNetwork(inputNetworkDefinitionPath);
        this.headerGeneratorNetwork = new BayesianNetwork(headerNetworkDefinitionPath);
    }

    /**
     * @param {HeaderGeneratorOptions} options - main options overrides.
     */
    getHeaders(options) {
        const headerOptions = { ...this.defaultOptions, ...options };
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

        const possibleAttributeValues = {};

        const browserOptions = [];
        for (const browser of headerOptions.browsers) {
            for (const browserOption of this.uniqueBrowsers) {
                if (browser.name === browserOption.name) {
                    if ((!browser.minVersion || browserVersionIsLesserOrEquals([browser.minVersion], browserOption.version))
                        && (!browser.maxVersion || browserVersionIsLesserOrEquals(browserOption.version, [browser.maxVersion]))) {
                        browserOptions.push(browserOption.completeString);
                    }
                }
            }
        }

        possibleAttributeValues[browserNodeName] = browserOptions;

        possibleAttributeValues[operatingSystemNodeName] = headerOptions.operatingSystems;

        if (headerOptions.devices) {
            possibleAttributeValues[deviceNodeName] = headerOptions.devices;
        }
        possibleAttributeValues[httpVersionNodeName] = headerOptions.httpVersion === '2' ? ['_2.0_'] : ['_1.0_', '_1.1_'];

        const inputSample = this.inputGeneratorNetwork.generateSampleWheneverPossible(possibleAttributeValues);

        if (!inputSample) {
            throw new Error('No headers based on this input can be generated. Please relax or change some of the requirements you specified.');
        }

        const generatedSample = this.headerGeneratorNetwork.generateSample(inputSample);

        let secFetchAttributeNames = http2SecFetchAttributes;
        let acceptLanguageFieldName = 'accept-language';
        if (headerOptions.httpVersion !== '2') {
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

        const generatedBrowser = prepareBrowserObject(generatedSample[browserNodeName]);
        if (generatedBrowser.name === 'chrome') {
            if (generatedBrowser.version[0] >= 76) {
                generatedSample[secFetchAttributeNames.site] = 'same-site';
                generatedSample[secFetchAttributeNames.mode] = 'navigate';
                generatedSample[secFetchAttributeNames.user] = '?1';
                if (generatedBrowser.version[0] >= 80) {
                    generatedSample[secFetchAttributeNames.dest] = 'document';
                }
            }
        }

        for (const attribute of Object.keys(generatedSample)) {
            if (attribute.startsWith('*') || generatedSample[attribute] === missingValueDatasetToken) delete generatedSample[attribute];
        }

        return generatedSample;
    }
}

module.exports = HeaderGenerator;
