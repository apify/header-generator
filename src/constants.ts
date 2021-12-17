export const SUPPORTED_BROWSERS = [
    'chrome',
    'firefox',
    'safari',
] as const;
export const SUPPORTED_OPERATING_SYSTEMS = ['windows', 'macos', 'linux', 'android', 'ios'] as const;
export const SUPPORTED_DEVICES = ['desktop', 'mobile'] as const;
export const SUPPORTED_HTTP_VERSIONS = ['1', '2'] as const;

export const BROWSER_HTTP_NODE_NAME = '*BROWSER_HTTP';
export const OPERATING_SYSTEM_NODE_NAME = '*OPERATING_SYSTEM';
export const DEVICE_NODE_NAME = '*DEVICE';
export const MISSING_VALUE_DATASET_TOKEN = '*MISSING_VALUE*';
