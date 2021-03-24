const HeaderGenerator = require('../src/main');
 
function extractLocalesFromAcceptLanguageHeader(acceptLanguageHeader) {
    let extractedLocales = [];
    const localesWithWeight = acceptLanguageHeader.split(',');
    for(const localeWithWeight of localesWithWeight) {
        const locale = localeWithWeight.split(';')[0].trim();
        extractedLocales.push(locale);
    }

    return extractedLocales;
}

function extractOperatingSystem(userAgentHeader) {
    userAgentHeader
}

describe('Generation tests', () => {
    const headerGenerator = new HeaderGenerator({
        httpVersion: "2"
    });

    test('Generates headers', () => {
        expect(headerGenerator.getHeaders()).toBeTruthy();
    });

    test('Options from getHeaders override options from the constructor', () => {
        const headers = headerGenerator.getHeaders({
            httpVersion: "1"
        });
        expect('Accept-Language' in headers).toBeTruthy();
    });

    test('Generates headers with the requested locales', () => {
        const requestedLocales = [ "en", "es", "en-GB" ];
        const headers = headerGenerator.getHeaders({
            httpVersion: "2",
            locales: requestedLocales,
        });
        const extractedLocales = extractLocalesFromAcceptLanguageHeader(headers['accept-language']);
        expect(requestedLocales.sort()).toEqual(extractedLocales.sort());
    });

    test('Generates headers consistent with browsers input', () => {
        const headers = headerGenerator.getHeaders({
            httpVersion: "2",
            browsers: [{ name: "safari" }]
        });
        expect(/safari/.test(headers['user-agent'].toLowerCase())).toBeTruthy();
    });

    test('Generates headers consistent with operating systems input', () => {
        const headers = headerGenerator.getHeaders({
            httpVersion: "2",
            operatingSystems: [ "linux" ]
        });
        expect(/linux/.test(headers['user-agent'].toLowerCase())).toBeTruthy();
    });

    test('Generates headers consistent with devices input', () => {
        const headers = headerGenerator.getHeaders({
            httpVersion: '2',
            devices: ['mobile'],
        });
        expect(/phone|android|mobile/.test(headers['user-agent'].toLowerCase())).toBeTruthy();
    });

    test('Throws an error when nothing can be generated', () => {
        try {        
            const headers = headerGenerator.getHeaders({
                browsers: [{
                    name: "non-existing-browser"
                }]
            });
            fail("HeaderGenerator didn't throw an error when trying to generate headers for a nonexisting browser.");
        } catch (error) {
            expect(error).toEqual(new Error('No headers based on this input can be generated. Please relax or change some of the requirements you specified.'));
        }
    });
});
