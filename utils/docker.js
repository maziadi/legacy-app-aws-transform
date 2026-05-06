/**
 * Docker utility functions for CI/CD pipeline.
 */

/**
 * Returns the short SHA (first 7 characters) of a full Git commit SHA.
 *
 * @param {string} sha - A full 40-character hexadecimal Git commit SHA
 * @returns {string} The first 7 characters of the SHA
 */
function getShortSha(sha) {
  return sha.slice(0, 7);
}

module.exports = { getShortSha };
