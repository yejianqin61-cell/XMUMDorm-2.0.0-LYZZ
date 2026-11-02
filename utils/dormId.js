const { randomBytes } = require('crypto');

function createDormId() {
  return `DORM-${randomBytes(8).toString('hex').toUpperCase()}`;
}

module.exports = createDormId;
