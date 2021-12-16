const { HeaderGenerator, PRESETS } = require('../src/main');

describe('presets', () => {
    const generator = new HeaderGenerator();
    const presets = Object.entries(PRESETS);

    test.each(presets)('Should work with %s', (name, config) => {
        const headers = generator.getHeaders(config);
        expect(headers['user-agent']).toBeDefined();
    });
});
