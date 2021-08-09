const { inspect } = require('util');
const HeaderGenerator = require('../src/main');
const headersOrder = require('../src/data_files/headers-order.json');

function extractLocalesFromAcceptLanguageHeader(acceptLanguageHeader) {
    const extractedLocales = [];
    const localesWithWeight = acceptLanguageHeader.split(',');
    for (const localeWithWeight of localesWithWeight) {
        const locale = localeWithWeight.split(';')[0].trim();
        extractedLocales.push(locale);
    }

    return extractedLocales;
}

const getUserAgent = (headers) => {
    let userAgent;
    for (const [header, value] of Object.entries(headers)) {
        if (header.toLowerCase() === 'user-agent') {
            userAgent = value;
            break;
        }
    }

    return userAgent;
};

const getBrowser = (userAgent) => {
    let browser;
    if (userAgent.includes('Firefox')) {
        browser = 'firefox';
    } else if (userAgent.includes('Chrome')) {
        browser = 'chrome';
    } else {
        browser = 'safari';
    }

    return browser;
};

describe('Generation tests', () => {
    const headerGenerator = new HeaderGenerator({
        httpVersion: '2',
    });

    test('Generates unordered headers', () => {
        const result = headerGenerator.generateHeadersAndOrder();

        expect(result).toBeTruthy();
        expect(result.generatedSample).toBeTruthy();
        expect(Array.isArray(result.order)).toBe(true);
    });

    test('Generates headers', () => {
        const headers = headerGenerator.getHeaders();
        const userAgent = getUserAgent(headers);
        const browser = getBrowser(userAgent);

        expect(typeof headers).toBe('object');

        const order = headersOrder[browser];

        let index = -1;
        for (const header of Object.keys(headers)) {
            const newIndex = order.indexOf(header);

            const log = `${userAgent}\n${browser}\n${inspect(order)}\n${inspect(headers)}`;
            if (newIndex === -1) {
                throw new Error(`Missing entry in order array\n${log}`);
            } else if (newIndex < index) {
                throw new Error(`Header ${header} out of order\n${log}`);
            }

            index = newIndex;
        }
    });

    test('Accepts custom headers', () => {
        const headers = headerGenerator.getHeaders({
            httpVersion: '1',
        }, {
            'x-custom': 'foobar',
        });

        const keys = Object.keys(headers);
        expect(keys.indexOf('x-custom')).toBe(keys.length - 1);
    });

    test('Options from getHeaders override options from the constructor', () => {
        const headers = headerGenerator.getHeaders({
            httpVersion: '1',
        });
        expect('Accept-Language' in headers).toBeTruthy();
    });

    test('Generates headers with the requested locales', () => {
        const requestedLocales = ['en', 'es', 'en-GB'];
        const headers = headerGenerator.getHeaders({
            httpVersion: '2',
            locales: requestedLocales,
        });
        const extractedLocales = extractLocalesFromAcceptLanguageHeader(headers['accept-language']);
        expect(requestedLocales.sort()).toEqual(extractedLocales.sort());
    });

    test('Generates headers consistent with browsers input', () => {
        const headers = headerGenerator.getHeaders({
            httpVersion: '2',
            browsers: [{ name: 'firefox' }],
        });
        expect(/firefox/.test(headers['user-agent'].toLowerCase())).toBeTruthy();
    });

    test('Generates headers consistent with operating systems input', () => {
        const headers = headerGenerator.getHeaders({
            httpVersion: '2',
            operatingSystems: ['linux'],
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
            headerGenerator.getHeaders({
                browsers: [{
                    name: 'non-existing-browser',
                }],
            });
            fail("HeaderGenerator didn't throw an error when trying to generate headers for a nonexisting browser.");
        } catch (error) {
            expect(error)
                .toEqual(
                    new Error('No headers based on this input can be generated. Please relax or change some of the requirements you specified.'),
                );
        }
    });

    describe('Allow using strings instead of complex browser objects', () => {
        test('in constructor', () => {
            const generator = new HeaderGenerator({
                browsers: ['chrome'],
            });
            const headers = generator.getHeaders();
            expect(headers['user-agent'].includes('Chrome')).toBe(true);
        });

        test('in getHeaders', () => {
            const headers = headerGenerator.getHeaders({
                browsers: ['firefox'],
            });
            expect(headers['user-agent'].includes('Firefox')).toBe(true);
        });
    });
});
