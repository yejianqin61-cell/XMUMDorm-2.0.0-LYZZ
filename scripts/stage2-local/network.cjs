'use strict';

// Install before application/dependency imports. Does not open any connection.
// Only explicitly allowed TCP destinations may be used; named pipes are denied.
module.exports = function installNetworkBoundary(allowedPorts) {
  const net = require('node:net');
  const original = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (...args) {
    const normalized = Array.isArray(args[0]) ? args[0] : args;
    const first = normalized[0];
    const options = first && typeof first === 'object'
      ? first : { port: first, host: typeof normalized[1] === 'string' ? normalized[1] : 'localhost' };
    if (options.path || options.socket || options.fd !== undefined
        || !['127.0.0.1', 'localhost', '::1'].includes(options.host || 'localhost')
        || !allowedPorts.includes(Number(options.port))) {
      throw new Error('Stage 2 isolation blocked an outbound connection.');
    }
    return original.apply(this, args);
  };
  const dgram = require('node:dgram');
  dgram.createSocket = () => { throw new Error('Stage 2 isolation forbids UDP.'); };
};
