'use strict';
// Team-approved profile aliases belong here, never inferred from display names.
// No official directory/profile mapping has been approved yet.
const OFFICIAL_PROFILE_ALIASES = Object.freeze({});
const TEST_PROFILE_ALIASES = Object.freeze({ '[STAGE2 TEST] college-a': 'stage2-test-college-a', '[STAGE2 TEST] college-b': 'stage2-test-college-b' });
function resolveCollege(profileValue, colleges, isolated = process.env.STAGE2_LOCAL_ISOLATED === '1') {
  const aliases = isolated ? { ...OFFICIAL_PROFILE_ALIASES, ...TEST_PROFILE_ALIASES } : OFFICIAL_PROFILE_ALIASES;
  const id = typeof profileValue === 'string' && Object.hasOwn(aliases, profileValue) ? aliases[profileValue] : null;
  return colleges.some(c => c.id === id) ? id : null;
}
module.exports = { resolveCollege };
