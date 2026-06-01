// Empty mock: returns a no-op component
const React = require('react');
module.exports = () => React.createElement('View', null);
module.exports.default = module.exports;
module.exports.StatusBar = module.exports;
