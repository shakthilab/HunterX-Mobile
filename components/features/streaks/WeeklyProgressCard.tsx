import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

import { fontFamilies } from '@/theme/typography';
import { getAvatarSource } from '@/components/profile/AvatarSelectionModal';
import { CLOUDINARY_ASSETS } from '@/constants/cloudinaryAssets';
import { DEFAULT_BLURHASH, optimizeCloudinaryUrl } from '@/services/media/cloudinary';
import type { WeekStatus } from '@/types/user';
import { DayTrackerItem, generateWeekDaysFromWeekStatus } from './WeeklyTracker';

export interface WeeklyProgressCardProps {
  days?: DayTrackerItem[];
  weekStatus?: WeekStatus | null;
  completedDaysCount?: number;
  totalDaysCount?: number;
  characterImageSource?: any;
  avatarUrl?: string | null;
  avatarId?: string | number | null;
}

const DEFAULT_CHARACTER_IMAGE = CLOUDINARY_ASSETS.high_fidelity;

export function WeeklyProgressCard({
  days,
  weekStatus,
  completedDaysCount,
  totalDaysCount = 7,
  characterImageSource = DEFAULT_CHARACTER_IMAGE,
  avatarUrl,
  avatarId,
}: WeeklyProgressCardProps) {
  const activeDays = useMemo(() => {
    if (days && days.length > 0) return days;
    return generateWeekDaysFromWeekStatus(weekStatus, completedDaysCount);
  }, [days, weekStatus, completedDaysCount]);

  const completedCount = useMemo(() => {
    if (completedDaysCount !== undefined) return completedDaysCount;
    return activeDays.filter((d) => d.status === 'completed' || (d.isToday && d.isDone)).length;
  }, [completedDaysCount, activeDays]);

  const rawImageSource =
    typeof characterImageSource === 'string' ? { uri: characterImageSource } : characterImageSource;
  // A local require() asset comes through as a plain number, not an object —
  // only rewrite the URL when there's actually a remote uri to optimize.
  const imageSource =
    rawImageSource && typeof rawImageSource === 'object' && typeof rawImageSource.uri === 'string'
      ? { uri: optimizeCloudinaryUrl(rawImageSource.uri, 500) }
      : rawImageSource;

  const radius = 20;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalDaysCount > 0 ? completedCount / totalDaysCount : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <View style={styles.bottomCard}>
      {/* Full-Height Right Overlay Character Image */}
      <View style={styles.characterImageWrapper} pointerEvents="none">
        <ExpoImage
          source={imageSource}
          style={styles.characterImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={{ blurhash: DEFAULT_BLURHASH }}
          transition={150}
        />
        {/* Left-to-right gradient fade for seamless background integration */}
        <LinearGradient
          colors={['#141418', 'rgba(20, 20, 24, 0.75)', 'rgba(20, 20, 24, 0.2)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 0.75, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Top and bottom edge soft fade */}
        <LinearGradient
          colors={['rgba(20, 20, 24, 0.6)', 'transparent', 'transparent', 'rgba(20, 20, 24, 0.7)']}
          locations={[0, 0.2, 0.8, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <View style={styles.bottomCardContent}>
        {/* Circular Progress & Completed Days */}
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
              source={getAvatarSource(avatarUrl, avatarId)}
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

        {/* Middle Encouragement Text */}
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

      {/* BOTTOM SEGMENTED PROGRESS BAR */}
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
  );
}

const styles = StyleSheet.create({
  bottomCard: {
    backgroundColor: '#141418',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#22222A',
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 12,
    width: '100%',
  },
  bottomCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
    zIndex: 1,
    paddingRight: 20,
  },
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
    letterSpacing: 0.3,
    marginTop: 1,
  },
  verticalDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#26262E',
    marginHorizontal: 6,
  },
  encouragementSection: {
    flex: 1,
    paddingHorizontal: 4,
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
