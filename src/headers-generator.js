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
 * @param {Array<string>} locales - List of languages to include in the `Accept-Language` request header.
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
        const {
            browsers,
            operatingSystems,
            browserList,
            devices,
            locales,
            httpVersion,
            strategies,
        } = options;

        this.browsers = browsers;
        this.operatingSystems = operatingSystems;
        this.browserList = browserList;
        this.devices = devices;
        this.locales = locales;
        this.httpVersion = httpVersion;
        this.strategies = strategies;
    }

    /**
    * @param {HeadersGeneratorOptions} options - main options overrides.
    */
    getHeaders(options) {

    }
}

module.exports = HeadersGenerator;
