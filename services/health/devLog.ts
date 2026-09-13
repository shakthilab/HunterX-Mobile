// Health sync now runs on every screen focus, app foreground, and hourly
// background tick (see MetricsDashboardView/app/_layout.tsx), so the very
// verbose diagnostic logging added while building that (72+ calls in
// HealthConnectAdapter alone) would otherwise run unconditionally in
// production builds too. Route it through here instead of bare
// console.log/warn so it's a no-op outside of __DEV__.
export const devLog: typeof console.log = __DEV__ ? console.log.bind(console) : () => {};
export const devWarn: typeof console.warn = __DEV__ ? console.warn.bind(console) : () => {};
