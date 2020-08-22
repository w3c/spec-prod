// @ts-check

/**
 * @param {string} message
 * @param {number} [code]
 */
function exit(message, code = 1) {
  if (code === 0) {
    console.log(message);
  } else {
    console.error(message);
  }
  process.exit(code);
}

/**
 * @param {string} path
 */
function addPath(path) {
  console.log(`::add-path::${path}`);
}

/**
 * @param {string} key
 * @param {string} value
 */
function setEnv(key, value) {
  console.log(`::set-env name=${key}::${value}`);
}

/**
 * @param {string} key
 * @param {string} value
 */
function setOutput(key, value) {
  console.log(`::set-output name=${key}::${value}`);
}

/**
 * @param {string} text
 */
function formatAsHeading(text) {
  const marker = '='.repeat(Math.max(50, text.length));
  return `${marker}\n${text}:\n${marker}`;
}

module.exports = {
  exit,
  addPath,
  setEnv,
  setOutput,
  formatAsHeading,
};
