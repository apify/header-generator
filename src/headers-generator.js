const { BayesianNetwork } = require("./bayesian-network.js");
const dfd = require("danfojs-node");
const parse = require('csv-parse/lib/sync')
const  fs = require("fs");

const headerNetworkDefinitionPath = "./headerNetworkDefinition.json";
const inputNetworkDefinitionPath = "./inputNetworkDefinition.json";
const browserHelperFilePath = "./browserHelperFile.json";

const httpVersionNodeName = "*HTTP_VERSION";
const browserNodeName = "*BROWSER";
const operatingSystemNodeName = "*OPERATING_SYSTEM";
const deviceNodeName = "*DEVICE";
const missingValueDatasetToken = "*MISSING_VALUE*";

const http2SecFetchAttributes = {
    "mode": "sec-fetch-mode",
    "dest": "sec-fetch-dest",
    "site": "sec-fetch-site",
    "user": "sec-fetch-user"
}

const http1SecFetchAttributes = {
    "mode": "Sec-Fetch-Mode",
    "dest": "Sec-Fetch-Dest",
    "site": "Sec-Fetch-Site",
    "user": "Sec-Fetch-User"
}

function _getRandomInteger(minimum, maximum) {
    return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

function _browserVersionIsLesserOrEquals(browserVersionL, browserVersionR) {
    return browserVersionL[0] <= browserVersionR[0];
}

function _prepareBrowserObject(browserString) {
    const nameVersionSplit = browserString.split("/");
    const versionSplit = nameVersionSplit[1].split(".");
    let preparedVersion = [];
    for(let versionPart of versionSplit) {
        preparedVersion.push(parseInt(versionPart));
    }

    return {
        "name": nameVersionSplit[0],
        "version": preparedVersion,
        "completeString": browserString
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
 * @typedef HeadersGeneratorOptions
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
class HeadersGenerator {
    /**
     * @param {HeadersGeneratorOptions} options
     */
    constructor(options = {}) {
        this.defaultOptions = options;
        let uniqueBrowserStrings = JSON.parse(fs.readFileSync(browserHelperFilePath, {encoding:'utf8'}));
        this.uniqueBrowsers = [];
        for(const browserString of uniqueBrowserStrings) {
            if(browserString == missingValueDatasetToken) {
                this.uniqueBrowsers.push({
                    "name": missingValueDatasetToken
                });
            } else {
                this.uniqueBrowsers.push(_prepareBrowserObject(browserString));
            }
        }
        this.inputGeneratorNetwork = new BayesianNetwork(inputNetworkDefinitionPath);
        this.headerGeneratorNetwork = new BayesianNetwork(headerNetworkDefinitionPath);
    }

    /**
     * @param {HeadersGeneratorOptions} options - main options overrides.
     */
    getHeaders(options) {
        let headerOptions = {...this.defaultOptions, ...options};
        if(!headerOptions.locales) {
            headerOptions.locales = ["en-US"];
        }
        if(!headerOptions.httpVersion) {
            headerOptions.httpVersion = "2";
        }
        if(!headerOptions.browsers) {
            headerOptions.browsers = [
                { name: "chrome" },
                { name: "firefox" },
                { name: "safari" }
            ];
        }
        if(!headerOptions.operatingSystems) {
            headerOptions.operatingSystems = [
                "windows",
                "macos",
                "linux",
                "android",
                "ios"
            ];
        }

        let possibleAttributeValues = {};

        let browserOptions = [];
        for(const browser of headerOptions.browsers) {
            for(const browserOption of this.uniqueBrowsers) {
                if(browser.name == browserOption.name) {
                    if((!browser.minVersion || _browserVersionIsLesserOrEquals([ browser.minVersion ], browserOption.version)) &&
                        (!browser.maxVersion || _browserVersionIsLesserOrEquals(browserOption.version, [ browser.maxVersion ]))) {
                        browserOptions.push(browserOption.completeString);
                    }
                }
            }
        }

        possibleAttributeValues[browserNodeName] = browserOptions;

        possibleAttributeValues[operatingSystemNodeName] = headerOptions.operatingSystems;

        if(headerOptions.devices) {
            possibleAttributeValues[deviceNodeName] = headerOptions.devices;
        }
        possibleAttributeValues[httpVersionNodeName] = headerOptions.httpVersion == "2" ? [ "_2.0_" ] : [ "_1.0_", "_1.1_" ];

        let inputSample = this.inputGeneratorNetwork.generateSampleWheneverPossible(possibleAttributeValues);

        if(!inputSample) throw "No headers based on this input can be generated. Please relax or change some of the requirements you specified.";

        let generatedSample = this.headerGeneratorNetwork.generateSample(inputSample);

        let secFetchAttributeNames = http2SecFetchAttributes;
        let acceptLanguageFieldName = "accept-language";
        if(headerOptions.httpVersion !== "2") {
            acceptLanguageFieldName = "Accept-Language";
            secFetchAttributeNames = http1SecFetchAttributes;
        }

        for(let x = 0; x < 10; x++) {
            let position1 = _getRandomInteger(0, headerOptions.locales.length-1);
            let position2 = _getRandomInteger(0, headerOptions.locales.length-1);
            let holder = headerOptions.locales[position1];
            headerOptions.locales[position1] = headerOptions.locales[position2];
            headerOptions.locales[position2] = holder;
        }

        let acceptLanguageFieldValue = headerOptions.locales[0];
        for(let x = 1; x < headerOptions.locales.length; x++) {
            acceptLanguageFieldValue += "," + headerOptions.locales[x] + ";" + (1 - x * 0.1);
        }

        generatedSample[acceptLanguageFieldName] = acceptLanguageFieldValue;

        let generatedBrowser = _prepareBrowserObject(generatedSample[browserNodeName]);
        if(generatedBrowser.name == "chrome") {
            if(generatedBrowser.version[0] >= 76) {
                generatedSample[secFetchAttributeNames["site"]] = "same-site";
                generatedSample[secFetchAttributeNames["mode"]] = "navigate";
                generatedSample[secFetchAttributeNames["user"]] = "?1";
                if(generatedBrowser.version[0] >= 80) {
                    generatedSample[secFetchAttributeNames["dest"]] = "document";
                }
            }
        }

        for(const attribute in generatedSample) {
            if(attribute.startsWith("*") || generatedSample[attribute] == missingValueDatasetToken) delete generatedSample[attribute];
        }

        return generatedSample;
    }

    static async prepareFilesForHeaderGenerationFromDataset(datasetPath, definitionFile) {
        /*
            Danfo-js can't read CSVs where field values contain a newline right now, the replace was added to deal with
            issue described in https://github.com/adaltas/node-csv-parse/issues/139
        */
        const datasetText = fs.readFileSync(datasetPath, {encoding:'utf8'}).replace(/^\ufeff/, '');
        const records = parse(datasetText, {
            columns: true,
            skip_empty_lines: true
        });

        for(let x = 0; x < records.length; x++) {
            records[x]["requestFingerprint/httpVersion"] = "_" + records[x]["requestFingerprint/httpVersion"] + "_";
            for(const attribute in records[x]) {
                if(records[x][attribute] == "") {
                    records[x][attribute] = missingValueDatasetToken;
                }
            }
        }

        let inputGeneratorNetwork = new BayesianNetwork(inputNetworkDefinitionPath);
        let headerGeneratorNetwork = new BayesianNetwork(headerNetworkDefinitionPath);
        let desiredHeaderAttributes = headerGeneratorNetwork.nonInputNodeNames;
        let headers = new dfd.DataFrame(records);

        let mapper = { "requestFingerprint/httpVersion": httpVersionNodeName };
        for(const attribute of desiredHeaderAttributes) {
            mapper["requestFingerprint/headers/" + attribute] = attribute;
        }
        desiredHeaderAttributes.push(httpVersionNodeName);
        headers.rename({ mapper: mapper , inplace: true });

        let selectedHeaders = headers.loc({ columns: desiredHeaderAttributes });
        selectedHeaders.fillna({ values: [ missingValueDatasetToken ], inplace: true })
        let browsers = [];
        let operatingSystems = [];
        let devices = [];
        let userAgents = selectedHeaders.loc({ columns: ["user-agent", "User-Agent"] });
        for(const row of userAgents.values) {
            let userAgent = row[0];
            if(userAgent == missingValueDatasetToken) {
                userAgent = row[1];
            }
            userAgent = userAgent.toLowerCase();

            let operatingSystem = missingValueDatasetToken;
            if(/windows/.test(userAgent)) {
                operatingSystem = "windows";
            }
            let device = "desktop";
            if(/phone|android|mobile/.test(userAgent)) {
                device = "mobile";
                if(/iphone|mac/.test(userAgent)) {
                    operatingSystem = "ios";
                } else if(/android/.test(userAgent)) {
                    operatingSystem = "android";
                }
            } else {
                if(/linux/.test(userAgent)) {
                    operatingSystem = "linux";
                } else if(/mac/.test(userAgent)) {
                    operatingSystem = "macos";
                }
            }

            let browser = missingValueDatasetToken;
            let matches = userAgent.match(/(firefox|chrome|safari)\/([0-9.]*)/gi);
            if(matches && !(/OPR\/[0-9.]*/.test(userAgent))) {
                browser = matches[0];
            }

            browsers.push(browser);
            operatingSystems.push(operatingSystem);
            devices.push(device);
        }


        selectedHeaders.addColumn({ "column": browserNodeName, "value": browsers });
        selectedHeaders.addColumn({ "column": operatingSystemNodeName, "value": operatingSystems });
        selectedHeaders.addColumn({ "column": deviceNodeName, "value": devices });

        await headerGeneratorNetwork.setProbabilitiesAccordingToData(selectedHeaders);
        await inputGeneratorNetwork.setProbabilitiesAccordingToData(selectedHeaders);

        headerGeneratorNetwork.saveNetworkDefinition(headerNetworkDefinitionPath);
        inputGeneratorNetwork.saveNetworkDefinition(inputNetworkDefinitionPath);

        const uniqueBrowsers = await selectedHeaders[browserNodeName].unique().values;
        fs.writeFileSync(browserHelperFilePath, JSON.stringify(uniqueBrowsers));
    }

}

module.exports = HeadersGenerator;