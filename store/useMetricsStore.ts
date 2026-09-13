import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthService, getAdapterForProvider } from '@/services/health/healthService';
import { healthMetricsService, BackendDailyMetricItem } from '@/services/api/healthMetrics.service';
import { devLog, devWarn } from '@/services/health/devLog';

const HEALTH_STORAGE_KEY = '@hunterx_health_sync_state';
const LAST_SYNC_TIME_KEY = '@hunterx_last_health_sync_time';

export type TimeRange = 'Today' | 'Week' | 'Month' | 'Year';

export interface MetricDetail {
  value: string;
  unit: string;
  trend: string;
  trendDirection: 'up' | 'down' | 'neutral';
  target?: string;
  progress?: number;
}

export interface DayBarData {
  day: string;
  label: string;
  value: number; // 0 to 100 percentage
  steps?: number;
  isCurrent?: boolean;
}

export interface MetricsDataset {
  steps: {
    current: number;
    target: number;
    percentage: number;
  };
  calories: MetricDetail;
  distance: MetricDetail;
  activeMinutes: MetricDetail;
  heartRate: MetricDetail;
  sleep: MetricDetail;
  workouts: MetricDetail;
  weeklyActivity: {
    avgSteps: string;
    days: DayBarData[];
  };
}

export interface MetricsState {
  timeRange: TimeRange;
  availableRanges: TimeRange[];
  isHealthConnected: boolean;
  connectedProvider: 'apple_health' | 'health_connect' | null;
  lastSyncedText: string;
  isSyncing: boolean;
  isLoadingRangeData: boolean;
  isLoaded: boolean;

  // Datasets per time range
  datasets: Record<TimeRange, MetricsDataset>;

  setTimeRange: (range: TimeRange) => void;
  connectProvider: (provider: 'apple_health' | 'health_connect') => Promise<void>;
  disconnectProvider: () => void;
  verifyProviderAccess: () => Promise<boolean>;
  syncNow: () => Promise<void>;
  fetchTodayLiveMetrics: () => Promise<void>;
  syncHealthMetricsIfNeeded: () => Promise<void>;
  fetchRangeData: (range: TimeRange) => Promise<void>;
  initFromStorage: () => Promise<void>;
}

function formatSleepMinutes(mins: number): string {
  if (!mins || mins <= 0) return '0h 0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatNumberWithCommas(num: number): string {
  return (num || 0).toLocaleString('en-US');
}

// The provider a stored connection is actually usable with on this install.
// iOS can only ever drive Apple Health; Android can only ever drive Health
// Connect — there's no cross-platform provider.
function getPlatformProvider(): 'apple_health' | 'health_connect' | null {
  if (Platform.OS === 'ios') return 'apple_health';
  if (Platform.OS === 'android') return 'health_connect';
  return null;
}

interface StoredConnectionState {
  isHealthConnected: boolean;
  connectedProvider: 'apple_health' | 'health_connect' | null;
  lastSyncedText: string;
}

const DISCONNECTED_STATE: StoredConnectionState = {
  isHealthConnected: false,
  connectedProvider: null,
  lastSyncedText: 'Not connected',
};

// Reconciles the persisted connection flag against the platform we're actually
// running on. A provider connected on the other OS (e.g. Apple Health state
// left over from an iOS install of this same app, now reinstalled/running on
// Android, or vice versa) can never be queried here — AppleHealthAdapter and
// HealthConnectAdapter both hard no-op outside their own platform — so instead
// of silently returning zeros forever, we treat it as disconnected and signal
// that the stale record should be wiped, which re-surfaces the connect banner
// so the user is prompted to link the provider that actually matches this device.
function resolveStoredConnectionState(json: string | null): {
  state: StoredConnectionState;
  shouldClearStorage: boolean;
} {
  if (!json) {
    return { state: DISCONNECTED_STATE, shouldClearStorage: false };
  }
  try {
    const parsed = JSON.parse(json);
    const storedProvider: 'apple_health' | 'health_connect' | null = parsed.connectedProvider || null;
    const wasConnected = !!parsed.isHealthConnected;

    if (!wasConnected || !storedProvider) {
      return { state: DISCONNECTED_STATE, shouldClearStorage: false };
    }

    if (storedProvider !== getPlatformProvider()) {
      return { state: DISCONNECTED_STATE, shouldClearStorage: true };
    }

    return {
      state: {
        isHealthConnected: true,
        connectedProvider: storedProvider,
        lastSyncedText: parsed.lastSyncedText || 'Not connected',
      },
      shouldClearStorage: false,
    };
  } catch (_) {
    return { state: DISCONNECTED_STATE, shouldClearStorage: false };
  }
}

const DEFAULT_DATASETS: Record<TimeRange, MetricsDataset> = {
  Today: {
    steps: { current: 0, target: 10000, percentage: 0 },
    calories: { value: '0', unit: 'kcal', trend: 'Live today', trendDirection: 'neutral' },
    distance: { value: '0.0', unit: 'km', trend: 'Live today', trendDirection: 'neutral' },
    activeMinutes: { value: '0', unit: 'min', trend: 'Live today', trendDirection: 'neutral' },
    heartRate: { value: '0', unit: 'bpm', trend: 'Live today', trendDirection: 'neutral' },
    sleep: { value: '0h 0m', unit: '', trend: 'Last night', trendDirection: 'neutral' },
    workouts: { value: '0', unit: 'session', trend: 'Live today', trendDirection: 'neutral' },
    weeklyActivity: {
      avgSteps: '0',
      days: [
        { day: 'Mon', label: 'Mon', value: 0 },
        { day: 'Tue', label: 'Tue', value: 0 },
        { day: 'Wed', label: 'Wed', value: 0 },
        { day: 'Thu', label: 'Thu', value: 0 },
        { day: 'Fri', label: 'Fri', value: 0 },
        { day: 'Sat', label: 'Sat', value: 0 },
        { day: 'Sun', label: 'Sun', value: 0 },
      ],
    },
  },
  Week: {
    steps: { current: 0, target: 70000, percentage: 0 },
    calories: { value: '0', unit: 'kcal', trend: 'This week', trendDirection: 'neutral' },
    distance: { value: '0.0', unit: 'km', trend: 'This week', trendDirection: 'neutral' },
    activeMinutes: { value: '0', unit: 'min', trend: 'This week', trendDirection: 'neutral' },
    heartRate: { value: '0', unit: 'bpm avg', trend: 'This week', trendDirection: 'neutral' },
    sleep: { value: '0h 0m', unit: 'avg', trend: 'This week', trendDirection: 'neutral' },
    workouts: { value: '0', unit: 'sessions', trend: 'This week', trendDirection: 'neutral' },
    weeklyActivity: {
      avgSteps: '0',
      days: [
        { day: 'Mon', label: 'Mon', value: 0 },
        { day: 'Tue', label: 'Tue', value: 0 },
        { day: 'Wed', label: 'Wed', value: 0 },
        { day: 'Thu', label: 'Thu', value: 0 },
        { day: 'Fri', label: 'Fri', value: 0 },
        { day: 'Sat', label: 'Sat', value: 0 },
        { day: 'Sun', label: 'Sun', value: 0 },
      ],
    },
  },
  Month: {
    steps: { current: 0, target: 300000, percentage: 0 },
    calories: { value: '0', unit: 'kcal', trend: 'This month', trendDirection: 'neutral' },
    distance: { value: '0.0', unit: 'km', trend: 'This month', trendDirection: 'neutral' },
    activeMinutes: { value: '0', unit: 'min', trend: 'This month', trendDirection: 'neutral' },
    heartRate: { value: '0', unit: 'bpm avg', trend: 'This month', trendDirection: 'neutral' },
    sleep: { value: '0h 0m', unit: 'avg', trend: 'This month', trendDirection: 'neutral' },
    workouts: { value: '0', unit: 'sessions', trend: 'This month', trendDirection: 'neutral' },
    weeklyActivity: {
      avgSteps: '0',
      days: [],
    },
  },
  Year: {
    steps: { current: 0, target: 3650000, percentage: 0 },
    calories: { value: '0', unit: 'kcal', trend: 'This year', trendDirection: 'neutral' },
    distance: { value: '0.0', unit: 'km', trend: 'This year', trendDirection: 'neutral' },
    activeMinutes: { value: '0', unit: 'min', trend: 'This year', trendDirection: 'neutral' },
    heartRate: { value: '0', unit: 'bpm avg', trend: 'This year', trendDirection: 'neutral' },
    sleep: { value: '0h 0m', unit: 'avg', trend: 'This year', trendDirection: 'neutral' },
    workouts: { value: '0', unit: 'sessions', trend: 'This year', trendDirection: 'neutral' },
    weeklyActivity: {
      avgSteps: '0',
      days: [],
    },
  },
};

export const useMetricsStore = create<MetricsState>((set, get) => {
  // Immediately read persisted connection state on store initialization
  AsyncStorage.getItem(HEALTH_STORAGE_KEY)
    .then((json) => {
      const { state, shouldClearStorage } = resolveStoredConnectionState(json);
      set({ ...state, isLoaded: true });
      if (shouldClearStorage) {
        // Stored connection belongs to the other platform's provider — drop it
        // (and any sync throttle timestamp) so a fresh connect isn't held back.
        AsyncStorage.multiRemove([HEALTH_STORAGE_KEY, LAST_SYNC_TIME_KEY]).catch(() => {});
      }
    })
    .catch(() => {
      set({ isLoaded: true });
    });

  // Persists a fresh "Last synced" text alongside the current connection
  // state. Without this, lastSyncedText only ever lived in memory — the next
  // app launch's initFromStorage() would overwrite it with whatever was last
  // written at connect time, showing a stale sync time forever.
  const persistLastSyncedText = async (lastSyncedText: string) => {
    await AsyncStorage.setItem(
      HEALTH_STORAGE_KEY,
      JSON.stringify({
        isHealthConnected: get().isHealthConnected,
        connectedProvider: get().connectedProvider,
        lastSyncedText,
      })
    ).catch(() => {});
  };

  return {
    timeRange: 'Today',
    availableRanges: ['Today'],
    isHealthConnected: false,
    connectedProvider: null,
    lastSyncedText: 'Not connected',
    isSyncing: false,
    isLoadingRangeData: false,
    isLoaded: false,
    datasets: DEFAULT_DATASETS,

    setTimeRange: (range: TimeRange) => {
      set({ timeRange: range });
      if (range === 'Today') {
        get().fetchTodayLiveMetrics();
      } else {
        get().fetchRangeData(range);
      }
    },

    initFromStorage: async () => {
      try {
        const json = await AsyncStorage.getItem(HEALTH_STORAGE_KEY);
        const { state, shouldClearStorage } = resolveStoredConnectionState(json);
        devLog('====================================================');
        devLog('💾 [useMetricsStore] Resolved stored connection state:');
        devLog('   isHealthConnected:', state.isHealthConnected);
        devLog('   connectedProvider:', state.connectedProvider);
        devLog('   lastSyncedText:', state.lastSyncedText);
        devLog('   shouldClearStorage:', shouldClearStorage);
        devLog('====================================================');
        set({ ...state, isLoaded: true });
        if (shouldClearStorage) {
          await AsyncStorage.multiRemove([HEALTH_STORAGE_KEY, LAST_SYNC_TIME_KEY]).catch(() => {});
        }
      } catch (_) {
        set({ isLoaded: true });
      }
    },

    connectProvider: async (provider: 'apple_health' | 'health_connect') => {
      devLog('[useMetricsStore] connectProvider called for:', provider);

      if (provider === 'apple_health' && Platform.OS !== 'ios') {
        throw new Error('Apple Health (HealthKit) is only available on iOS devices.');
      }

      if (provider === 'health_connect' && Platform.OS !== 'android') {
        throw new Error('Google Fit / Health Connect is only available on Android devices.');
      }

      set({ isSyncing: true });
      try {
        const adapter = getAdapterForProvider(provider);
        devLog('[useMetricsStore] Got adapter for provider:', adapter?.constructor?.name);
        const isAvail = await adapter.isAvailable();
        devLog('[useMetricsStore] adapter.isAvailable() returned:', isAvail);
        if (!isAvail) {
          set({ isSyncing: false });
          if (provider === 'apple_health') {
            throw new Error('Apple Health (HealthKit) is not available on this iOS device.');
          } else {
            throw new Error('Google Fit / Health Connect is not available on this device (Ensure Health Connect app is installed).');
          }
        }

        devLog('[useMetricsStore] Requesting permissions via adapter...');
        const granted = await adapter.requestPermissions();
        devLog('[useMetricsStore] adapter.requestPermissions() returned:', granted);
        if (!granted) {
          set({ isSyncing: false });
          throw new Error('Permission denied or canceled by user.');
        }

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newState = {
          isHealthConnected: true,
          connectedProvider: provider,
          lastSyncedText: `Today, ${timeString}`,
          isSyncing: false,
        };

        set(newState);
        await AsyncStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(newState));
        // Clear any prior sync throttle timestamp so this (re)connect — including
        // one that follows a provider/platform switch — always syncs immediately
        // instead of silently waiting out the old hourly window.
        await AsyncStorage.removeItem(LAST_SYNC_TIME_KEY).catch(() => {});

        // Fetch live metrics immediately upon connection & trigger sync
        await get().fetchTodayLiveMetrics();
        await get().syncHealthMetricsIfNeeded();
      } catch (e) {
        set({ isSyncing: false });
        throw e;
      }
    },

    disconnectProvider: () => {
      const newState = {
        isHealthConnected: false,
        connectedProvider: null,
        lastSyncedText: 'Not connected',
      };
      set(newState);
      AsyncStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(newState)).catch(() => {});
      // Also drop the sync throttle timestamp so a later reconnect (same
      // provider, or the platform-appropriate one) isn't held back by it.
      AsyncStorage.removeItem(LAST_SYNC_TIME_KEY).catch(() => {});
    },

    // Health Connect (Android) exposes real, current permission-grant status,
    // so we can detect an actual revocation and bounce back to the connect
    // banner instead of silently showing stale/zero data forever. HealthKit
    // (iOS) does not expose this for read permissions by design — Apple's
    // API intentionally can't distinguish "denied" from "no data" — so on iOS
    // this is a deliberate no-op and the existing empty-state handling stands.
    verifyProviderAccess: async () => {
      const { isHealthConnected, connectedProvider } = get();
      if (!isHealthConnected || connectedProvider !== 'health_connect') {
        return true;
      }
      const adapter = getAdapterForProvider(connectedProvider);
      const stillGranted = await adapter.checkPermissions();
      if (!stillGranted) {
        get().disconnectProvider();
        return false;
      }
      return true;
    },

    syncNow: async () => {
      if (!get().isHealthConnected) return;
      if (!(await get().verifyProviderAccess())) return;

      set({ isSyncing: true });
      try {
        const adapter = get().connectedProvider ? getAdapterForProvider(get().connectedProvider!) : healthService;
        const [yesterdaySummary, todaySummary] = await Promise.all([
          adapter.getYesterdaySummary(),
          adapter.getTodaySummary(),
        ]);

        await healthMetricsService.syncDailyMetrics(yesterdaySummary);
        await healthMetricsService.syncDailyMetrics(todaySummary);

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const lastSyncedText = `Today, ${timeString}`;

        set({ lastSyncedText, isSyncing: false });
        await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, `${Date.now()}`);
        await persistLastSyncedText(lastSyncedText);
        await get().fetchTodayLiveMetrics();
      } catch (e) {
        set({ isSyncing: false });
      }
    },

    fetchTodayLiveMetrics: async () => {
      if (!get().isHealthConnected) return;
      if (!(await get().verifyProviderAccess())) return;

      try {
        const adapter = get().connectedProvider ? getAdapterForProvider(get().connectedProvider!) : healthService;
        const [todaySummary, weekBars] = await Promise.all([
          adapter.getTodaySummary(),
          adapter.getWeekBarSamples(),
        ]);

        const stepsCurrent = todaySummary.steps || 0;
        const stepsTarget = 10000;
        const stepsPct = Math.min(Math.round((stepsCurrent / stepsTarget) * 100), 100);

        const totalWeekSteps = weekBars.reduce((acc, curr) => acc + (curr.steps || 0), 0);
        const avgWeekSteps = Math.round(totalWeekSteps / (weekBars.length || 7));

        set((state) => ({
          datasets: {
            ...state.datasets,
            Today: {
              steps: {
                current: stepsCurrent,
                target: stepsTarget,
                percentage: stepsPct,
              },
              calories: {
                value: formatNumberWithCommas(todaySummary.calories),
                unit: 'kcal',
                trend: 'Live today',
                trendDirection: 'neutral',
              },
              distance: {
                value: (todaySummary.distanceKm || 0).toFixed(1),
                unit: 'km',
                trend: 'Live today',
                trendDirection: 'neutral',
              },
              activeMinutes: {
                value: `${todaySummary.activeMinutes || 0}`,
                unit: 'min',
                trend: 'Live today',
                trendDirection: 'neutral',
              },
              heartRate: {
                value: `${todaySummary.heartRate || 0}`,
                unit: 'bpm',
                trend: 'Live today',
                trendDirection: 'neutral',
              },
              sleep: {
                value: formatSleepMinutes(todaySummary.sleepMinutes),
                unit: '',
                trend: 'Last night',
                trendDirection: 'neutral',
              },
              workouts: {
                value: `${todaySummary.workoutCount || 0}`,
                unit: todaySummary.workoutCount === 1 ? 'session' : 'sessions',
                trend: 'Live today',
                trendDirection: 'neutral',
              },
              weeklyActivity: {
                avgSteps: formatNumberWithCommas(avgWeekSteps),
                days: weekBars,
              },
            },
          },
        }));
      } catch (e) {
        devWarn('[useMetricsStore] fetchTodayLiveMetrics failed:', e);
      }
    },

    syncHealthMetricsIfNeeded: async () => {
      if (!get().isHealthConnected) return;
      if (!(await get().verifyProviderAccess())) return;

      try {
        const lastSyncTimeStr = await AsyncStorage.getItem(LAST_SYNC_TIME_KEY);
        const nowMs = Date.now();
        const ONE_HOUR_MS = 60 * 60 * 1000;

        if (lastSyncTimeStr) {
          const lastSyncMs = parseInt(lastSyncTimeStr, 10);
          if (nowMs - lastSyncMs < ONE_HOUR_MS) {
            return;
          }
        }

        const adapter = get().connectedProvider ? getAdapterForProvider(get().connectedProvider!) : healthService;
        const [yesterdaySummary, todaySummary] = await Promise.all([
          adapter.getYesterdaySummary(),
          adapter.getTodaySummary(),
        ]);

        set({ isSyncing: true });

        if (yesterdaySummary.steps > 0 || yesterdaySummary.calories > 0) {
          await healthMetricsService.syncDailyMetrics(yesterdaySummary);
        }
        await healthMetricsService.syncDailyMetrics(todaySummary);

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const lastSyncedText = `Today, ${timeString}`;

        set({ lastSyncedText, isSyncing: false });
        await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, `${nowMs}`);
        await persistLastSyncedText(lastSyncedText);
      } catch (e) {
        devWarn('[useMetricsStore] syncHealthMetricsIfNeeded failed silently:', e);
        set({ isSyncing: false });
      }
    },

    fetchRangeData: async (range: TimeRange) => {
      if (range === 'Today') {
        return get().fetchTodayLiveMetrics();
      }

      set({ isLoadingRangeData: true });
      const apiRange = range.toLowerCase() as 'week' | 'month' | 'year';

      try {
        const result = await healthMetricsService.getHealthMetrics(apiRange);

        if (!result) {
          set({ isLoadingRangeData: false });
          return;
        }

        const totals = result.totals || {
          steps: 0,
          calories: 0,
          distanceKm: 0,
          activeMinutes: 0,
          avgHeartRate: 0,
          sleepMinutes: 0,
          workoutCount: 0,
        };

        let stepsTarget = 70000;
        if (range === 'Month') stepsTarget = 300000;
        if (range === 'Year') stepsTarget = 3650000;

        const stepsCurrent = totals.steps || 0;
        const stepsPct = Math.min(Math.round((stepsCurrent / stepsTarget) * 100), 100);

        const dailyItems: BackendDailyMetricItem[] = result.daily || [];
        let chartDays: DayBarData[] = [];
        let avgStepsVal = 0;

        if (range === 'Week') {
          const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const maxTarget = 10000;
          const stepMap: Record<string, number> = {};
          dailyItems.forEach((item) => {
            if (item.date) {
              const d = new Date(item.date);
              const nameIdx = (d.getDay() + 6) % 7;
              stepMap[dayNames[nameIdx]] = (stepMap[dayNames[nameIdx]] || 0) + item.steps;
            }
          });

          chartDays = dayNames.map((d) => {
            const steps = stepMap[d] || 0;
            return {
              day: d,
              label: d,
              value: Math.min(Math.round((steps / maxTarget) * 100), 100),
              steps,
            };
          });
          const totalWeekSteps = chartDays.reduce((acc, curr) => acc + (curr.steps || 0), 0);
          avgStepsVal = Math.round(totalWeekSteps / 7);
        } else if (range === 'Month') {
          const maxTarget = 10000;
          chartDays = dailyItems.map((item, idx) => {
            const dayNum = item.date ? parseInt(item.date.split('-')[2], 10) : idx + 1;
            const showLabel = dayNum === 1 || dayNum % 5 === 0;
            return {
              day: `${dayNum}`,
              label: showLabel ? `${dayNum}` : '',
              value: Math.min(Math.round(((item.steps || 0) / maxTarget) * 100), 100),
              steps: item.steps || 0,
            };
          });
          const totalMonthSteps = chartDays.reduce((acc, curr) => acc + (curr.steps || 0), 0);
          avgStepsVal = Math.round(totalMonthSteps / (chartDays.length || 30));
        } else if (range === 'Year') {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthlySteps = new Array(12).fill(0);

          dailyItems.forEach((item) => {
            if (item.date) {
              const mIdx = new Date(item.date).getMonth();
              monthlySteps[mIdx] += item.steps || 0;
            }
          });

          const maxMonthlyTarget = 300000;
          chartDays = monthNames.map((name, idx) => {
            const steps = monthlySteps[idx] || 0;
            return {
              day: name,
              label: name,
              value: Math.min(Math.round((steps / maxMonthlyTarget) * 100), 100),
              steps,
            };
          });
          const totalYearSteps = monthlySteps.reduce((acc, curr) => acc + curr, 0);
          avgStepsVal = Math.round(totalYearSteps / 365);
        }

        set((state) => ({
          isLoadingRangeData: false,
          datasets: {
            ...state.datasets,
            [range]: {
              steps: {
                current: stepsCurrent,
                target: stepsTarget,
                percentage: stepsPct,
              },
              calories: {
                value: formatNumberWithCommas(totals.calories),
                unit: 'kcal',
                trend: `Total ${range.toLowerCase()}`,
                trendDirection: 'neutral',
              },
              distance: {
                value: (totals.distanceKm || 0).toFixed(1),
                unit: 'km',
                trend: `Total ${range.toLowerCase()}`,
                trendDirection: 'neutral',
              },
              activeMinutes: {
                value: formatNumberWithCommas(totals.activeMinutes),
                unit: 'min',
                trend: `Total ${range.toLowerCase()}`,
                trendDirection: 'neutral',
              },
              heartRate: {
                value: `${totals.avgHeartRate || 0}`,
                unit: 'bpm avg',
                trend: `Avg ${range.toLowerCase()}`,
                trendDirection: 'neutral',
              },
              sleep: {
                value: formatSleepMinutes(totals.sleepMinutes),
                unit: 'avg',
                trend: `Avg ${range.toLowerCase()}`,
                trendDirection: 'neutral',
              },
              workouts: {
                value: formatNumberWithCommas(totals.workoutCount),
                unit: totals.workoutCount === 1 ? 'session' : 'sessions',
                trend: `Total ${range.toLowerCase()}`,
                trendDirection: 'neutral',
              },
              weeklyActivity: {
                avgSteps: formatNumberWithCommas(avgStepsVal),
                days: chartDays,
              },
            },
          },
        }));
      } catch (e) {
        devWarn(`[useMetricsStore] fetchRangeData(${range}) failed:`, e);
        set({ isLoadingRangeData: false });
      }
    },
  };
});
