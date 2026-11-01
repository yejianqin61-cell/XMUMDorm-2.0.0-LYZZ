'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const {
  pool
} = require('../database');
const academic = require('../services/academicIdentity');
const router = express.Router();
router.use(authenticate);
const handle = work => async (req, res) => {
  try {
    res.json({
      status: 0,
      data: await work(req)
    });
  } catch (e) {
    res.status(e.status || 503).json({
      status: -1,
      code: e.code || 'ACADEMIC_DIRECTORY_UNAVAILABLE',
      message: e.status ? e.message : '学院目录暂时不可用，请重试'
    });
  }
};
router.get('/colleges', handle(() => academic.colleges(pool)));
router.get('/colleges/:collegeId/programmes', handle(req => academic.programmes(pool, req.params.collegeId)));
module.exports = router;
