# Header generator
NodeJs package for generating browser-like headers.

<!-- toc -->

- [Installation](#installation)
- [Usage](#usage)
- [Examples](#examples)
- [API Reference](#api-reference)

<!-- tocstop -->

## Installation
Add this repository as an npm dependency and run the npm install command. No further setup is needed after that.
## Usage
To use the generator, you need to create an instance of the `HeaderGenerator` class which is exported from this package. Constructor of this class accepts a `HeaderGeneratorOptions` object, which can be used to globally specify what kind of headers you are looking for: 
```js
const HeaderGenerator = require('header-generator');
let headerGenerator = new HeaderGenerator({
        browsers: [
            {name: "firefox", minVersion: 80},
            {name: "chrome", minVersion: 87},
        ],
        devices: [
            "desktop"
        ],
        operatingSystems: [
            "windows"
        ]
});
```
You can then get the headers using the `getHeaders` method, either with no argument, or with another `HeaderGeneratorOptions` object, this time specifying the options only for this call (overwriting the global options when in conflict) and using the global options specified beforehands for the unspecified options:
```js
let headers = headersGenerator.getHeaders({
        operatingSystems: [
            "linux"
        ],
        locales: ["en-US", "en"]
});
```
This method always generates a random realistic set of headers, excluding the request dependant headers, which need to be filled in afterwards. Since the generation is randomized, multiple calls to this method with the same parameters can generate multiple different outputs.
## Examples
A result that can be generated for the usage example above:
```json
{
  'sec-ch-ua-mobile': '?0',
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Safari/537.36',
  'accept-encoding': 'gzip, deflate, br',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'sec-ch-ua': '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
  'upgrade-insecure-requests': '1',
  'accept-language': 'en-US,en;0.9',
  'sec-fetch-site': 'same-site',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-user': '?1',
  'sec-fetch-dest': 'document'
}
```
## API Reference
All public classes, methods and their parameters can be inspected in this API reference.

{{>all-docs~}}

