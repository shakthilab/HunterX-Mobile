import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { fontFamilies } from '@/theme/typography';
import { getAvatarSource } from '@/app/(tabs)/profile';
import { CLOUDINARY_ASSETS } from '@/constants/cloudinaryAssets';
import type { WeekStatus } from '@/types/user';
import { WeeklyProgressCard } from './WeeklyProgressCard';

export type DayStatus = 'completed' | 'today' | 'missed' | 'locked' | 'freeze';

export interface DayTrackerItem {
  dayName: string;
  dateNum: string;
  dateStr?: string;
  status: DayStatus;
  isToday?: boolean;
  isDone?: boolean;
  rawStatus?: string;
}

interface WeeklyTrackerProps {
  days?: DayTrackerItem[];
  weekStatus?: WeekStatus | null;
  streakDays?: number;
  completedDaysCount?: number;
  totalDaysCount?: number;
  subtitleMessage?: string;
  characterImageSource?: any;
  avatarUrl?: string | null;
  avatarId?: string | number | null;
  showBottomCard?: boolean;
  onDayPress?: (day: DayTrackerItem) => void;
}

function getLocalTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateNum(dateStr?: string, fallbackIndex = 0): string {
  if (!dateStr) return String(fallbackIndex + 1).padStart(2, '0');
  if (dateStr.includes('-')) {
    const dayPart = dateStr.split('T')[0].split('-')[2];
    if (dayPart) return dayPart.padStart(2, '0');
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return String(parsed.getDate()).padStart(2, '0');
  }
  return String(fallbackIndex + 1).padStart(2, '0');
}

export function generateWeekDaysFromWeekStatus(
  weekStatus?: WeekStatus | null,
  fallbackCompletedCount?: number
): DayTrackerItem[] {
  const todayDateStr = getLocalTodayDateStr();
  const now = new Date();
  const dayOfWeek = now.getDay();
  const distanceToMon = (dayOfWeek + 6) % 7; // 0 for Mon, 6 for Sun

  if (weekStatus?.days && Array.isArray(weekStatus.days) && weekStatus.days.length > 0) {
    const dayAbbrevMap: Record<string, string> = {
      MONDAY: 'MON',
      TUESDAY: 'TUE',
      WEDNESDAY: 'WED',
      THURSDAY: 'THU',
      FRIDAY: 'FRI',
      SATURDAY: 'SAT',
      SUNDAY: 'SUN',
      MON: 'MON',
      TUE: 'TUE',
      WED: 'WED',
      THU: 'THU',
      FRI: 'FRI',
      SAT: 'SAT',
      SUN: 'SUN',
    };

    const hasTodayMatch = weekStatus.days.some((d) => d.date === todayDateStr);

    return weekStatus.days.map((d, index) => {
      const dayUpper = (d.day || '').toUpperCase();
      const dayName = dayAbbrevMap[dayUpper] || dayUpper.slice(0, 3) || 'DAY';
      const dateNum = parseDateNum(d.date, index);

      const isToday = hasTodayMatch ? d.date === todayDateStr : index === distanceToMon;
      const statusUpper = (d.status || '').toUpperCase();
      const isDone = statusUpper === 'DONE' || statusUpper === 'COMPLETED';
      const isMissed = statusUpper === 'MISSED' || statusUpper === 'FAILED' || statusUpper === 'SKIPPED';
      const isFreeze = statusUpper === 'FREEZE' || statusUpper === 'FROZEN' || statusUpper === 'REST';

      let status: DayStatus = 'locked';

      if (isToday) {
        status = 'today';
      } else if (isDone) {
        status = 'completed';
      } else if (isFreeze) {
        status = 'freeze';
      } else if (isMissed) {
        status = 'missed';
      } else {
        // Status is NOT_STARTED or PENDING
        // If it falls before today, it is considered a left / missed day
        const isPast = d.date ? d.date < todayDateStr : index < distanceToMon;
        if (isPast) {
          status = 'missed';
        } else {
          status = 'locked';
        }
      }

      return {
        dayName,
        dateNum,
        dateStr: d.date,
        status,
        isToday,
        isDone,
        rawStatus: d.status,
      };
    });
  }

  return generateCurrentWeekDays(fallbackCompletedCount);
}

export function generateCurrentWeekDays(completedCount?: number): DayTrackerItem[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const distanceToMon = (dayOfWeek + 6) % 7;

  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMon);

  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const targetCompletedCount = completedCount ?? (distanceToMon + 1);

  return dayNames.map((dayName, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateNum = String(d.getDate()).padStart(2, '0');
    const isToday = i === distanceToMon;
    const isDone = i < targetCompletedCount;

    let status: DayStatus = 'locked';
    if (isToday) {
      status = 'today';
    } else if (i < distanceToMon) {
      status = isDone ? 'completed' : 'missed';
    } else {
      status = 'locked';
    }

    return {
      dayName,
      dateNum,
      status,
      isToday,
      isDone,
    };
  });
}

function TodayStarIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="-12 -12 24 24" fill="none">
      {/* 4-point Shuriken Star with Center Hole */}
      <Path
        fill="#FFFFFF"
        fillRule="evenodd"
        d="
          M 0,-9.6
          C 0.9,-4.2 4.2,-0.9 9.6,0
          C 4.2,0.9 0.9,4.2 0,9.6
          C -0.9,4.2 -4.2,0.9 -9.6,0
          C -4.2,-0.9 -0.9,-4.2 0,-9.6 Z
          M 0,-1.3
          A 1.3 1.3 0 1 0 0,1.3
          A 1.3 1.3 0 1 0 0,-1.3 Z
        "
      />
      {/* 4 Corner Arc Accents */}
      <Path
        d="M 3.1,-4.9 A 5.8 5.8 0 0 1 4.9,-3.1"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.1}
        strokeLinecap="round"
      />
      <Path
        d="M 4.9,3.1 A 5.8 5.8 0 0 1 3.1,4.9"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.1}
        strokeLinecap="round"
      />
      <Path
        d="M -3.1,4.9 A 5.8 5.8 0 0 1 -4.9,3.1"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.1}
        strokeLinecap="round"
      />
      <Path
        d="M -4.9,-3.1 A 5.8 5.8 0 0 1 -3.1,-4.9"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.1}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const DEFAULT_CHARACTER_IMAGE = CLOUDINARY_ASSETS.high_fidelity;

export function WeeklyTracker({
  days,
  weekStatus,
  streakDays = 5,
  completedDaysCount,
  totalDaysCount = 7,
  subtitleMessage = 'Track your progress. Consistency builds legends.',
  characterImageSource = DEFAULT_CHARACTER_IMAGE,
  avatarUrl,
  avatarId,
  showBottomCard = false,
  onDayPress,
}: WeeklyTrackerProps) {
  const activeDays = useMemo(() => {
    if (days && days.length > 0) return days;
    return generateWeekDaysFromWeekStatus(weekStatus, completedDaysCount);
  }, [days, weekStatus, completedDaysCount]);

  const completedCount = useMemo(() => {
    if (completedDaysCount !== undefined) return completedDaysCount;
    return activeDays.filter((d) => d.status === 'completed' || (d.isToday && d.isDone)).length;
  }, [completedDaysCount, activeDays]);

  const imageSource =
    typeof characterImageSource === 'string' ? { uri: characterImageSource } : characterImageSource;

  // Calculate active index for the timeline connecting path line
  const activeIndex = useMemo(() => {
    const todayIdx = activeDays.findIndex((d) => d.isToday || d.status === 'today');
    if (todayIdx !== -1) return todayIdx;
    for (let i = activeDays.length - 1; i >= 0; i--) {
      if (activeDays[i].status === 'completed' || activeDays[i].isDone) return i;
    }
    return 0;
  }, [activeDays]);

  const totalDays = activeDays.length;
  const completedRatio = totalDays > 1 ? activeIndex / (totalDays - 1) : 0;

  // Animated moving path progress line — driven by Reanimated so the
  // animation runs on the UI thread instead of ticking via the JS bridge
  // every frame (this is a `width` animation, which RN's classic `Animated`
  // can only run with `useNativeDriver: false`, i.e. on the JS thread).
  const pathProgress = useSharedValue(0);

  useEffect(() => {
    pathProgress.value = 0;
    pathProgress.value = withTiming(completedRatio, { duration: 1000 });
  }, [completedRatio, pathProgress]);

  const timelineActiveStyle = useAnimatedStyle(() => ({
    width: `${pathProgress.value * 100}%`,
  }));

  // Node horizontal margins for 7 items
  const nodeMarginPercent = (1 / (2 * (totalDays || 7))) * 100; // ~7.14%

  // Circular Progress calculations
  const radius = 20;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalDaysCount > 0 ? completedCount / totalDaysCount : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <View style={styles.container}>
      {/* DAYS ROW WITH MOVING PATH TIMELINE LINE */}
      <View style={styles.daysRowContainer}>
        {/* Background Connecting Timeline Line */}
        <View
          style={[
            styles.timelineLineBackground,
            { left: `${nodeMarginPercent}%`, right: `${nodeMarginPercent}%` },
          ]}
        >
          {/* Base Inactive Path Line */}
          <View style={styles.timelineBaseLine} />

          {/* Animated Active Glowing Orange Moving Path */}
          <Animated.View
            style={[styles.timelineActiveLine, timelineActiveStyle]}
          >
            <LinearGradient
              colors={['#FE5B01', '#FF8800', '#FE5B01']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Glowing particle head at the moving path tip */}
            <View style={styles.timelineLeadGlow} />
          </Animated.View>
        </View>

        {/* Days List */}
        <View style={styles.daysRow}>
          {activeDays.map((item, index) => {
            const isToday = item.isToday || item.status === 'today';

            if (isToday) {
              return (
                <Pressable
                  key={index}
                  style={styles.todayCardContainer}
                  onPress={() => onDayPress?.(item)}
                >
                  <Text style={styles.todayDayName}>{item.dayName}</Text>

                  {/* Glowing Circle Node inside TODAY card */}
                  <View style={styles.todayCircleNode}>
                    <View style={styles.todayCircleInnerRim}>
                      <TodayStarIcon size={17} />
                    </View>
                  </View>

                  <Text style={styles.todayDateNum}>{item.dateNum}</Text>

                  {/* TODAY Pill Badge */}
                  <View style={styles.todayPillBadge}>
                    <Text style={styles.todayPillText}>TODAY</Text>
                  </View>
                </Pressable>
              );
            }

            // Normal Day - Completed
            if (item.status === 'completed' || item.isDone) {
              return (
                <Pressable
                  key={index}
                  style={styles.normalDayColumn}
                  onPress={() => onDayPress?.(item)}
                >
                  <Text style={styles.completedDayName}>{item.dayName}</Text>
                  <View style={styles.completedCircle}>
                    <Ionicons name="checkmark" size={14} color="#FE5B01" />
                  </View>
                  <Text style={styles.completedDateNum}>{item.dateNum}</Text>
                </Pressable>
              );
            }

            // Normal Day - Missed / Left Day (Hollow Dashed Ghost Ring)
            if (item.status === 'missed') {
              return (
                <Pressable
                  key={index}
                  style={styles.normalDayColumn}
                  onPress={() => onDayPress?.(item)}
                >
                  <Text style={styles.missedDayName}>{item.dayName}</Text>
                  <View style={styles.missedCircle} />
                  <Text style={styles.missedDateNum}>{item.dateNum}</Text>
                </Pressable>
              );
            }

            // Normal Day - Frozen / Rest Day
            if (item.status === 'freeze') {
              return (
                <Pressable
                  key={index}
                  style={styles.normalDayColumn}
                  onPress={() => onDayPress?.(item)}
                >
                  <Text style={styles.freezeDayName}>{item.dayName}</Text>
                  <View style={styles.freezeCircle}>
                    <MaterialCommunityIcons name="snowflake" size={13} color="#38BDF8" />
                  </View>
                  <Text style={styles.freezeDateNum}>{item.dateNum}</Text>
                </Pressable>
              );
            }

            // Normal Day - Upcoming Day (Locked)
            return (
              <Pressable
                key={index}
                style={styles.normalDayColumn}
                onPress={() => onDayPress?.(item)}
              >
                <Text style={styles.lockedDayName}>{item.dayName}</Text>
                <View style={styles.lockedCircle}>
                  <Ionicons name="lock-closed" size={12} color="#52525B" />
                </View>
                <Text style={styles.lockedDateNum}>{item.dateNum}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {showBottomCard && (
        <WeeklyProgressCard
          days={days}
          weekStatus={weekStatus}
          completedDaysCount={completedDaysCount}
          totalDaysCount={totalDaysCount}
          characterImageSource={characterImageSource}
          avatarUrl={avatarUrl}
          avatarId={avatarId}
        />
      )}



      {/* 
      BOTTOM CARD SECTION (Preserved as commented-out code)
      <View style={styles.bottomCard}>
        <View style={styles.characterImageWrapper} pointerEvents="none">
          <Image source={imageSource} style={styles.characterImage} resizeMode="cover" />
          <LinearGradient
            colors={['#141418', 'rgba(20, 20, 24, 0.75)', 'rgba(20, 20, 24, 0.2)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.75, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['rgba(20, 20, 24, 0.6)', 'transparent', 'transparent', 'rgba(20, 20, 24, 0.7)']}
            locations={[0, 0.2, 0.8, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>

        <View style={styles.bottomCardContent}>
          <View style={styles.progressRingSection}>
            <View style={styles.ringWrapper}>
              <Svg width={48} height={48} viewBox="0 0 50 50">
                <Circle
                  cx="25"
                  cy="25"
                  r={radius}
                  stroke="#26262E"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <Circle
                  cx="25"
                  cy="25"
                  r={radius}
                  stroke="#FE5B01"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 25 25)"
                />
              </Svg>
              <ExpoImage
                source={getAvatarSource(avatarUrl)}
                style={styles.avatarInsideRing}
                contentFit="cover"
                cachePolicy="memory-disk"
                placeholder={{ blurhash: DEFAULT_BLURHASH }}
                transition={150}
              />
            </View>

            <View style={styles.progressTextColumn}>
              <View style={styles.fractionRow}>
                <Text style={styles.fractionCompleted}>{completedCount}</Text>
                <Text style={styles.fractionTotal}>/{totalDaysCount}</Text>
              </View>
              <Text style={styles.progressLabel}>DAYS COMPLETED</Text>
            </View>
          </View>

          <View style={styles.verticalDivider} />

          <View style={styles.encouragementSection}>
            <Text
              style={styles.encouragementTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              Keep it up, hunter!
            </Text>
            <Text
              style={styles.encouragementSubtext}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              <Text style={styles.orangeHighlightNumber}>
                {Math.max(0, totalDaysCount - completedCount)}
              </Text>
              {' more days to complete'}
            </Text>
          </View>
        </View>

        <View style={styles.segmentedBarRow}>
          {activeDays.map((dayItem, index) => {
            let segColor = '#26262E';
            if (dayItem.status === 'completed' || (dayItem.isToday && dayItem.isDone)) {
              segColor = '#FE5B01';
            } else if (dayItem.status === 'missed') {
              segColor = '#451A1A';
            } else if (dayItem.status === 'freeze') {
              segColor = '#0284C7';
            }
            return (
              <View
                key={index}
                style={[
                  styles.segmentBarItem,
                  { backgroundColor: segColor },
                ]}
              />
            );
          })}
        </View>
      </View>
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F0F12',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#202026',
    padding: 12,
    marginHorizontal: 0,
    marginVertical: 12,
    width: '100%',
  },

  /* HEADER */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitleGroup: {
    flex: 1,
    marginRight: 8,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orangeIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FE5B01',
    backgroundColor: '#261208',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: '#8E8E93',
  },

  /* STREAK BADGE */
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161A',
    borderWidth: 1,
    borderColor: '#282830',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  flameIcon: {
    marginRight: 6,
  },
  streakTextColumn: {
    alignItems: 'flex-start',
  },
  streakLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 8,
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  streakValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    color: '#FE5B01',
  },

  /* DAYS ROW & MOVING TIMELINE PATH */
  daysRowContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  timelineLineBackground: {
    position: 'absolute',
    top: 37.5,
    height: 3,
    zIndex: 0,
  },
  timelineBaseLine: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#26262E',
    borderRadius: 2,
  },
  timelineActiveLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
    overflow: 'visible',
    shadowColor: '#FE5B01',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  timelineLeadGlow: {
    position: 'absolute',
    right: -4,
    top: -2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FE5B01',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 6,
  },

  daysRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  normalDayColumn: {
    alignItems: 'center',
    flex: 1,
  },

  /* COMPLETED DAY */
  completedDayName: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
    height: 14,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    includeFontPadding: false,
  },
  completedCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#FE5B01',
    backgroundColor: '#1E120A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#FE5B01',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  completedDateNum: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    height: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },

  /* MISSED / LEFT DAY (Hollow Dashed Outline) */
  missedDayName: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
    height: 14,
    color: '#71717A',
    marginBottom: 8,
    textAlign: 'center',
    includeFontPadding: false,
  },
  missedCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#52525B',
    backgroundColor: '#121216',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  missedDateNum: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    height: 16,
    color: '#71717A',
    textAlign: 'center',
    includeFontPadding: false,
  },

  /* FROZEN / REST DAY */
  freezeDayName: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
    height: 14,
    color: '#38BDF8',
    marginBottom: 8,
    textAlign: 'center',
    includeFontPadding: false,
  },
  freezeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#0284C7',
    backgroundColor: '#082F49',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  freezeDateNum: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    height: 16,
    color: '#BAE6FD',
    textAlign: 'center',
    includeFontPadding: false,
  },

  /* LOCKED / UPCOMING DAY */
  lockedDayName: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
    height: 14,
    color: '#71717A',
    marginBottom: 8,
    textAlign: 'center',
    includeFontPadding: false,
  },
  lockedCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#26262E',
    backgroundColor: '#0F0F12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lockedDateNum: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    height: 16,
    color: '#71717A',
    textAlign: 'center',
    includeFontPadding: false,
  },

  /* TODAY HIGHLIGHT CARD */
  todayCardContainer: {
    alignItems: 'center',
    flex: 1,
    marginTop: -10,
    paddingTop: 8,
    paddingBottom: 0,
    paddingHorizontal: 0,
    backgroundColor: '#151517',
    borderWidth: 1,
    borderColor: '#24242A',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 2,
  },
  todayDayName: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    lineHeight: 15,
    height: 15,
    color: '#FE5B01',
    letterSpacing: 0.6,
    marginBottom: 8,
    textAlign: 'center',
    includeFontPadding: false,
  },
  todayCircleNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FF7A1A',
    backgroundColor: '#151517',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    shadowColor: '#FE5B01',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  todayCircleInnerRim: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 230, 210, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDateNum: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    lineHeight: 16,
    height: 16,
    color: '#FFFFFF',
    marginBottom: 7,
    textAlign: 'center',
    includeFontPadding: false,
  },
  todayPillBadge: {
    backgroundColor: '#FE5B01',
    width: '100%',
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  todayPillText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.8,
    includeFontPadding: false,
  },

  /* BOTTOM CARD */
  bottomCard: {
    backgroundColor: '#141418',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#22222A',
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  bottomCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
    zIndex: 1,
    paddingRight: 20,
  },

  /* PROGRESS RING SECTION */
  progressRingSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ringWrapper: {
    marginRight: 6,
    position: 'relative',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInsideRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  progressTextColumn: {
    justifyContent: 'center',
  },
  fractionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  fractionCompleted: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  fractionTotal: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: '#71717A',
  },
  progressLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 8,
    color: '#71717A',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  verticalDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#26262E',
    marginHorizontal: 6,
  },

  /* ENCOURAGEMENT SECTION */
  encouragementSection: {
    flex: 1,
    paddingHorizontal: 6,
  },
  encouragementTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  encouragementSubtext: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: '#8E8E93',
  },
  orangeHighlightNumber: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: '#FE5B01',
  },

  /* CHARACTER IMAGE OVERLAY */
  characterImageWrapper: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 95,
    zIndex: 0,
    overflow: 'hidden',
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },

  /* SEGMENTED BAR */
  segmentedBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 1,
  },
  segmentBarItem: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
});

