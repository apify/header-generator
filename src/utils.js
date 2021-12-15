const browsersList = require('browserslist');
const { SUPPORTED_BROWSERS } = require('./constants');

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

    return browser;
};

const getBrowsersWithVersions = (browserList) => {
    const browsersWithVersions = {};

    for (const browserDefinition of browserList) {
        const [browser, version] = browserDefinition.split(' ');
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
const getOptimizedVersionDistribution = (browsersWithVersions) => {
    const finalOptimizedBrowsers = [];

    Object.entries(browsersWithVersions).forEach(([browser, versions]) => {
        const sortedVersions = versions.sort((a, b) => a - b);
        let lowestVersionSoFar = sortedVersions[0];

        sortedVersions.forEach((version, index) => {
            const nextVersion = sortedVersions[index + 1];
            const isLast = index === sortedVersions.length - 1;
            const isNextVersionGap = nextVersion - version > 1;

            if (isNextVersionGap || isLast) {
                finalOptimizedBrowsers.push({
                    name: browser,
                    minVersion: lowestVersionSoFar,
                    maxVersion: version,
                });
                lowestVersionSoFar = nextVersion;
            }
        });
    });
    return finalOptimizedBrowsers;
};

const getBrowsersFromQuery = (browserListQuery) => {
    const browserList = browsersList(browserListQuery);
    const browsersWithVersions = getBrowsersWithVersions(browserList);
    return getOptimizedVersionDistribution(browsersWithVersions);
};

module.exports = {
    getUserAgent,
    getBrowser,
    getBrowsersFromQuery,
};
