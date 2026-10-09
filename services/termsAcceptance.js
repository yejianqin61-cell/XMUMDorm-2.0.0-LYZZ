const { query } = require('../database');

const CURRENT_TERMS_VERSION = '2026-10-09';

async function getCurrentTermsStatus(userId) {
  const rows = await query(
    'SELECT accepted_at FROM user_terms_acceptances WHERE user_id = ? AND terms_version = ? LIMIT 1',
    [userId, CURRENT_TERMS_VERSION]
  );
  const acceptedAt = rows?.[0]?.accepted_at || null;
  return { version: CURRENT_TERMS_VERSION, accepted: Boolean(acceptedAt), accepted_at: acceptedAt };
}

async function requireCurrentTerms(req, res, next) {
  try {
    const terms = await getCurrentTermsStatus(req.user.id);
    if (!terms.accepted) {
      return res.status(403).json({
        status: -1,
        code: 'TERMS_NOT_ACCEPTED',
        message: '请先接受当前服务条款',
        data: { version: terms.version },
      });
    }
    return next();
  } catch (error) {
    console.error('条款门禁查询错误:', error);
    return res.status(500).json({ status: -1, code: 'TERMS_CHECK_FAILED', message: '服务器错误，请稍后重试' });
  }
}

module.exports = { CURRENT_TERMS_VERSION, getCurrentTermsStatus, requireCurrentTerms };
