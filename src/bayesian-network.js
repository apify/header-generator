const fs = require('fs');
const dfd = require("danfojs-node");

function _getRelativeFrequencies(dataframe, attributeName) {
    let frequencies = {};
    const totalCount = dataframe.shape[0];
    const valueCounts = dataframe[attributeName].value_counts();

    for(const index in valueCounts.index) {
        frequencies[valueCounts.index[index]] = valueCounts.values[index] / totalCount;
    }

    return frequencies;
}

class BayesianNetwork {

    constructor(networkDefinitionFilePath) {
        const networkDefinition = JSON.parse(fs.readFileSync(networkDefinitionFilePath, "utf8"));
        this.nodesInSamplingOrder = networkDefinition.nodes.map(nodeDefinition => new BayesianNode(nodeDefinition));
        this.nodesByName = {};
        for(const node of this.nodesInSamplingOrder) {
            this.nodesByName[node.name] = node;
        }
    }

    async setProbabilitiesAccordingToData(datasetPath) {
        let dataframe = await dfd.read_csv(datasetPath);

        this.nodesInSamplingOrder.forEach(function(node) {
            let possibleParentValues = {};
            for(const parentName of node.parentNames) {
                possibleParentValues[parentName] = this.nodesByName[parentName].possibleValues;
            }
            node.setProbabilitiesAccordingToData(dataframe, possibleParentValues);
        }.bind(this));
    }

    saveNetworkDefinition(networkDefinitionFilePath) {
        const network = {
            nodes: this.nodesInSamplingOrder.map(node => node.nodeDefinition)
        };

        fs.writeFileSync(networkDefinitionFilePath, JSON.stringify(network));
    }

    generateSample(inputValues={}) {
        let sample = inputValues;
        for(const node of this.nodesInSamplingOrder) {
            if(!(node.name in sample)) {
                sample[node.name] = node.sample(sample);
            }
        }

        return sample;
    }

}

class BayesianNode {

    constructor(nodeDefinition) {
        this.nodeDefinition = nodeDefinition;
    }

    sample(knownValues={}) {
        let probabilities = this.nodeDefinition.conditionalProbabilities;

        for(const parentName of this.parentNames) {
            const parentValue = knownValues[parentName];
            if(parentValue in probabilities["deeper"]) {
                probabilities = probabilities["deeper"][parentValue];
            } else {
                probabilities = probabilities["skip"];
            }
        }

        const possibleValues = Object.keys(probabilities);

        let chosenValue = possibleValues[0];
        const anchor = Math.random();
        let cumulativeProbability = 0;
        for(const possibleValue of possibleValues) {
            cumulativeProbability += probabilities[possibleValue];
            if (cumulativeProbability > anchor) {
                chosenValue = possibleValue;
                break;
            }
        }

        return chosenValue;
    }

    setProbabilitiesAccordingToData(dataframe, possibleParentValues={}) {
        this.nodeDefinition.possibleValues = dataframe[this.name].unique().values;
        this.nodeDefinition.conditionalProbabilities = this.recursivelyCalculateConditionalProbabilitiesAccordingToData(dataframe, possibleParentValues, 0);
    }

    recursivelyCalculateConditionalProbabilitiesAccordingToData(dataframe, possibleParentValues, depth) {
        let probabilities = {
            "deeper": {}
        };

        if(depth < this.parentNames.length) {
            const currentParentName = this.parentNames[depth];
            for(const possibleValue of possibleParentValues[currentParentName]) {
                const skip = !dataframe[currentParentName].unique().values.includes(possibleValue);
                let filteredDataframe = dataframe;
                if(!skip) {
                    filteredDataframe = dataframe.query({
                        "column": currentParentName,
                        "is": "==",
                        "to": possibleValue
                    })
                }
                let nextLevel = this.recursivelyCalculateConditionalProbabilitiesAccordingToData(filteredDataframe, possibleParentValues, depth + 1);

                if(!skip) {
                    probabilities["deeper"][possibleValue] = nextLevel;
                } else {
                    probabilities["skip"] = nextLevel;
                }
            }
        } else {
            probabilities = _getRelativeFrequencies(dataframe, this.name);
        }

        return probabilities;
    }

    toJson() {
        return JSON.stringify(this.nodeDefinition);
    }

    get name() {
        return this.nodeDefinition.name;
    }

    get possibleValues() {
        return this.nodeDefinition.values;
    }

    get parentNames() {
        return this.nodeDefinition.parentNames;
    }

}

module.exports = {
    BayesianNetwork
};