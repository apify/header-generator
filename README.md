# Header generator
NodeJs package for generating browser-like headers.

<!-- toc -->

- [Installation](#installation)
- [Usage](#usage)
- [Examples](#examples)
- [API Reference](#api-reference)

<!-- tocstop -->

## Installation

## Usage

## Examples

## API Reference
All public classes, methods and their parameters can be inspected in this API reference.

<a name="HeaderGenerator"></a>

### HeaderGenerator
Class generating random browser headers based on input.


* [HeaderGenerator](#HeaderGenerator)
    * [`new HeaderGenerator(options)`](#new_HeaderGenerator_new)
    * [`.getHeaders(options)`](#HeaderGenerator+getHeaders)


* * *

<a name="new_HeaderGenerator_new"></a>

#### `new HeaderGenerator(options)`

| Param | Type |
| --- | --- |
| options | [<code>HeaderGeneratorOptions</code>](#HeaderGeneratorOptions) | 


* * *

<a name="HeaderGenerator+getHeaders"></a>

#### `headerGenerator.getHeaders(options)`

| Param | Type | Description |
| --- | --- | --- |
| options | [<code>HeaderGeneratorOptions</code>](#HeaderGeneratorOptions) | main options overrides. |


* * *

<a name="Browser"></a>

### `Browser`

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | One of "chrome", "firefox", "safari", "edge" for now. |
| minVersion | <code>number</code> | Minimal version of browser used. |
| maxVersion | <code>number</code> | Maximal version of browser used. |
| httpVersion | <code>string</code> | Either 1 or 2. If none specified the global `httpVersion` is used. |


* * *

<a name="HeaderGeneratorOptions"></a>

### `HeaderGeneratorOptions`

| Param | Type | Description |
| --- | --- | --- |
| browsers | [<code>Array.&lt;Browser&gt;</code>](#Browser) | List of Browsers to generate the headers for. |
| operatingSystems | <code>Array.&lt;string&gt;</code> | List of operating systems the headers for.  “windows” “macos” “linux” “android” “ios”. We don't need more I guess. |
| browserList | <code>Array.&lt;string&gt;</code> | Browser definition based on the https://www.npmjs.com/package/browserslist. |
| devices | <code>Array.&lt;string&gt;</code> | List of devices to generate the headers for. One of "desktop", "mobile". |
| locales | <code>Array.&lt;string&gt;</code> | List of at most 10 languages to include in the `Accept-Language` request header. |
| httpVersion | <code>string</code> | Http version to be used to generate headers. http 1 and http 2 sends different header sets. |
| strategies | <code>string</code> | Strategies for generating headers - used for simplifying the configuration. For example: "modern-browsers". |


* * *

