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
To use the generator, you need to create an instance of the HeaderGenerator class which is exported from this package. Constructor of this class accepts a HeaderGeneratorOptions object, which can be used to globally specify what kind of headers you are looking for: 
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
You can then get the headers using the getHeaders method, either with no argument, or with another HeaderGeneratorOptions object, this time specifying the options only for this call (overwriting the global options when in conflict) and using the global options specified beforehands for the unspecified options:
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
    "one": 2,
    "three": {
        "point_1": "point_2",
        "point_3": 3.4
    },
    "list": [
        "one",
        "two",
        "three"
    ]
}
```
## API Reference
All public classes, methods and their parameters can be inspected in this API reference.

{{>all-docs~}}

