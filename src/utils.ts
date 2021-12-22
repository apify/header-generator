import browsersList from 'browserslist';
import { SUPPORTED_BROWSERS } from './constants';
import { BrowserSpecification } from './header-generator';

export const getUserAgent = (headers: Record<string, string>): string | undefined => {
    for (const [header, value] of Object.entries(headers)) {
        if (header.toLowerCase() === 'user-agent') {
            return value;
        }
    }
    return undefined;
};

export const getBrowser = (userAgent?: string): BrowserSpecification['name'] | undefined => {
    if (!userAgent) {
        return;
    }

    let browser;
    if (userAgent.includes('Firefox')) {
        browser = 'firefox';
    } else if (userAgent.includes('Chrome')) {
        browser = 'chrome';
    } else {
        browser = 'safari';
    }

    return browser as BrowserSpecification['name'];
};

const getBrowsersWithVersions = (browserList: string[]): Record<BrowserSpecification['name'], number[]> => {
    const browsersWithVersions: Record<string, number[]> = {};

    for (const browserDefinition of browserList) {
        const [browserSplit, versionString] = browserDefinition.split(' ');
        const browser = browserSplit as BrowserSpecification['name'];
        const version = parseInt(versionString, 10);
        if (!SUPPORTED_BROWSERS.includes(browser)) {
            // eslint-disable-next-line no-continue
            continue;
        }

        if (browsersWithVersions[browser]) {
            browsersWithVersions[browser].push(version);
        } else {
            browsersWithVersions[browser] = [version];
        }
    }

    return browsersWithVersions;
};

const getOptimizedVersionDistribution = (browsersWithVersions: Record<BrowserSpecification['name'], number[]>): BrowserSpecification[] => {
    const finalOptimizedBrowsers: BrowserSpecification[] = [];

    Object.entries(browsersWithVersions).forEach(([browser, versions]) => {
        const sortedVersions = versions.sort((a, b) => a - b);
        let lowestVersionSoFar = sortedVersions[0];

        sortedVersions.forEach((version, index) => {
            const nextVersion = sortedVersions[index + 1];
            const isLast = index === sortedVersions.length - 1;
            const isNextVersionGap = nextVersion - version > 1;

            if (isNextVersionGap || isLast) {
                finalOptimizedBrowsers.push({
                    name: browser as BrowserSpecification['name'],
                    minVersion: lowestVersionSoFar,
                    maxVersion: version,
                });
                lowestVersionSoFar = nextVersion;
            }
        });
    });
    return finalOptimizedBrowsers;
};

export const getBrowsersFromQuery = (browserListQuery: string): BrowserSpecification[] => {
    const browserList = browsersList(browserListQuery);
    const browsersWithVersions = getBrowsersWithVersions(browserList);
    return getOptimizedVersionDistribution(browsersWithVersions);
};

export const shuffleArray = (array: any[]): any[] => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
};
