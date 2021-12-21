import { HeaderGeneratorOptions } from '../dist/header-generator';
import { HeaderGenerator, PRESETS } from '../dist/index';

describe('presets', () => {
    const generator = new HeaderGenerator();
    const presets = Object.entries(PRESETS);

    test.each(presets)('Should work with %s', (_name, config) => {
        const headers = generator.getHeaders(config as HeaderGeneratorOptions);
        expect(headers['user-agent']).toBeDefined();
    });
});
