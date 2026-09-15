import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { fontFamilies } from '@/theme/typography';

const LEADER_DOWNS_IMG = require('@/assets/images/leaderdowns.png');

export const LeaderboardMotivationBanner: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Mountain Horizon Background Layer: leaderdowns.png */}
      <View style={styles.mountainBackdropWrapper} pointerEvents="none">
        <Image
          source={LEADER_DOWNS_IMG}
          style={styles.mountainImage}
          resizeMode="cover"
        />
        {/* Top smooth fade from black rankings list into glowing mountain peaks */}
        <LinearGradient
          colors={['#07080B', 'rgba(7, 8, 11, 0.65)', 'rgba(7, 8, 11, 0.1)', 'transparent']}
          locations={[0, 0.25, 0.6, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* Floating Dark Glassmorphic Card */}
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={['rgba(20, 23, 33, 0.9)', 'rgba(12, 14, 20, 0.94)', 'rgba(8, 9, 13, 0.97)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glassCard}
        >
          {/* Left Text Content */}
          <View style={styles.textContainer}>
            <Text style={styles.titleText}>Every Step Counts</Text>
            <Text style={styles.subtitleText}>
              No matter where you are, you're moving forward. Keep hunting!
            </Text>
          </View>

          {/* Right Red Hunter "X" Logo Slash */}
          <View style={styles.xLogoContainer}>
            <Svg width={46} height={46} viewBox="0 0 100 100" fill="none">
              {/* Red brush slash stroke 1 */}
              <Path
                d="M18 16 L82 84 M12 24 L76 92"
                stroke="#991B1B"
                strokeWidth="13"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M18 16 L82 84"
                stroke="#DC2626"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M32 30 L68 70"
                stroke="#EF4444"
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* Red brush slash stroke 2 */}
              <Path
                d="M82 16 L18 84 M88 24 L24 92"
                stroke="#991B1B"
                strokeWidth="13"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M82 16 L18 84"
                stroke="#E5383B"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M68 30 L32 70"
                stroke="#FCA5A5"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </Svg>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    marginTop: 12,
    marginBottom: 24,
    minHeight: 180,
    justifyContent: 'flex-end',
  },
  mountainBackdropWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  mountainImage: {
    width: '100%',
    height: '100%',
  },
  cardContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(38, 42, 56, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  titleText: {
    fontFamily: fontFamilies.bold,
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subtitleText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16.5,
  },
  xLogoContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
});
