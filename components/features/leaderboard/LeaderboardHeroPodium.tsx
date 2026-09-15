import React, { useEffect } from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Polygon,
  Stop,
} from 'react-native-svg';

import { fontFamilies } from '@/theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Local image asset
const LB_HERO_IMG = require('@/assets/images/lbimg.png');

export interface PodiumHunterData {
  id: string;
  rank: 1 | 2 | 3;
  displayName: string;
  score: number;
  level: number;
  avatarUrl?: string;
  quote?: string;
}

interface LeaderboardHeroPodiumProps {
  topHunters: PodiumHunterData[];
  onSelectHunter?: (hunter: PodiumHunterData) => void;
}

/* ==========================================================================
   METALLIC FACETED HEXAGON BADGE WITH WINGS & STAR
   ========================================================================== */
const FacetedHexagonBadge: React.FC<{ rank: 1 | 2 | 3 }> = ({ rank }) => {
  const isGold = rank === 1;
  const isSilver = rank === 2;

  const width = isGold ? 32 : 26;
  const height = isGold ? 34 : 28;

  const gradId = `faceted-badge-${rank}`;
  const stop1 = isGold ? '#FFFBEB' : isSilver ? '#FFFFFF' : '#FFEDD5';
  const stop2 = isGold ? '#F59E0B' : isSilver ? '#CBD5E1' : '#EA580C';
  const stop3 = isGold ? '#B45309' : isSilver ? '#64748B' : '#9A3412';
  const starColor = isGold ? '#FEF08A' : isSilver ? '#F8FAFC' : '#FED7AA';

  return (
    <View style={[styles.badgeContainer, { width, height }]}>
      {/* Top Star */}
      <View style={styles.starTopWrapper}>
        <Ionicons name="star" size={isGold ? 7.5 : 6} color={starColor} />
      </View>

      <Svg width={width} height={height} viewBox="0 0 42 44" fill="none">
        <Defs>
          <SvgLinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={stop1} />
            <Stop offset="45%" stopColor={stop2} />
            <Stop offset="100%" stopColor={stop3} />
          </SvgLinearGradient>
          <SvgLinearGradient id={`${gradId}-wing`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={stop2} />
            <Stop offset="100%" stopColor={stop3} />
          </SvgLinearGradient>
        </Defs>

        {/* Outer faceted wings */}
        <Path
          d="M7 14 L1 10 L4 22 L8 24 Z"
          fill={`url(#${gradId}-wing)`}
          opacity="0.9"
        />
        <Path
          d="M35 14 L41 10 L38 22 L34 24 Z"
          fill={`url(#${gradId}-wing)`}
          opacity="0.9"
        />

        {/* Main Hexagon Body */}
        <Polygon
          points="21,4 35,12 35,30 21,38 7,30 7,12"
          fill={`url(#${gradId})`}
          stroke={stop1}
          strokeWidth="1.2"
        />

        {/* Inner facet highlight line */}
        <Path
          d="M21 4 L21 38"
          stroke={stop1}
          strokeWidth="0.8"
          opacity="0.4"
        />
      </Svg>

      {/* Rank Number */}
      <Text
        style={[
          styles.badgeNumberText,
          isGold ? styles.badgeNumberGold : isSilver ? styles.badgeNumberSilver : styles.badgeNumberBronze,
        ]}
      >
        {rank}
      </Text>
    </View>
  );
};

/* ==========================================================================
   PEAKED CHEVRON CREST GLASS CARD COMPONENT
   ========================================================================== */
interface PeakedCardProps {
  rank: 1 | 2 | 3;
  width: number;
  height: number;
  children: React.ReactNode;
}

const PeakedGlassCard: React.FC<PeakedCardProps> = ({ rank, width, height, children }) => {
  const isGold = rank === 1;
  const isSilver = rank === 2;

  const peak = isGold ? 10 : 8;
  const radius = 12;

  const strokeGradId = `card-stroke-${rank}`;
  const fillGradId = `card-fill-${rank}`;

  const strokeTop = isGold ? '#F59E0B' : isSilver ? '#CBD5E1' : '#F97316';
  const strokeMid = isGold ? 'rgba(217, 119, 6, 0.45)' : isSilver ? 'rgba(148, 163, 184, 0.35)' : 'rgba(194, 65, 12, 0.35)';
  const strokeBot = 'rgba(255, 255, 255, 0.05)';

  const fillTop = isGold ? 'rgba(26, 19, 11, 0.88)' : isSilver ? 'rgba(14, 17, 24, 0.85)' : 'rgba(20, 15, 11, 0.85)';
  const fillBot = isGold ? 'rgba(11, 9, 7, 0.96)' : isSilver ? 'rgba(7, 9, 14, 0.95)' : 'rgba(9, 7, 6, 0.95)';

  const midX = width / 2;
  const pathD = `
    M ${radius},${peak} 
    Q 0,${peak} 0,${peak + radius}
    L 0,${height - radius}
    Q 0,${height} ${radius},${height}
    L ${width - radius},${height}
    Q ${width},${height} ${width},${height - radius}
    L ${width},${peak + radius}
    Q ${width},${peak} ${width - radius},${peak}
    L ${midX + 4},${2}
    Q ${midX},0 ${midX - 4},${2}
    Z
  `;

  return (
    <View style={[styles.peakedCardWrapper, { width, height }]}>
      {/* SVG Background Path with Peaked Roof & Glow Gradient */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <SvgLinearGradient id={strokeGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={strokeTop} />
            <Stop offset="40%" stopColor={strokeMid} />
            <Stop offset="100%" stopColor={strokeBot} />
          </SvgLinearGradient>
          <SvgLinearGradient id={fillGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={fillTop} />
            <Stop offset="100%" stopColor={fillBot} />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={pathD}
          fill={`url(#${fillGradId})`}
          stroke={`url(#${strokeGradId})`}
          strokeWidth={isGold ? 1.4 : 1.1}
        />
      </Svg>

      {/* Card Content */}
      <View style={[styles.peakedCardContent, { paddingTop: isGold ? 6 : 5 }]}>
        {children}
      </View>
    </View>
  );
};

/* ==========================================================================
   MAIN LEADERBOARD HERO PODIUM COMPONENT
   ========================================================================== */
export const LeaderboardHeroPodium: React.FC<LeaderboardHeroPodiumProps> = ({
  topHunters,
  onSelectHunter,
}) => {
  const crownFloat = useSharedValue(0);

  useEffect(() => {
    crownFloat.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1400 }),
        withTiming(0, { duration: 1400 })
      ),
      -1,
      true
    );
  }, [crownFloat]);

  const animatedCrownStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: crownFloat.value }],
  }));

  const rank1 = topHunters.find((h) => h.rank === 1) || {
    id: '1',
    rank: 1,
    displayName: 'ShadowRise',
    score: 237420,
    level: 28,
  };

  const rank2 = topHunters.find((h) => h.rank === 2) || {
    id: '2',
    rank: 2,
    displayName: 'Zenith',
    score: 229880,
    level: 26,
  };

  const rank3 = topHunters.find((h) => h.rank === 3) || {
    id: '3',
    rank: 3,
    displayName: 'Nova',
    score: 218540,
    level: 25,
  };

  const formatScore = (val: number) => {
    return val.toLocaleString('en-US');
  };

  // Card dimensions calculated based on screen width
  const cardGap = 8;
  const totalHorizontalPadding = 24;
  const availableWidth = SCREEN_WIDTH - totalHorizontalPadding - cardGap * 2;
  const sideCardWidth = Math.floor(availableWidth * 0.31);
  const centerCardWidth = Math.floor(availableWidth * 0.38);

  const centerCardHeight = 120;
  const leftCardHeight = 106;
  const rightCardHeight = 100;

  return (
    <View style={styles.container}>
      {/* HERO PANORAMIC BACKDROP: lbimg.png */}
      <View style={styles.heroBackdropArea} pointerEvents="none">
        <Image
          source={LB_HERO_IMG}
          style={styles.heroPanoramicImage}
          resizeMode="cover"
        />

        {/* Top fade into the dark status header */}
        <LinearGradient
          colors={['#07080B', 'rgba(7, 8, 11, 0.35)', 'transparent']}
          locations={[0, 0.2, 0.55]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Bottom smooth fade to black */}
        <LinearGradient
          colors={['transparent', 'rgba(7, 8, 11, 0.85)', '#07080B']}
          locations={[0, 0.65, 1]}
          style={styles.bottomHeroFade}
        />
      </View>

      {/* 3 PEAKED GLASS PODIUM CARDS */}
      <View style={styles.podiumCardsContainer}>
        {/* RANK 2 CARD: ZENITH (LEFT) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSelectHunter?.(rank2)}
          style={styles.podiumSlot}
        >
          <PeakedGlassCard rank={2} width={sideCardWidth} height={leftCardHeight}>
            {/* Hexagon Crest Badge #2 */}
            <FacetedHexagonBadge rank={2} />

            {/* Hunter Name */}
            <Text style={styles.hunterName} numberOfLines={1}>
              {rank2.displayName}
            </Text>

            {/* Flame & Score */}
            <View style={styles.scoreLine}>
              <Text style={styles.fireEmoji}>🔥</Text>
              <Text style={styles.scoreText}>{formatScore(rank2.score)}</Text>
            </View>

            {/* Level Pill */}
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>Lv. {rank2.level}</Text>
            </View>
          </PeakedGlassCard>
        </TouchableOpacity>

        {/* RANK 1 CARD: SHADOWRISE (CENTER - ELEVATED) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSelectHunter?.(rank1)}
          style={[styles.podiumSlot, styles.slotCenter]}
        >
          {/* Floating Crown above head */}
          <Animated.View style={[styles.floatingCrown, animatedCrownStyle]}>
            <Svg width={30} height={20} viewBox="0 0 40 28" fill="none">
              <Defs>
                <SvgLinearGradient id="goldCrownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#FEF08A" />
                  <Stop offset="45%" stopColor="#F59E0B" />
                  <Stop offset="100%" stopColor="#B45309" />
                </SvgLinearGradient>
              </Defs>
              <Path
                d="M4 23 L36 23 L38 7 L27 15 L20 2 L13 15 L2 7 Z"
                fill="url(#goldCrownGrad)"
                stroke="#FEF08A"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>

          <PeakedGlassCard rank={1} width={centerCardWidth} height={centerCardHeight}>
            {/* Hexagon Crest Badge #1 */}
            <FacetedHexagonBadge rank={1} />

            {/* Hunter Name */}
            <Text style={[styles.hunterName, styles.hunterNameCenter]} numberOfLines={1}>
              {rank1.displayName}
            </Text>

            {/* Flame & Score */}
            <View style={styles.scoreLine}>
              <Text style={styles.fireEmoji}>🔥</Text>
              <Text style={[styles.scoreText, styles.scoreTextCenter]}>
                {formatScore(rank1.score)}
              </Text>
            </View>

            {/* Level Pill */}
            <View style={[styles.levelPill, styles.levelPillCenter]}>
              <Text style={[styles.levelPillText, styles.levelPillTextCenter]}>
                Lv. {rank1.level}
              </Text>
            </View>
          </PeakedGlassCard>
        </TouchableOpacity>

        {/* RANK 3 CARD: NOVA (RIGHT) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSelectHunter?.(rank3)}
          style={styles.podiumSlot}
        >
          <PeakedGlassCard rank={3} width={sideCardWidth} height={rightCardHeight}>
            {/* Hexagon Crest Badge #3 */}
            <FacetedHexagonBadge rank={3} />

            {/* Hunter Name */}
            <Text style={styles.hunterName} numberOfLines={1}>
              {rank3.displayName}
            </Text>

            {/* Flame & Score */}
            <View style={styles.scoreLine}>
              <Text style={styles.fireEmoji}>🔥</Text>
              <Text style={styles.scoreText}>{formatScore(rank3.score)}</Text>
            </View>

            {/* Level Pill */}
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>Lv. {rank3.level}</Text>
            </View>
          </PeakedGlassCard>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 4,
    position: 'relative',
    height: 300,
  },
  heroBackdropArea: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  heroPanoramicImage: {
    width: '100%',
    height: '100%',
  },
  bottomHeroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },

  /* PODIUM CARDS ROW */
  podiumCardsContainer: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 8,
    zIndex: 20,
  },
  podiumSlot: {
    alignItems: 'center',
  },
  slotCenter: {
    zIndex: 10,
  },

  /* Floating Crown above #1 */
  floatingCrown: {
    marginBottom: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },

  /* Peaked Card Internal Layout */
  peakedCardWrapper: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  peakedCardContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },

  /* Badges */
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 2,
  },
  starTopWrapper: {
    position: 'absolute',
    top: -2,
    zIndex: 10,
  },
  badgeNumberText: {
    position: 'absolute',
    fontFamily: fontFamilies.bold,
    fontSize: 10.5,
    fontWeight: '900',
    top: 10,
    textAlign: 'center',
  },
  badgeNumberGold: {
    fontSize: 12,
    top: 11,
    color: '#291402',
  },
  badgeNumberSilver: {
    color: '#0F172A',
  },
  badgeNumberBronze: {
    color: '#2A1102',
  },

  /* Hunter Names */
  hunterName: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 1,
  },
  hunterNameCenter: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },

  /* Score Line */
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
    marginBottom: 4,
  },
  fireEmoji: {
    fontSize: 10.5,
  },
  scoreText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  scoreTextCenter: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Level Pills */
  levelPill: {
    backgroundColor: '#13151D',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#222634',
  },
  levelPillCenter: {
    backgroundColor: '#1E1711',
    borderColor: '#3D2A18',
  },
  levelPillText: {
    fontFamily: fontFamilies.bold,
    fontSize: 8.5,
    fontWeight: '700',
    color: '#8E95A5',
  },
  levelPillTextCenter: {
    color: '#CBD5E1',
    fontSize: 9,
  },
});
