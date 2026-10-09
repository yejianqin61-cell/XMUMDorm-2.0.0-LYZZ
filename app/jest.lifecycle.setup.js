// QueryClient schedules gcTime timers for inactive queries. Clear the App singleton
// at the suite boundary so test assertions do not leave a 15-minute Node timer.
const { getQueryClient } = require('./src/shared/queryClient');

afterAll(() => getQueryClient().clear());
