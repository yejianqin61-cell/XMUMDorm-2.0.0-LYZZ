'use strict';
const { pool } = require('../../database');
const authenticate = require('../../middleware/auth');
const { createRepository } = require('./repository');
const { createNewsService } = require('./service');
const { createAssetService, assetUrl } = require('./assets');
const { createAdminRouter, createPublicRouter } = require('../../routes/campusNews');
const repository = createRepository(pool, assetUrl);
const service = createNewsService(repository);
const assets = createAssetService(repository);
const favorites = require('../campusFavorites').createCampusFavorites(pool);
const delivery = require('../campusNewsNotifications').createDeliveryWorker(pool);
module.exports = {
  startDeliveryLoop() { if (process.env.STAGE2_LOCAL_ISOLATED === '1' || process.env.ENABLE_CAMPUS_NEWS_DELIVERY === '1') delivery.start(); },
  adminRouter: createAdminRouter({ authenticate, service, assets, afterWrite: delivery.wake }),
  publicRouter: createPublicRouter({ authenticate, service, assets, favorites }),
};
