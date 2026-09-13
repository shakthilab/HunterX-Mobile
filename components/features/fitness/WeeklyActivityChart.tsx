import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { fontFamilies } from '@/theme/typography';

export interface DayBarData {
  day: string;
  label: string;
  value: number; // 0 to 100 percentage
  steps?: number;
  isCurrent?: boolean;
}

interface WeeklyActivityChartProps {
  avgSteps?: string;
  days?: DayBarData[];
}

const DEFAULT_DAYS: DayBarData[] = [
  { day: 'Mon', label: 'Mon', value: 62, steps: 6200 },
  { day: 'Tue', label: 'Tue', value: 84, steps: 8400 },
  { day: 'Wed', label: 'Wed', value: 79, steps: 7900 },
  { day: 'Thu', label: 'Thu', value: 91, steps: 9100 },
  { day: 'Fri', label: 'Fri', value: 54, steps: 5400 },
  { day: 'Sat', label: 'Sat', value: 100, steps: 10200 },
  { day: 'Sun', label: 'Sun', value: 84, steps: 8420, isCurrent: true },
];

export function WeeklyActivityChart({ avgSteps, days }: WeeklyActivityChartProps) {
  const chartDays = days && days.length > 0 ? days : DEFAULT_DAYS;

  // Default selected day is today / current day or last day in array
  const currentDayObj = chartDays.find((d) => d.isCurrent) || chartDays[chartDays.length - 1];
  const [selectedDay, setSelectedDay] = useState<string>(currentDayObj?.day || 'Sun');

  const trackHeight = 84;

  // Calculate average steps if not passed explicitly
  const computedAvgSteps = React.useMemo(() => {
    if (avgSteps) return avgSteps;
    const total = chartDays.reduce((acc, curr) => acc + (curr.steps || 0), 0);
    const avg = Math.round(total / (chartDays.length || 7));
    return avg.toLocaleString('en-US');
  }, [avgSteps, chartDays]);

  const handleBarPress = (dayName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDay(dayName);
  };

  const selectedDayItem = chartDays.find((d) => d.day === selectedDay) || chartDays[0];

  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={['#16171E', '#101117', '#0C0D12']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Header: Title on Left, Avg Steps on Right */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Weekly Activity</Text>
            <Text style={styles.headerSubtitle}>
              {selectedDayItem ? `${selectedDayItem.day}: ${(selectedDayItem.steps || 0).toLocaleString()} steps` : 'Daily Step Breakdown'}
            </Text>
          </View>
          <View style={styles.avgContainer}>
            <Text style={styles.avgValue}>{computedAvgSteps}</Text>
            <Text style={styles.avgLabel}>avg. steps</Text>
          </View>
        </View>

        {/* 7 Vertical Capsule Bars Container */}
        <View style={styles.chartArea}>
          {/* Horizontal Grid lines */}
          <View style={styles.gridLinesContainer} pointerEvents="none">
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
          </View>

          <View style={styles.barsContainer}>
            {chartDays.map((item) => {
              const isSelected = item.day === selectedDay;
              const isToday = !!item.isCurrent;
              const hasData = (item.steps || 0) > 0;
              const fillPct = Math.min(Math.max(item.value, 0), 100);
              const fillHeight = fillPct > 0 ? Math.max(Math.round((fillPct / 100) * trackHeight), 10) : 4;
              const stepCountStr = (item.steps || 0).toLocaleString();

              return (
                <TouchableOpacity
                  key={item.day}
                  style={styles.barColumn}
                  onPress={() => handleBarPress(item.day)}
                  activeOpacity={0.8}
                >
                  {/* Capsule Track */}
                  <View style={[styles.capsuleTrack, { height: trackHeight }]}>
                    <LinearGradient
                      colors={
                        hasData || isSelected || isToday
                          ? ['#FE5B01', '#FF3B30', '#D82618']
                          : ['#3A3F50', '#282C38', '#1F222C']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[
                        styles.capsuleFill,
                        { height: fillHeight },
                        isSelected && styles.activeFillGlow,
                      ]}
                    />
                  </View>

                  {/* Day Label */}
                  <Text
                    style={[
                      styles.dayLabel,
                      isSelected && styles.activeDayLabel,
                      isToday && !isSelected && styles.todayDayLabel,
                    ]}
                  >
                    {item.label || item.day}
                  </Text>

                  {/* Reserved Fixed-Height Step Count Badge Below */}
                  <View style={styles.badgeSlot}>
                    {isSelected ? (
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{stepCountStr}</Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: '#222530',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 24,
  },
  cardGradient: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: '#FE5B01',
    marginTop: 2,
  },
  avgContainer: {
    alignItems: 'flex-end',
  },
  avgValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  avgLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#8A8F9E',
    marginTop: 2,
  },
  chartArea: {
    position: 'relative',
    paddingTop: 8,
  },
  gridLinesContainer: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 84,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: '#1E222D',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  capsuleTrack: {
    width: 16,
    backgroundColor: '#14161F',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 10,
  },
  capsuleFill: {
    width: '100%',
    borderRadius: 8,
  },
  activeFillGlow: {
    shadowColor: '#FE5B01',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  dayLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: '#71788E',
    marginBottom: 4,
  },
  activeDayLabel: {
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
  },
  todayDayLabel: {
    color: '#FE5B01',
  },
  badgeSlot: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadge: {
    backgroundColor: '#272B38',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3D4356',
  },
  stepBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#FE5B01',
  },
});
