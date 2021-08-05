const HeaderGenerator = require('../src/main');

function extractLocalesFromAcceptLanguageHeader(acceptLanguageHeader) {
    const extractedLocales = [];
    const localesWithWeight = acceptLanguageHeader.split(',');
    for (const localeWithWeight of localesWithWeight) {
        const locale = localeWithWeight.split(';')[0].trim();
        extractedLocales.push(locale);
    }

    return extractedLocales;
}

describe('Generation tests', () => {
    const headerGenerator = new HeaderGenerator({
        httpVersion: '2',
    });

    test('Generates unordered headers', () => {
        const result = headerGenerator.getUnorderedHeaders();

        expect(result).toBeTruthy();
        expect(result.generatedSample).toBeTruthy();
        expect(Array.isArray(result.order)).toBe(true);
    });

    test('Generates headers', () => {
        expect(headerGenerator.getHeaders()).toBeTruthy();
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
