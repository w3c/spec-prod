// @ts-check
const { existsSync } = require('fs');
const { inspect } = require('util');

const { exit, setOutput, formatAsHeading, yesOrNo } = require('./utils.js');

const inputs = JSON.parse(process.env.INPUTS || '{}');
console.log(formatAsHeading('Provided input'));
console.log(inspect(inputs, false, Infinity, true));

/**
 * Figure out "type" and "source".
 */
if (inputs.type) {
  switch (inputs.type) {
    case 'respec':
      inputs.source = inputs.source || 'index.html';
      break;
    case 'bikeshed':
      inputs.source = inputs.source || 'index.bs';
      break;
    default:
      exit(`Invalid input "type": ${inputs.type}`);
  }
} else if (!inputs.source) {
  exit(`Either of "type" or "source" must be provided.`);
}

if (!existsSync(inputs.source)) {
  exit(`"source" file "${inputs.source}" not found.`);
}

if (!inputs.type) {
  switch (inputs.source) {
    case 'index.html':
      inputs.type = 'respec';
      break;
    case 'index.bs':
      inputs.type = 'bikeshed';
      break;
    default:
      exit(
        `Failed to figure out "type" from "source". Please specify the "type".`
      );
  }
}

/**
 * Figure out validation requests.
 */
inputs.validateLinks = yesOrNo(inputs.validateLinks) || false;
inputs.validateMarkup = yesOrNo(inputs.validateMarkup) || false;

/**
 * Make processed inputs available to next steps.
 */
console.log(`\n\n${formatAsHeading('Normalized input')}`);
console.log(inspect(inputs, false, Infinity, true));
for (const [key, val] of Object.entries(inputs)) {
  setOutput(key, val);
}
