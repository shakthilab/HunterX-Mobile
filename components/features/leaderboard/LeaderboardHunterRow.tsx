import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { fontFamilies } from '@/theme/typography';

import { getAvatarSource } from '@/components/profile/AvatarSelectionModal';

export interface LeaderboardHunter {
  id: string;
  rank: number;
  displayName: string;
  score: number;
  level: number;
  avatarUrl: string;
  quote: string;
  gender?: 'Male' | 'Female' | 'Other';
  isCurrentUser?: boolean;
}

interface LeaderboardHunterRowProps {
  hunter: LeaderboardHunter;
  onPress?: (hunter: LeaderboardHunter) => void;
}

export const LeaderboardHunterRow: React.FC<LeaderboardHunterRowProps> = ({
  hunter,
  onPress,
}) => {
  const formatScore = (val: number) => {
    return val.toLocaleString('en-US');
  };

  const isTop3 = hunter.rank >= 1 && hunter.rank <= 3;
  const isCurrentUser = hunter.isCurrentUser;

  // Themes for Top 3 Cards
  const getRankTheme = () => {
    if (hunter.rank === 1) {
      return {
        accent: '#F59E0B',
        border: 'rgba(245, 158, 11, 0.75)',
        shadow: '#F59E0B',
        gradient: ['rgba(217, 130, 15, 0.42)', 'rgba(80, 45, 10, 0.25)', '#0A0604', '#070402'] as const,
        glowGradient: ['rgba(245, 158, 11, 0.38)', 'rgba(245, 158, 11, 0.1)', 'transparent'] as const,
        levelBg: 'rgba(255, 255, 255, 0.04)',
        levelBorder: 'rgba(255, 255, 255, 0.18)',
        quoteColor: '#94A3B8',
        chevronColor: '#CBD5E1',
      };
    }
    if (hunter.rank === 2) {
      return {
        accent: '#CBD5E1',
        border: 'rgba(180, 200, 225, 0.65)',
        shadow: '#94A3B8',
        gradient: ['rgba(140, 175, 215, 0.38)', 'rgba(40, 60, 85, 0.22)', '#07090D', '#040508'] as const,
        glowGradient: ['rgba(180, 210, 245, 0.35)', 'rgba(180, 210, 245, 0.08)', 'transparent'] as const,
        levelBg: 'rgba(255, 255, 255, 0.04)',
        levelBorder: 'rgba(255, 255, 255, 0.18)',
        quoteColor: '#94A3B8',
        chevronColor: '#CBD5E1',
      };
    }
    if (hunter.rank === 3) {
      return {
        accent: '#D97706',
        border: 'rgba(217, 119, 6, 0.75)',
        shadow: '#D97706',
        gradient: ['rgba(217, 100, 15, 0.42)', 'rgba(85, 35, 10, 0.25)', '#090503', '#060302'] as const,
        glowGradient: ['rgba(234, 88, 12, 0.38)', 'rgba(217, 119, 6, 0.1)', 'transparent'] as const,
        levelBg: 'rgba(255, 255, 255, 0.04)',
        levelBorder: 'rgba(255, 255, 255, 0.18)',
        quoteColor: '#94A3B8',
        chevronColor: '#CBD5E1',
      };
    }
    return {
      accent: '#A1A1AA',
      border: 'rgba(255, 255, 255, 0.06)',
      shadow: 'transparent',
      gradient: ['#141418', '#101014', '#0B0B0E', 'transparent'] as const,
      glowGradient: ['transparent', 'transparent', 'transparent'] as const,
      levelBg: '#16161A',
      levelBorder: '#242428',
      quoteColor: '#71717A',
      chevronColor: '#71717A',
    };
  };

  const rankTheme = getRankTheme();

  // 1. CURRENT USER HIGHLIGHTED CARD (Rank 12)
  if (isCurrentUser) {
    const CardContent = (
      <LinearGradient
        colors={['rgba(180, 18, 30, 0.48)', 'rgba(80, 10, 18, 0.25)', '#0A0407', '#050204']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.currentUserCard}
      >
        {/* Left Atmospheric Ambient Glow Overlay */}
        <LinearGradient
          colors={['rgba(239, 68, 68, 0.42)', 'rgba(239, 68, 68, 0.1)', 'transparent']}
          start={{ x: 0, y: 0.1 }}
          end={{ x: 0.6, y: 0.9 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Rank Number (Italic Warm Gold) */}
        <View style={styles.rankCol}>
          <Text style={styles.currentUserRankText}>{hunter.rank}</Text>
        </View>

        {/* Avatar with Gold Glowing Ring */}
        <View style={styles.avatarCol}>
          <Image
            source={getAvatarSource(hunter.avatarUrl)}
            style={[styles.avatarImage, styles.currentUserAvatarBorder]}
            resizeMode="cover"
          />
        </View>

        {/* Name & Score */}
        <View style={styles.hunterInfoCol}>
          <Text style={styles.currentUserDisplayNameText} numberOfLines={1}>
            {hunter.displayName}
          </Text>
          <View style={styles.scoreRow}>
            <Text style={styles.fireIcon}>🔥</Text>
            <Text style={styles.currentUserScoreText}>{formatScore(hunter.score)}</Text>
          </View>
        </View>

        {/* Level Pill */}
        <View style={styles.levelCol}>
          <View style={styles.currentUserLevelPill}>
            <Text style={styles.currentUserLevelText} numberOfLines={1}>
              Lv. {hunter.level}
            </Text>
          </View>
        </View>

        {/* Quote / Tagline (Red "KEEP HUNTING") */}
        <View style={styles.quoteCol}>
          <Text style={styles.currentUserQuoteText} numberOfLines={2}>
            {hunter.quote || 'KEEP\nHUNTING'}
          </Text>
        </View>

        {/* Chevron (Clean White) */}
        <View style={styles.chevronCol}>
          <Ionicons name="chevron-forward" size={19} color="#FFFFFF" />
        </View>
      </LinearGradient>
    );

    if (onPress) {
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onPress(hunter)}
          style={styles.cardWrapper}
        >
          {CardContent}
        </TouchableOpacity>
      );
    }

    return <View style={styles.cardWrapper}>{CardContent}</View>;
  }

  // 2. TOP 3 FEATURED CARDS (Ranks 1, 2, 3)
  if (isTop3) {
    const Top3Content = (
      <LinearGradient
        colors={rankTheme.gradient}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          styles.top3Card,
          {
            borderColor: rankTheme.border,
            shadowColor: rankTheme.shadow,
          },
        ]}
      >
        {/* Left Atmospheric Ambient Glow Overlay */}
        <LinearGradient
          colors={rankTheme.glowGradient}
          start={{ x: 0, y: 0.1 }}
          end={{ x: 0.6, y: 0.9 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Crown + Rank Number Column */}
        <View style={styles.rankCol}>
          <FontAwesome5 name="crown" size={15} color={rankTheme.accent} />
          <Text style={[styles.topRankText, { color: rankTheme.accent }]}>
            {hunter.rank}
          </Text>
        </View>

        {/* Avatar with colored glowing border */}
        <View style={styles.avatarCol}>
          <Image
            source={getAvatarSource(hunter.avatarUrl)}
            style={[
              styles.avatarImage,
              { borderColor: rankTheme.accent, borderWidth: 1.8 },
            ]}
            resizeMode="cover"
          />
        </View>

        {/* Name & Score */}
        <View style={styles.hunterInfoCol}>
          <Text style={styles.displayNameText} numberOfLines={1}>
            {hunter.displayName}
          </Text>
          <View style={styles.scoreRow}>
            <Text style={styles.fireIcon}>🔥</Text>
            <Text style={styles.top3ScoreText}>{formatScore(hunter.score)}</Text>
          </View>
        </View>

        {/* Level Pill */}
        <View style={styles.levelCol}>
          <View style={[styles.levelPill, { backgroundColor: rankTheme.levelBg, borderColor: rankTheme.levelBorder }]}>
            <Text style={styles.top3LevelText}>Lv. {hunter.level}</Text>
          </View>
        </View>

        {/* Quote / Slogan */}
        <View style={styles.quoteCol}>
          <Text
            style={[styles.quoteText, { color: rankTheme.quoteColor }]}
            numberOfLines={2}
          >
            {hunter.quote}
          </Text>
        </View>

        {/* Chevron (Right Forward Arrow) */}
        <View style={styles.chevronCol}>
          <Ionicons name="chevron-forward" size={19} color={rankTheme.chevronColor} />
        </View>
      </LinearGradient>
    );

    if (onPress) {
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onPress(hunter)}
          style={styles.cardWrapper}
        >
          {Top3Content}
        </TouchableOpacity>
      );
    }

    return <View style={styles.cardWrapper}>{Top3Content}</View>;
  }

  // 3. REGULAR HUNTER ROWS (Ranks 4 - 10+)
  const RowContent = (
    <View style={styles.regularRowContainer}>
      {/* Rank Number */}
      <View style={styles.rankCol}>
        <Text style={styles.regularRankText}>{hunter.rank}</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarCol}>
        <Image
          source={getAvatarSource(hunter.avatarUrl)}
          style={styles.avatarImage}
          resizeMode="cover"
        />
      </View>

      {/* Name & Score */}
      <View style={styles.hunterInfoCol}>
        <Text style={styles.displayNameText} numberOfLines={1}>
          {hunter.displayName}
        </Text>
        <View style={styles.scoreRow}>
          <Text style={styles.fireIcon}>🔥</Text>
          <Text style={styles.scoreText}>{formatScore(hunter.score)}</Text>
        </View>
      </View>

      {/* Level Pill */}
      <View style={styles.levelCol}>
        <View style={styles.levelPill}>
          <Text style={styles.levelText}>Lv. {hunter.level}</Text>
        </View>
      </View>

      {/* Quote */}
      <View style={styles.quoteCol}>
        <Text style={styles.quoteText} numberOfLines={2}>
          {hunter.quote}
        </Text>
      </View>

      {/* Chevron */}
      <View style={styles.chevronCol}>
        <Ionicons name="chevron-forward" size={18} color="#71717A" />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => onPress(hunter)}
      >
        {RowContent}
      </TouchableOpacity>
    );
  }

  return RowContent;
};

const styles = StyleSheet.create({
  /* CARD WRAPPER (TOP 3 & CURRENT USER) */
  cardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  top3Card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  currentUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },

  /* REGULAR ROW CONTAINER */
  regularRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 28,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },

  /* UNIFORM GRID COLUMNS */
  rankCol: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    gap: 3,
  },
  topRankText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13.5,
    fontWeight: '900',
  },
  regularRankText: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#A1A1AA',
  },
  currentUserRankText: {
    fontFamily: fontFamilies.boldItalic,
    fontSize: 19,
    fontWeight: '900',
    color: '#F59E0B',
    fontStyle: 'italic',
    textShadowColor: 'rgba(245, 158, 11, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  /* AVATAR COLUMN */
  avatarCol: {
    width: 44,
    height: 44,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#242428',
    backgroundColor: '#16161A',
  },
  currentUserAvatarBorder: {
    borderColor: '#F59E0B',
    borderWidth: 1.8,
  },

  /* HUNTER INFO COLUMN (NAME + SCORE) */
  hunterInfoCol: {
    width: 98,
    justifyContent: 'center',
  },
  displayNameText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  currentUserDisplayNameText: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  fireIcon: {
    fontSize: 11,
  },
  scoreText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#E4E4E7',
    letterSpacing: 0.2,
  },
  top3ScoreText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  currentUserScoreText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  /* LEVEL PILL COLUMN */
  levelCol: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  levelPill: {
    backgroundColor: '#16161A',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#242428',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentUserLevelPill: {
    backgroundColor: 'rgba(25, 12, 16, 0.75)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  top3LevelText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  currentUserLevelText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11.5,
    color: '#E4E4E7',
    fontWeight: '600',
  },

  /* QUOTE COLUMN */
  quoteCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  quoteText: {
    fontFamily: fontFamilies.bold,
    fontSize: 8,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 0.5,
    lineHeight: 11,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  currentUserQuoteText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.7,
    lineHeight: 12,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  /* CHEVRON COLUMN */
  chevronCol: {
    width: 20,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});


