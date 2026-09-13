import { Platform } from 'react-native';
import type { HealthAdapter, DailyHealthSummary, DayBarSample } from './HealthAdapter';
import { devLog, devWarn } from './devLog';

// react-native-health (the old bridge-only HealthKit binding this adapter
// used to wrap) never wired up under this app's fully bridgeless New
// Architecture runtime — its native module registered but exposed zero
// methods (confirmed via a device diagnostic: NativeModules.AppleHealthKit
// existed but had no keys). @kingstinct/react-native-healthkit is built on
// Nitro Modules (JSI host objects), which work regardless of bridge/
// bridgeless mode, so it's what actually talks to HealthKit here.
let HealthKit: any = null;

try {
  if (Platform.OS === 'ios') {
    HealthKit = require('@kingstinct/react-native-healthkit');
  }
} catch (e) {
  devWarn('[AppleHealthAdapter] Could not import @kingstinct/react-native-healthkit:', e);
}

const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierHeartRate',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKWorkoutTypeIdentifier',
] as const;

// CategoryValueSleepAnalysis: inBed = 0, awake = 2 — every other value
// (asleepUnspecified/asleepCore/asleepDeep/asleepREM) counts as actual sleep.
const SLEEP_NON_ASLEEP_VALUES = new Set([0, 2]);

// HealthKit statistics buckets are aligned to calendar days in the device's
// local timezone, but Date#toISOString() always renders in UTC — for any
// timezone ahead of UTC (e.g. IST, UTC+5:30) that pushes local midnight onto
// the previous UTC day, silently shifting every bucket by one day. Always key
// dates by their local calendar day instead of the UTC ISO string.
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export class AppleHealthAdapter implements HealthAdapter {
  private isInitialized = false;

  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !HealthKit) {
      return false;
    }
    try {
      if (typeof HealthKit.isHealthDataAvailableAsync === 'function') {
        return await HealthKit.isHealthDataAvailableAsync();
      }
      if (typeof HealthKit.isHealthDataAvailable === 'function') {
        return HealthKit.isHealthDataAvailable();
      }
      return false;
    } catch (e) {
      devWarn('[AppleHealthAdapter] isAvailable failed:', e);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !HealthKit || typeof HealthKit.requestAuthorization !== 'function') {
      return false;
    }
    try {
      // Safe to call every time — HealthKit only shows the system prompt for
      // types not yet decided on; already-authorized types resolve silently.
      const granted = await HealthKit.requestAuthorization({ toRead: READ_TYPES });
      this.isInitialized = true;
      return !!granted;
    } catch (e) {
      devWarn('[AppleHealthAdapter] requestPermissions failed:', e);
      return false;
    }
  }

  async checkPermissions(): Promise<boolean> {
    // HealthKit intentionally never exposes real read-permission status — see
    // the HealthAdapter interface doc. Callers should not rely on this on iOS.
    return Platform.OS === 'ios';
  }

  private async ensureInitialized(): Promise<boolean> {
    if (this.isInitialized) return true;
    return this.requestPermissions();
  }

  private async sumQuantity(identifier: string, unit: string, startDate: Date, endDate: Date): Promise<number> {
    if (!HealthKit) return 0;
    try {
      const result = await HealthKit.queryStatisticsForQuantity(identifier, ['cumulativeSum'], {
        filter: { date: { startDate, endDate } },
        unit,
      });
      return result?.sumQuantity?.quantity || 0;
    } catch (e) {
      devWarn(`[AppleHealthAdapter] sumQuantity(${identifier}) failed:`, e);
      return 0;
    }
  }

  private async averageQuantity(identifier: string, unit: string, startDate: Date, endDate: Date): Promise<number> {
    if (!HealthKit) return 0;
    try {
      const result = await HealthKit.queryStatisticsForQuantity(identifier, ['discreteAverage'], {
        filter: { date: { startDate, endDate } },
        unit,
      });
      return result?.averageQuantity?.quantity || 0;
    } catch (e) {
      devWarn(`[AppleHealthAdapter] averageQuantity(${identifier}) failed:`, e);
      return 0;
    }
  }

  private async sumSleepMinutes(startDate: Date, endDate: Date): Promise<number> {
    if (!HealthKit) return 0;
    try {
      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        filter: { date: { startDate, endDate } },
        limit: 0,
      });
      let totalMs = 0;
      (samples || []).forEach((sample: any) => {
        if (SLEEP_NON_ASLEEP_VALUES.has(sample.value)) return;
        const start = new Date(sample.startDate).getTime();
        const end = new Date(sample.endDate).getTime();
        if (end > start) totalMs += end - start;
      });
      return Math.round(totalMs / (1000 * 60));
    } catch (e) {
      devWarn('[AppleHealthAdapter] sumSleepMinutes failed:', e);
      return 0;
    }
  }

  private async countWorkouts(startDate: Date, endDate: Date): Promise<number> {
    if (!HealthKit) return 0;
    try {
      const workouts = await HealthKit.queryWorkoutSamples({
        filter: { date: { startDate, endDate } },
        limit: 0,
      });
      return Array.isArray(workouts) ? workouts.length : 0;
    } catch (e) {
      devWarn('[AppleHealthAdapter] countWorkouts failed:', e);
      return 0;
    }
  }

  private async summaryFor(startDate: Date, endDate: Date, dateLabel: string): Promise<DailyHealthSummary> {
    const emptySummary: DailyHealthSummary = {
      date: dateLabel,
      steps: 0,
      calories: 0,
      distanceKm: 0,
      activeMinutes: 0,
      heartRate: 0,
      sleepMinutes: 0,
      workoutCount: 0,
    };

    if (Platform.OS !== 'ios' || !HealthKit) {
      return emptySummary;
    }

    const initialized = await this.ensureInitialized();
    if (!initialized) return emptySummary;

    try {
      const [steps, calories, distanceMeters, heartRate, sleepMinutes, workoutCount] = await Promise.all([
        this.sumQuantity('HKQuantityTypeIdentifierStepCount', 'count', startDate, endDate),
        this.sumQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', startDate, endDate),
        this.sumQuantity('HKQuantityTypeIdentifierDistanceWalkingRunning', 'm', startDate, endDate),
        this.averageQuantity('HKQuantityTypeIdentifierHeartRate', 'count/min', startDate, endDate),
        this.sumSleepMinutes(startDate, endDate),
        this.countWorkouts(startDate, endDate),
      ]);

      const activeMinutes = Math.min(Math.round(steps / 100) + workoutCount * 30, 180);

      return {
        date: dateLabel,
        steps: Math.round(steps),
        calories: Math.round(calories),
        distanceKm: parseFloat((distanceMeters / 1000).toFixed(2)),
        activeMinutes,
        heartRate: Math.round(heartRate),
        sleepMinutes,
        workoutCount,
      };
    } catch (e) {
      devWarn('[AppleHealthAdapter] summaryFor failed:', e);
      return emptySummary;
    }
  }

  async getTodaySummary(): Promise<DailyHealthSummary> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const summary = await this.summaryFor(startOfToday, now, localDateKey(now));

    devLog('----------------------------------------------------');
    devLog('📊 [AppleHealthAdapter] Today Summary from HealthKit:');
    devLog('   Date:', summary.date);
    devLog('   Steps:', summary.steps);
    devLog('   Calories (kcal):', summary.calories);
    devLog('   Distance (km):', summary.distanceKm);
    devLog('   Heart Rate (bpm):', summary.heartRate);
    devLog('   Sleep (mins):', summary.sleepMinutes);
    devLog('   Active Mins:', summary.activeMinutes);
    devLog('   Workouts:', summary.workoutCount);
    devLog('----------------------------------------------------');

    return summary;
  }

  async getYesterdaySummary(): Promise<DailyHealthSummary> {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
    return this.summaryFor(startOfYesterday, endOfYesterday, localDateKey(yesterday));
  }

  async getWeekBarSamples(): Promise<DayBarSample[]> {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const currentDayIdx = now.getDay();

    const mondayOffset = currentDayIdx === 0 ? -6 : 1 - currentDayIdx;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);

    const weekDays: Array<{ dateStr: string; dayLabel: string; isCurrent: boolean }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      weekDays.push({
        dateStr: localDateKey(d),
        dayLabel: dayNames[d.getDay()],
        isCurrent: d.toDateString() === now.toDateString(),
      });
    }

    const emptyBars: DayBarSample[] = weekDays.map((w) => ({
      day: w.dayLabel,
      label: w.dayLabel,
      value: 0,
      steps: 0,
      isCurrent: w.isCurrent,
    }));

    if (Platform.OS !== 'ios' || !HealthKit) {
      return emptyBars;
    }

    const initialized = await this.ensureInitialized();
    if (!initialized) return emptyBars;

    const startOfWeek = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0);

    try {
      const buckets = await HealthKit.queryStatisticsCollectionForQuantity(
        'HKQuantityTypeIdentifierStepCount',
        ['cumulativeSum'],
        startOfWeek,
        { day: 1 },
        { filter: { date: { startDate: startOfWeek, endDate: now } }, unit: 'count' }
      );

      const map: Record<string, number> = {};
      (buckets || []).forEach((bucket: any) => {
        if (!bucket.startDate) return;
        const dStr = localDateKey(new Date(bucket.startDate));
        map[dStr] = (map[dStr] || 0) + (bucket.sumQuantity?.quantity || 0);
      });

      const maxTarget = 10000;
      const bars: DayBarSample[] = weekDays.map((w) => {
        const stepVal = Math.round(map[w.dateStr] || 0);
        const pct = Math.min(Math.round((stepVal / maxTarget) * 100), 100);
        return {
          day: w.dayLabel,
          label: w.dayLabel,
          value: pct,
          steps: stepVal,
          isCurrent: w.isCurrent,
        };
      });

      devLog('----------------------------------------------------');
      devLog('📅 [AppleHealthAdapter] Weekly Steps Read from HealthKit:');
      bars.forEach((b, idx) => {
        devLog(`   ${b.day} (${weekDays[idx].dateStr}): ${b.steps} steps ${b.isCurrent ? '👈 [TODAY]' : ''}`);
      });
      devLog('----------------------------------------------------');

      return bars;
    } catch (e) {
      devWarn('[AppleHealthAdapter] getWeekBarSamples failed:', e);
      return emptyBars;
    }
  }
}
