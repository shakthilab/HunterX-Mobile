import React, { useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';

import { fontFamilies } from '@/theme/typography';
import { useMetricsStore } from '@/store/useMetricsStore';
import { MountainHeaderGraphic } from './MountainHeaderGraphic';
import { HealthConnectionBanner } from './HealthConnectionBanner';
import { TimeRangeSelector } from './TimeRangeSelector';
import { StepsHeroCard } from './StepsHeroCard';
import { MetricGridCard } from './MetricGridCard';
import { WeeklyActivityChart } from './WeeklyActivityChart';

interface MetricsDashboardViewProps {
  onBack?: () => void;
  showBackButton?: boolean;
}

export function MetricsDashboardView({
  onBack,
  showBackButton = true,
}: MetricsDashboardViewProps) {
  const insets = useSafeAreaInsets();
  const {
    timeRange,
    availableRanges,
    setTimeRange,
    datasets,
    connectedProvider,
    disconnectProvider,
    fetchRangeData,
    syncNow,
  } = useMetricsStore(
    useShallow((state) => ({
      timeRange: state.timeRange,
      availableRanges: state.availableRanges,
      setTimeRange: state.setTimeRange,
      datasets: state.datasets,
      connectedProvider: state.connectedProvider,
      disconnectProvider: state.disconnectProvider,
      fetchRangeData: state.fetchRangeData,
      syncNow: state.syncNow,
    }))
  );

  // Always reflects the latest selected range for the listeners below,
  // without needing to resubscribe them every time it changes.
  const timeRangeRef = useRef(timeRange);
  useEffect(() => {
    timeRangeRef.current = timeRange;
  }, [timeRange]);

  // Refresh whenever this screen gains focus — including the very first
  // mount — so switching back from another tab always shows the latest
  // health data instead of whatever was last fetched. This is a real sync
  // (not the throttled hourly one in app/_layout.tsx's foreground listener),
  // since routing into this screen is the moment the user actually expects
  // "Last synced" to reflect right now, not up to an hour ago.
  useFocusEffect(
    useCallback(() => {
      console.log('====================================================');
      console.log(`📊 [MetricsDashboardView] Focused for provider: ${connectedProvider} — syncing + refreshing ${timeRangeRef.current}`);
      console.log('====================================================');
      syncNow().then(() => {
        if (timeRangeRef.current !== 'Today') {
          fetchRangeData(timeRangeRef.current);
        }
      });
    }, [connectedProvider, syncNow, fetchRangeData])
  );

  // App-foreground refresh (leave HunterX, walk around, reopen) is handled
  // globally in app/_layout.tsx so it fires even if this screen was never
  // mounted yet this session — no need to duplicate an AppState listener here.

  const currentData = datasets[timeRange] || datasets.Today;

  const handleSettingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Metrics Settings',
      'Manage health data sources, sync intervals, and fitness preferences.',
      [
        { text: 'Sync Now', onPress: () => syncNow() },
        {
          text: 'Disconnect Health',
          style: 'destructive',
          onPress: () => {
            disconnectProvider();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (onBack) onBack();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleBannerPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Health Integration',
      'Your health data is actively syncing with HunterX.',
      [
        { text: 'Sync Now', onPress: () => syncNow() },
        {
          text: 'Change Connection',
          onPress: () => {
            disconnectProvider();
            if (onBack) onBack();
          },
        },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Mountain & Eclipse Header Backdrop */}
      <MountainHeaderGraphic height={180} />

      {/* Top Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Math.max(insets.top, 16),
          },
        ]}
      >
        {showBackButton && onBack ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Metrics</Text>
          <Text style={styles.pageSubtitle}>Your real progress. A healthier you.</Text>
        </View>

        {/* Health Connection Status Banner */}
        <HealthConnectionBanner onPress={handleBannerPress} />

        {/* Time Range Filter (Today, Week, Month, Year) */}
        <TimeRangeSelector
          selected={timeRange}
          onSelect={setTimeRange}
          availableRanges={availableRanges}
        />

        {/* Steps Hero Card */}
        <StepsHeroCard
          currentSteps={currentData.steps.current}
          targetSteps={currentData.steps.target}
          percentage={currentData.steps.percentage}
        />

        {/* 2x3 Metrics Grid */}
        <View style={styles.gridContainer}>
          {/* Row 1: Calories & Distance */}
          <View style={styles.gridRow}>
            <MetricGridCard
              type="calories"
              title="Calories"
              value={currentData.calories.value}
              unit={currentData.calories.unit}
              trend={currentData.calories.trend}
              trendDirection={currentData.calories.trendDirection}
            />
            <View style={styles.gridGap} />
            <MetricGridCard
              type="distance"
              title="Distance"
              value={currentData.distance.value}
              unit={currentData.distance.unit}
              trend={currentData.distance.trend}
              trendDirection={currentData.distance.trendDirection}
            />
          </View>

          {/* Row 2: Active Minutes & Heart Rate */}
          <View style={styles.gridRow}>
            <MetricGridCard
              type="activeMinutes"
              title="Active Minutes"
              value={currentData.activeMinutes.value}
              unit={currentData.activeMinutes.unit}
              trend={currentData.activeMinutes.trend}
              trendDirection={currentData.activeMinutes.trendDirection}
            />
            <View style={styles.gridGap} />
            <MetricGridCard
              type="heartRate"
              title="Heart Rate"
              value={currentData.heartRate.value}
              unit={currentData.heartRate.unit}
              trend={currentData.heartRate.trend}
              trendDirection={currentData.heartRate.trendDirection}
            />
          </View>

          {/* Row 3: Sleep & Workouts */}
          <View style={styles.gridRow}>
            <MetricGridCard
              type="sleep"
              title="Sleep"
              value={currentData.sleep.value}
              unit={currentData.sleep.unit}
              trend={currentData.sleep.trend}
              trendDirection={currentData.sleep.trendDirection}
            />
            <View style={styles.gridGap} />
            <MetricGridCard
              type="workouts"
              title="Workouts"
              value={currentData.workouts.value}
              unit={currentData.workouts.unit}
              trend={currentData.workouts.trend}
              trendDirection={currentData.workouts.trendDirection}
            />
          </View>
        </View>

        {/* Weekly Activity Bar Chart */}
        <WeeklyActivityChart
          avgSteps={currentData.weeklyActivity.avgSteps}
          days={currentData.weeklyActivity.days}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050608',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  titleSection: {
    marginBottom: 16,
    marginTop: 4,
  },
  pageTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 30,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: '#8A8F9E',
  },
  gridContainer: {
    marginBottom: 6,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  gridGap: {
    width: 14,
  },
});
