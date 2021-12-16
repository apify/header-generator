const MODERN_DESKTOP = {
    browserListQuery: 'last 5 versions',
};

const MODERN_MOBILE = {
    ...MODERN_DESKTOP,
    devices: ['mobile'],
};

exports.MODERN_DESKTOP = MODERN_DESKTOP;
exports.MODERN_MOBILE = MODERN_MOBILE;

exports.MODERN_LINUX = {
    ...MODERN_DESKTOP,
    operatingSystems: ['linux'],
};

exports.MODERN_LINUX_FIREFOX = {
    browserListQuery: 'last 5 firefox versions',
    operatingSystems: ['linux'],
};

exports.MODERN_LINUX_CHROME = {
    browserListQuery: 'last 5 chrome versions',
    operatingSystems: ['linux'],
};

exports.MODERN_WINDOWS = {
    ...MODERN_DESKTOP,
    operatingSystems: ['windows'],
};

exports.MODERN_WINDOWS_FIREFOX = {
    browserListQuery: 'last 5 firefox versions',
    operatingSystems: ['windows'],
};

exports.MODERN_WINDOWS_CHROME = {
    browserListQuery: 'last 5 chrome versions',
    operatingSystems: ['windows'],
};

exports.MODERN_MACOS = {
    ...MODERN_DESKTOP,
    operatingSystems: ['macos'],
};

exports.MODERN_MACOS_FIREFOX = {
    browserListQuery: 'last 5 firefox versions',
    operatingSystems: ['macos'],
};

exports.MODERN_MACOS_CHROME = {
    browserListQuery: 'last 5 chrome versions',
    operatingSystems: ['macos'],
};

exports.MODERN_ANDROID = {
    ...MODERN_MOBILE,
    operatingSystems: ['android'],

};
