'use strict';
// Offline module-graph load only; not an assertion that a real server started.
require('../stage2-local/network.cjs')([]);
const Module = require('node:module');
const path = require('node:path');
const original = Module._load;
let listens = 0, timers = 0;
const databasePath = path.resolve(__dirname,'../../database.js');
Module._load = function(request, parent, main) {
  if (request === 'dotenv') return { config: () => ({parsed:{}}) };
  const resolved = Module._resolveFilename(request,parent,main);
  if (resolved === databasePath) return { query: async()=>{throw new Error('DATABASE_DISABLED');}, pool:{}, testConnection:async()=>false };
  return original.apply(this,arguments);
};
const express = require('express');
express.application.listen = () => { listens++;return {close(){}}; };
global.setInterval = global.setTimeout = () => { timers++; return {unref(){}}; };
process.env.NODE_ENV='production';process.env.ENABLE_BACKGROUND_JOBS='0';
require('../../server.js');
if (listens !== 1) throw new Error('SERVER_ENTRY_NOT_LOADED');
console.log(`PASS offline server/router module load; intercepted ${listens} listen and ${timers} timers; no dotenv/DB/server startup.`);
