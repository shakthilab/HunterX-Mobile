import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { QuestItem } from '@/app/(tabs)/index';
import { fontFamilies } from '@/theme/typography';
import { CLOUDINARY_ASSETS } from '@/constants/cloudinaryAssets';
import { optimizeCloudinaryUrl } from '@/services/media/cloudinary';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONTENT_DELAY = 450;

// 20 Looping Ember particles for background ambient effect
const PARTICLE_COUNT = 18;
const PARTICLES = Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
  id: i,
  startX: Math.random() * (SCREEN_WIDTH - 40) + 20,
  size: Math.random() * 5 + 3,
  duration: Math.random() * 3500 + 3500,
  delay: Math.random() * 2000,
  opacity: Math.random() * 0.4 + 0.3,
}));

function EmberParticle({
  startX,
  size,
  duration,
  delay,
  opacity: baseOpacity,
}: (typeof PARTICLES)[0]) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      translateY.value = 0;
      opacity.value = 0;

      opacity.value = withDelay(
        delay,
        withSequence(
          withTiming(baseOpacity, { duration: 600 }),
          withTiming(baseOpacity, { duration: duration - 1200 }),
          withTiming(0, { duration: 600 })
        )
      );

      translateY.value = withDelay(
        delay,
        withTiming(-SCREEN_HEIGHT * 0.45, {
          duration,
          easing: Easing.linear,
        })
      );
    };

    animate();
    const interval = setInterval(animate, duration + delay + 200);
    return () => clearInterval(interval);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.emberParticle,
        {
          left: startX,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        animStyle,
      ]}
    />
  );
}

interface TaskRowAnimatedProps {
  quest: QuestItem;
  index: number;
}

function TaskRowAnimated({ quest, index }: TaskRowAnimatedProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    const delayTime = CONTENT_DELAY + 150 + index * 40;
    opacity.value = withDelay(
      delayTime,
      withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })
    );
    translateY.value = withDelay(
      delayTime,
      withTiming(0, { duration: 200, easing: Easing.out(Easing.back(1)) })
    );
  }, [index]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const isCompleted = quest.status === 'done' || quest.status === 'partial';

  return (
    <Animated.View style={[styles.taskRow, rowStyle]}>
      <View style={styles.rowLeftGroup}>
        {isCompleted ? (
          <View style={styles.checkIconCircle}>
            <Ionicons name="checkmark" size={12} color="#FFA726" />
          </View>
        ) : (
          <View style={styles.pendingIconSquare}>
            <Ionicons name="square-outline" size={13} color="#FFA726" />
          </View>
        )}
        <View style={styles.verticalDivider} />
        <Text style={styles.taskTitleText} numberOfLines={1}>
          {quest.title}
        </Text>
      </View>

      <View style={styles.rowRightGroup}>
        <Text style={styles.taskXpText}>
          +{quest.earnedXp ?? quest.xpReward} XP
        </Text>
        <Ionicons name="chevron-forward" size={14} color="#666666" />
      </View>
    </Animated.View>
  );
}

export interface DayCompleteScreenProps {
  quests: QuestItem[];
  onContinue: () => void;
}

export function DayCompleteScreen({ quests, onContinue }: DayCompleteScreenProps) {
  const questsToDisplay = quests && quests.length > 0 ? quests : [];
  const completedQuests = questsToDisplay.filter(
    (q) => q.status === 'done' || q.status === 'partial'
  );
  const totalXpEarned = completedQuests.reduce(
    (sum, q) => sum + (q.earnedXp ?? q.xpReward),
    0
  );

  // Animated state values for sequence choreography
  const screenFade = useSharedValue(0);
  const heroScale = useSharedValue(0.94);
  const heroOpacity = useSharedValue(0);
  const headlineTranslateY = useSharedValue(24);
  const headlineOpacity = useSharedValue(0);

  const cardTranslateY = useSharedValue(30);
  const cardOpacity = useSharedValue(0);

  const continueScale = useSharedValue(0);
  const shareScale = useSharedValue(0);
  const shareOpacity = useSharedValue(0);

  // XP Ticking Counter state
  const [displayedXp, setDisplayedXp] = useState(0);

  // Date formatting
  const dateFormatted = React.useMemo(() => {
    const now = new Date();
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    return `${days[now.getDay() === 0 ? 6 : now.getDay() - 1]} • ${months[now.getMonth()]
      } ${now.getDate()}`;
  }, []);

  useEffect(() => {
    // 1. Screen fade in & background appearance (0 - 200ms)
    screenFade.value = withTiming(1, { duration: 150 });
    heroOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
    heroScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });

    // Headline block slide up + fade in
    headlineOpacity.value = withDelay(
      CONTENT_DELAY,
      withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) })
    );
    headlineTranslateY.value = withDelay(
      CONTENT_DELAY,
      withTiming(0, { duration: 250, easing: Easing.out(Easing.back(1)) })
    );

    // Card Container appearance
    cardOpacity.value = withDelay(
      CONTENT_DELAY + 50,
      withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) })
    );
    cardTranslateY.value = withDelay(
      CONTENT_DELAY + 50,
      withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) })
    );

    // Fast XP Counter Ticking over 250ms
    const startXpTick = () => {
      let current = 0;
      const target = totalXpEarned || 150;
      const stepTime = 15;
      const steps = 15;
      const increment = Math.ceil(target / steps);

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setDisplayedXp(target);
          clearInterval(timer);
        } else {
          setDisplayedXp(current);
        }
      }, stepTime);
    };

    const xpTimer = setTimeout(startXpTick, CONTENT_DELAY + 100);

    // 2 small buttons spring entrance animations
    const buttonDelay = CONTENT_DELAY + 150 + questsToDisplay.length * 40 + 40;
    continueScale.value = withDelay(
      buttonDelay,
      withSpring(1, { damping: 13, stiffness: 140 })
    );
    shareScale.value = withDelay(
      buttonDelay + 50,
      withSpring(1, { damping: 13, stiffness: 140 })
    );
    shareOpacity.value = withDelay(
      buttonDelay + 50,
      withTiming(1, { duration: 200 })
    );

    return () => clearTimeout(xpTimer);
  }, [questsToDisplay.length, totalXpEarned]);

  const handleContinuePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onContinue();
  };

  const handleSharePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const taskListText = completedQuests
        .map((q) => `  ✅ ${q.title} (+${q.earnedXp ?? q.xpReward} XP)`)
        .join('\n');

      const shareMessage = `🏆 *PERFECT DAY CLEAR - HUNTERX* ⚡\n\n📅 *${dateFormatted}*\n🔥 *All ${completedQuests.length} Quests Cleared (+${totalXpEarned} XP!)*\n\n*Completed Quests:*\n${taskListText}\n\n_Every task. Zero skips. Rise, Hunter!_ ⚔️`;

      await Share.share(
        {
          message: shareMessage,
          title: 'HunterX Perfect Day Clear',
        },
        {
          dialogTitle: 'Share HunterX Achievement',
          subject: 'HunterX Perfect Day Clear!',
        }
      );
    } catch (e) {
      console.log('Share dismissed or error:', e);
    }
  };

  const screenAnimStyle = useAnimatedStyle(() => ({
    opacity: screenFade.value,
  }));

  const headlineAnimStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineTranslateY.value }],
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const continueAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continueScale.value }],
  }));

  const shareAnimStyle = useAnimatedStyle(() => ({
    opacity: shareOpacity.value,
    transform: [{ scale: shareScale.value }],
  }));

  return (
    <Modal
      animationType="fade"
      transparent={false}
      visible={true}
      onRequestClose={onContinue}
    >
      <Animated.View style={[styles.screenContainer, screenAnimStyle]}>
        {/* Top Left Close Button */}
        <TouchableOpacity
          style={styles.topLeftCloseBtn}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onContinue();
          }}
        >
          <Ionicons name="close" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* FULL BLEED ANIME BACKGROUND IMAGE */}
        <View style={StyleSheet.absoluteFillObject}>
          <ExpoImage
            source={{ uri: optimizeCloudinaryUrl(CLOUDINARY_ASSETS.popupsavatar.uri, 1200) }}
            placeholder={{ uri: optimizeCloudinaryUrl(CLOUDINARY_ASSETS.active_campaign_bg.uri, 1200) }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
          <LinearGradient
            colors={['rgba(10,10,10,0.3)', 'rgba(10,10,10,0.65)']}
            style={StyleSheet.absoluteFillObject}
          />
        </View>

        {/* Background Ember Particles */}
        <View style={styles.particleContainer} pointerEvents="none">
          {PARTICLES.map((p) => (
            <EmberParticle key={p.id} {...p} />
          ))}
        </View>

        {/* CENTER FLOATING CONTENT AREA */}
        <View style={styles.centerContainer}>
          {/* Headline Block (Animate entrance and display ticking XP) */}
          <Animated.View style={[styles.headlineBlock, headlineAnimStyle]}>
            <Text style={styles.headlineTitle}>MISSION CLEAR</Text>
            <Text style={styles.headlineSubtext}>
              YOU EARNED <Text style={styles.amberXpHighlight}>+{displayedXp} XP</Text> TODAY
            </Text>
          </Animated.View>

          <Animated.View style={[styles.centerCard, cardAnimStyle]}>
            {/* Card Header Info Row */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.dateGroup}>
                <View style={styles.calendarSquare}>
                  <Ionicons name="calendar-outline" size={14} color="#FFA726" />
                </View>
                <Text style={styles.dateText}>{dateFormatted}</Text>
              </View>

              {/* HunterX Counter Badge */}
              <View style={styles.lifeResetCard}>
                <View style={styles.lifeResetHeader}>
                  <Ionicons name="flash" size={10} color="#FFA726" />
                  <Text style={styles.lifeResetLabel}>HunterX</Text>
                </View>
                <Text style={styles.lifeResetDays}>9</Text>
                <Text style={styles.lifeResetSubtext}>DAYS LEFT</Text>
              </View>
            </View>

            {/* PERFECT DAY Title */}
            <View style={styles.perfectDayTitleRow}>
              <Text style={styles.perfectDayText}>PERFECT DAY!</Text>
              <Text style={styles.accentSparkles}>`/\`</Text>
            </View>
            <Text style={styles.perfectDaySubtext}>Every task. Zero skips.</Text>

            {/* Progress Bar Header */}
            <View style={styles.progressHeaderRow}>
              <Ionicons name="checkmark-circle" size={16} color="#FFA726" />
              <Text style={styles.progressText}>
                {completedQuests.length} TASKS COMPLETED
              </Text>
              <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
              </View>
            </View>

            {/* Staggered Task Rows List */}
            <View style={styles.taskListContainer}>
              {questsToDisplay.map((quest, idx) => (
                <TaskRowAnimated
                  key={quest.id}
                  quest={quest}
                  index={idx}
                />
              ))}
            </View>
          </Animated.View>
        </View>

        {/* BOTTOM ACTION ROW — TWO ANIMATED BUTTONS */}
        <View style={styles.bottomActionsRowContainer}>
          <View style={styles.bottomActionsRow}>
            {/* CONTINUE BUTTON (Primary - Animated) */}
            <Animated.View style={[{ flex: 1 }, continueAnimStyle]}>
              <Pressable
                style={styles.primaryContinueBtn}
                onPress={handleContinuePress}
              >
                <Text style={styles.primaryContinueText}>CONTINUE</Text>
                <Ionicons name="arrow-forward" size={16} color="#0A0A0A" />
              </Pressable>
            </Animated.View>

            {/* SHARE BUTTON (Secondary - Animated) */}
            <Animated.View style={[{ flex: 1 }, shareAnimStyle]}>
              <Pressable
                style={styles.secondaryShareBtn}
                onPress={handleSharePress}
              >
                <Ionicons name="share-outline" size={16} color="#FFA726" />
                <Text style={styles.secondaryShareText}>SHARE</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    position: 'relative',
  },
  topLeftCloseBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1E1E22',
    borderWidth: 1,
    borderColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },

  /* Particle Overlay */
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  emberParticle: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: '#FFA726',
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },

  /* Center Floating Content */
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  centerCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(15, 15, 18, 0.88)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.18)',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
  },

  /* Headline Block */
  headlineBlock: {
    alignItems: 'center',
    marginBottom: 12,
  },
  headlineTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  headlineSubtext: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: '#888888',
    marginTop: 2,
  },
  amberXpHighlight: {
    fontFamily: fontFamilies.bold,
    color: '#FFA726',
  },

  /* Card Header Info Row */
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarSquare: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 167, 38, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#FFA726',
    letterSpacing: 0.8,
  },

  /* Life Reset / HunterX Square Badge */
  lifeResetCard: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 167, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.25)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  lifeResetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  lifeResetLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 6.5,
    color: '#888888',
    letterSpacing: 0.4,
  },
  lifeResetDays: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    color: '#FFA726',
    lineHeight: 18,
  },
  lifeResetSubtext: {
    fontFamily: fontFamilies.bold,
    fontSize: 6,
    color: '#888888',
    letterSpacing: 0.4,
  },

  /* Perfect Day Title */
  perfectDayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -2,
  },
  perfectDayText: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  accentSparkles: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: '#FFA726',
    marginLeft: 4,
  },
  perfectDaySubtext: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: '#888888',
    marginBottom: 10,
  },

  /* Progress Header Row */
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  progressText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#CCCCCC',
    letterSpacing: 0.8,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: '#262626',
    borderRadius: 2,
    overflow: 'hidden',
    marginLeft: 4,
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFA726',
    borderRadius: 2,
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },

  /* Task List */
  taskListContainer: {
    gap: 6,
  },
  taskRow: {
    backgroundColor: '#18181C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#26262A',
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  checkIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#FFA726',
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIconSquare: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFA726',
    backgroundColor: 'rgba(255, 167, 38, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#2E2E2E',
    marginHorizontal: 6,
  },
  iconSquare: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#242428',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  taskTitleText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: '#FFFFFF',
    flex: 1,
  },
  rowRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskXpText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: '#FFA726',
  },

  /* Bottom Actions Container */
  bottomActionsRowContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 340,
  },
  primaryContinueBtn: {
    backgroundColor: '#FFA726',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 4,
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  primaryContinueText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: '#0A0A0A',
    letterSpacing: 0.8,
  },
  secondaryShareBtn: {
    borderWidth: 1.5,
    borderColor: '#FFA726',
    backgroundColor: 'rgba(10, 10, 10, 0.6)',
    borderRadius: 24,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryShareText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: '#FFA726',
    letterSpacing: 0.8,
  },
});
