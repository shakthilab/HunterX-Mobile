import { Platform } from 'react-native';
import type { HealthAdapter, DailyHealthSummary, DayBarSample } from './HealthAdapter';
import { devLog, devWarn } from './devLog';

let HealthConnect: any = null;

try {
  if (Platform.OS === 'android') {
    HealthConnect = require('react-native-health-connect');
  }
} catch (e) {
  devWarn('[HealthConnectAdapter] Could not import react-native-health-connect:', e);
}

// Shared with checkPermissions() below so the "did we get everything we asked
// for" comparison can never drift from what we actually requested.
const REQUIRED_PERMISSIONS: Array<{ accessType: 'read'; recordType: string }> = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'ExerciseSession' },
];

export class HealthConnectAdapter implements HealthAdapter {
  private isInitialized = false;

  async isAvailable(): Promise<boolean> {
    devLog('====================================================');
    devLog('🔍 [HealthConnectAdapter] Checking Availability & SDK Status');
    devLog('   Platform OS:', Platform.OS);
    devLog('   Health Connect module imported:', !!HealthConnect);

    if (Platform.OS !== 'android') {
      devLog('   ❌ Result: Not Android (isAvailable: false)');
      devLog('====================================================');
      return false;
    }
    if (!HealthConnect) {
      console.error('   ❌ Result: react-native-health-connect module failed to load/import');
      devLog('====================================================');
      return false;
    }
    try {
      const status = await HealthConnect.getSdkStatus();
      let statusDesc = 'UNKNOWN';
      if (HealthConnect.SdkAvailabilityStatus) {
        if (status === HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE) {
          statusDesc = 'SDK_AVAILABLE (1) - Installed & Ready';
        } else if (status === HealthConnect.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
          statusDesc = 'SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED (2) - App install/update needed from Play Store';
        } else if (status === HealthConnect.SdkAvailabilityStatus.SDK_UNAVAILABLE) {
          statusDesc = 'SDK_UNAVAILABLE (3) - Not supported on this device/OS';
        }
      }
      devLog('   SDK Status Code:', status, `(${statusDesc})`);

      const isAvailable = status === HealthConnect.SdkAvailabilityStatus?.SDK_AVAILABLE;
      devLog(`   ${isAvailable ? '✅' : '❌'} Result: isAvailable = ${isAvailable}`);
      devLog('====================================================');
      return isAvailable;
    } catch (e: any) {
      console.error('   ❌ Exception during getSdkStatus:', e?.message || e, e);
      devLog('====================================================');
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    devLog('====================================================');
    devLog('🔑 [HealthConnectAdapter] Requesting Health Connect Permissions');
    if (Platform.OS !== 'android' || !HealthConnect) {
      console.error('   ❌ Failed: Not Android or HealthConnect module missing');
      devLog('====================================================');
      return false;
    }
    try {
      devLog('   Initializing HealthConnect SDK...');
      const isInit = await HealthConnect.initialize();
      devLog('   HealthConnect.initialize() result:', isInit);
      if (!isInit) {
        console.error('   ❌ HealthConnect.initialize() returned false');
        devLog('====================================================');
        return false;
      }
      this.isInitialized = true;

      devLog('   Requesting permissions for record types:');
      REQUIRED_PERMISSIONS.forEach((p) => devLog(`      - [${p.accessType}] ${p.recordType}`));

      const res = await HealthConnect.requestPermission(REQUIRED_PERMISSIONS);
      devLog('   HealthConnect.requestPermission() raw response:', JSON.stringify(res));

      if (Array.isArray(res) && res.length === 0) {
        devWarn('   ⚠️ Permissions request returned empty array (user canceled or denied all)');
        devLog('====================================================');
        return false;
      }

      devLog('   ✅ Permissions granted successfully!');
      devLog('====================================================');
      return true;
    } catch (e: any) {
      console.error('   ❌ Exception during requestPermissions:', e?.message || e, e);
      devLog('====================================================');
      return false;
    }
  }

  // Unlike HealthKit, Health Connect actually exposes real, current grant
  // status via getGrantedPermissions() — no system prompt, no heuristics. This
  // is what lets the store detect a revoked permission on Android and revert
  // to the connect banner instead of silently showing stale/zero data forever.
  async checkPermissions(): Promise<boolean> {
    devLog('====================================================');
    devLog('🛡️ [HealthConnectAdapter] Checking Granted Permissions...');
    if (Platform.OS !== 'android' || !HealthConnect) {
      devLog('   Skipped: Not Android');
      devLog('====================================================');
      return true;
    }
    try {
      const isInit = await HealthConnect.initialize();
      if (!isInit) {
        devWarn('   ⚠️ HealthConnect.initialize() returned false during check');
        devLog('====================================================');
        return false;
      }
      this.isInitialized = true;

      const granted: Array<{ accessType: string; recordType: string }> =
        await HealthConnect.getGrantedPermissions();
      devLog('   Currently granted permissions count:', Array.isArray(granted) ? granted.length : 0);
      if (Array.isArray(granted)) {
        granted.forEach((g) => devLog(`      ✓ [${g.accessType}] ${g.recordType}`));
      }

      if (!Array.isArray(granted)) {
        devWarn('   ⚠️ getGrantedPermissions did not return array');
        devLog('====================================================');
        return false;
      }

      const allGranted = REQUIRED_PERMISSIONS.every((required) =>
        granted.some(
          (g) => g.accessType === required.accessType && g.recordType === required.recordType
        )
      );

      devLog(`   ${allGranted ? '✅' : '⚠️'} All required permissions intact: ${allGranted}`);
      devLog('====================================================');
      return allGranted;
    } catch (e: any) {
      devWarn('   ⚠️ checkPermissions exception:', e?.message || e);
      devLog('====================================================');
      return true;
    }
  }

  async getTodaySummary(): Promise<DailyHealthSummary> {
    const todayStr = new Date().toISOString().split('T')[0];
    const emptySummary: DailyHealthSummary = {
      date: todayStr,
      steps: 0,
      calories: 0,
      distanceKm: 0,
      activeMinutes: 0,
      heartRate: 0,
      sleepMinutes: 0,
      workoutCount: 0,
    };

    if (Platform.OS !== 'android' || !HealthConnect) {
      return emptySummary;
    }

    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = now.toISOString();

      const timeRangeFilter = {
        operator: 'between',
        startTime: startOfDay,
        endTime: endOfDay,
      };

      let steps = 0;
      try {
        const stepRecords = await HealthConnect.readRecords('Steps', { timeRangeFilter });
        if (stepRecords?.records) {
          steps = stepRecords.records.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0);
        }
        devLog(`   [HealthConnect] Steps records count: ${stepRecords?.records?.length || 0}, Total Steps: ${steps}`);
      } catch (e: any) {
        devWarn('   [HealthConnect] Failed to read Steps records:', e?.message || e);
      }

      let calories = 0;
      try {
        const calorieRecords = await HealthConnect.readRecords('ActiveCaloriesBurned', { timeRangeFilter });
        if (calorieRecords?.records) {
          calories = Math.round(
            calorieRecords.records.reduce((acc: number, curr: any) => acc + (curr.energy?.inKilocalories || 0), 0)
          );
        }
        devLog(`   [HealthConnect] Calories records count: ${calorieRecords?.records?.length || 0}, Total Calories: ${calories} kcal`);
      } catch (e: any) {
        devWarn('   [HealthConnect] Failed to read ActiveCaloriesBurned records:', e?.message || e);
      }

      let distanceKm = 0;
      try {
        const distRecords = await HealthConnect.readRecords('Distance', { timeRangeFilter });
        if (distRecords?.records) {
          const totalMeters = distRecords.records.reduce((acc: number, curr: any) => acc + (curr.distance?.inMeters || 0), 0);
          distanceKm = parseFloat((totalMeters / 1000).toFixed(2));
        }
        devLog(`   [HealthConnect] Distance records count: ${distRecords?.records?.length || 0}, Total Distance: ${distanceKm} km`);
      } catch (e: any) {
        devWarn('   [HealthConnect] Failed to read Distance records:', e?.message || e);
      }

      let heartRate = 0;
      try {
        const hrRecords = await HealthConnect.readRecords('HeartRate', { timeRangeFilter });
        if (hrRecords?.records?.length > 0) {
          let sumBpm = 0;
          let count = 0;
          hrRecords.records.forEach((rec: any) => {
            if (Array.isArray(rec.samples)) {
              rec.samples.forEach((s: any) => {
                sumBpm += s.beatsPerMinute || 0;
                count++;
              });
            }
          });
          if (count > 0) heartRate = Math.round(sumBpm / count);
        }
        devLog(`   [HealthConnect] HeartRate records count: ${hrRecords?.records?.length || 0}, Avg HR: ${heartRate} bpm`);
      } catch (e: any) {
        devWarn('   [HealthConnect] Failed to read HeartRate records:', e?.message || e);
      }

      let sleepMinutes = 0;
      try {
        const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 18, 0).toISOString();
        const sleepFilter = { operator: 'between', startTime: yesterdayStart, endTime: endOfDay };
        const sleepRecords = await HealthConnect.readRecords('SleepSession', { timeRangeFilter: sleepFilter });
        if (sleepRecords?.records) {
          let totalMs = 0;
          sleepRecords.records.forEach((rec: any) => {
            if (rec.startTime && rec.endTime) {
              totalMs += new Date(rec.endTime).getTime() - new Date(rec.startTime).getTime();
            }
          });
          sleepMinutes = Math.round(totalMs / (1000 * 60));
        }
        devLog(`   [HealthConnect] SleepSession records count: ${sleepRecords?.records?.length || 0}, Total Sleep: ${sleepMinutes} mins`);
      } catch (e: any) {
        devWarn('   [HealthConnect] Failed to read SleepSession records:', e?.message || e);
      }

      let workoutCount = 0;
      try {
        const workoutRecords = await HealthConnect.readRecords('ExerciseSession', { timeRangeFilter });
        if (workoutRecords?.records) {
          workoutCount = workoutRecords.records.length;
        }
        devLog(`   [HealthConnect] ExerciseSession records count: ${workoutCount}`);
      } catch (e: any) {
        devWarn('   [HealthConnect] Failed to read ExerciseSession records:', e?.message || e);
      }

      const activeMinutes = Math.min(Math.round(steps / 100) + (workoutCount * 30), 180);

      const summary: DailyHealthSummary = {
        date: todayStr,
        steps,
        calories,
        distanceKm,
        activeMinutes,
        heartRate,
        sleepMinutes,
        workoutCount,
      };

      devLog('----------------------------------------------------');
      devLog('📊 [HealthConnectAdapter] Live Health Summary Read from Android:');
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
    } catch (e: any) {
      devWarn('[HealthConnectAdapter] getTodaySummary failed:', e);
      return emptySummary;
    }
  }

  async getYesterdaySummary(): Promise<DailyHealthSummary> {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const emptySummary: DailyHealthSummary = {
      date: yesterdayStr,
      steps: 0,
      calories: 0,
      distanceKm: 0,
      activeMinutes: 0,
      heartRate: 0,
      sleepMinutes: 0,
      workoutCount: 0,
    };

    if (Platform.OS !== 'android' || !HealthConnect) {
      return emptySummary;
    }

    try {
      const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0).toISOString();
      const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59).toISOString();

      const timeRangeFilter = {
        operator: 'between',
        startTime: startOfDay,
        endTime: endOfDay,
      };

      let steps = 0;
      try {
        const stepRecords = await HealthConnect.readRecords('Steps', { timeRangeFilter });
        if (stepRecords?.records) {
          steps = stepRecords.records.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0);
        }
      } catch (_) {}

      let calories = 0;
      try {
        const calorieRecords = await HealthConnect.readRecords('ActiveCaloriesBurned', { timeRangeFilter });
        if (calorieRecords?.records) {
          calories = Math.round(
            calorieRecords.records.reduce((acc: number, curr: any) => acc + (curr.energy?.inKilocalories || 0), 0)
          );
        }
      } catch (_) {}

      let distanceKm = 0;
      try {
        const distRecords = await HealthConnect.readRecords('Distance', { timeRangeFilter });
        if (distRecords?.records) {
          const totalMeters = distRecords.records.reduce((acc: number, curr: any) => acc + (curr.distance?.inMeters || 0), 0);
          distanceKm = parseFloat((totalMeters / 1000).toFixed(2));
        }
      } catch (_) {}

      let heartRate = 0;
      try {
        const hrRecords = await HealthConnect.readRecords('HeartRate', { timeRangeFilter });
        if (hrRecords?.records?.length > 0) {
          let sumBpm = 0;
          let count = 0;
          hrRecords.records.forEach((rec: any) => {
            if (Array.isArray(rec.samples)) {
              rec.samples.forEach((s: any) => {
                sumBpm += s.beatsPerMinute || 0;
                count++;
              });
            }
          });
          if (count > 0) heartRate = Math.round(sumBpm / count);
        }
      } catch (_) {}

      let sleepMinutes = 0;
      try {
        const sleepRecords = await HealthConnect.readRecords('SleepSession', { timeRangeFilter });
        if (sleepRecords?.records) {
          let totalMs = 0;
          sleepRecords.records.forEach((rec: any) => {
            if (rec.startTime && rec.endTime) {
              totalMs += new Date(rec.endTime).getTime() - new Date(rec.startTime).getTime();
            }
          });
          sleepMinutes = Math.round(totalMs / (1000 * 60));
        }
      } catch (_) {}

      let workoutCount = 0;
      try {
        const workoutRecords = await HealthConnect.readRecords('ExerciseSession', { timeRangeFilter });
        if (workoutRecords?.records) {
          workoutCount = workoutRecords.records.length;
        }
      } catch (_) {}

      const activeMinutes = Math.min(Math.round(steps / 100) + (workoutCount * 30), 180);

      return {
        date: yesterdayStr,
        steps,
        calories,
        distanceKm,
        activeMinutes,
        heartRate,
        sleepMinutes,
        workoutCount,
      };
    } catch (e) {
      devWarn('[HealthConnectAdapter] getYesterdaySummary failed:', e);
      return emptySummary;
    }
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
        dateStr: d.toISOString().split('T')[0],
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

    if (Platform.OS !== 'android' || !HealthConnect) {
      return emptyBars;
    }

    try {
      const startOfWeek = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0).toISOString();
      const endOfWeek = now.toISOString();

      const stepRecords = await HealthConnect.readRecords('Steps', {
        timeRangeFilter: { operator: 'between', startTime: startOfWeek, endTime: endOfWeek },
      });

      const map: Record<string, number> = {};
      if (stepRecords?.records) {
        stepRecords.records.forEach((rec: any) => {
          if (rec.startTime) {
            const dStr = rec.startTime.split('T')[0];
            map[dStr] = (map[dStr] || 0) + (rec.count || 0);
          }
        });
      }

      const maxTarget = 10000;
      const samples = weekDays.map((w) => {
        const stepVal = map[w.dateStr] || 0;
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
      devLog('📅 [HealthConnectAdapter] Weekly Steps Read from Health Connect:');
      devLog(`   Time Window: ${startOfWeek} -> ${endOfWeek}`);
      devLog(`   Total Step Records Count: ${stepRecords?.records?.length || 0}`);
      samples.forEach((s, idx) => {
        const dateStr = weekDays[idx].dateStr;
        devLog(`   ${s.day} (${dateStr}): ${s.steps} steps ${s.isCurrent ? '👈 [TODAY]' : ''}`);
      });
      devLog('----------------------------------------------------');

      return samples;
    } catch (e: any) {
      devWarn('[HealthConnectAdapter] getWeekBarSamples failed:', e);
      return emptyBars;
    }
  }
}
