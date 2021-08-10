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

module.exports = {
    getUserAgent,
    getBrowser,
};
