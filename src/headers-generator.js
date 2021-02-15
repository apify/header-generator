/**
 * @typedef Browser
 * @param {string} name - One of "chrome", "firefox", "safari", "edge" for now.
 * @param {number} minVersion - Minimal version of browser used.
 * @param {number} maxVersion - Maximal version of browser used.
 */
/**
 * @typedef HeadersGeneratorOptions
 * @param {Array<Browser>} browsers - List of Browsers to generate the headers for.
 * @param {Array<string>} browserList - Browser definition based on the https://www.npmjs.com/package/browserslist.
 * @param {Array<string>} devices - List of devices to generate the headers for. One of "desktop", "mobile".
 * @param {Array<string>} locales - List of languages to include in the `Accept-Language` request header.
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
            locales,
            devices,
            strategies,
        } = options;

        this.browsers = browsers;
        this.locales = locales;
        this.devices = devices;
        this.locales = locales;
        this.strategies = strategies;
    }

    /**
    * @param {HeadersGeneratorOptions} options - main options overrides.
    */
    getHeaders(options) {

    }
}

module.exports = HeadersGenerator;
