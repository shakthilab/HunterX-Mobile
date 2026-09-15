import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { fontFamilies } from '@/theme/typography';

interface LeaderboardCommunityCardProps {
  onPress?: () => void;
}

export const LeaderboardCommunityCard: React.FC<LeaderboardCommunityCardProps> = ({
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.container}
    >
      <LinearGradient
        colors={['#090506', '#1C0B0D', '#3E0D10']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Inner Subtle Glow Overlay (#9A1E25 @ ~25% opacity) */}
        <LinearGradient
          colors={['rgba(154, 30, 37, 0.25)', 'transparent', 'rgba(154, 30, 37, 0.25)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Left Glowing Crest Emblem Badge */}
        <View style={styles.emblemWrapper}>
          <Svg width={54} height={54} viewBox="0 0 54 54" fill="none">
            {/* Circle Glow Backing (#F12730 @ 30% opacity) */}
            <Circle cx={27} cy={27} r={24} fill="rgba(241, 39, 48, 0.30)" />

            {/* Subtle Diamond/Notch Geometric Accent Lines */}
            <Path
              d="M27 3 L51 27 L27 51 L3 27 Z"
              stroke="rgba(215, 52, 60, 0.35)"
              strokeWidth={1}
            />

            {/* Trophy Circle Border (#D7343C) */}
            <Circle
              cx={27}
              cy={27}
              r={23}
              stroke="#D7343C"
              strokeWidth={1.6}
            />

            {/* Bottom Notch Point (#D7343C) */}
            <Path
              d="M25 50 L27 52.5 L29 50"
              stroke="#D7343C"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Gold Trophy Cup (#F0A459) */}
            <Path
              d="M21 11 H33 V18 C33 21.2 30.3 23.8 27 23.8 C23.7 23.8 21 21.2 21 18 V11 Z"
              fill="#F0A459"
            />
            {/* Trophy Inner Diamond */}
            <Path
              d="M27 15 L29 17.5 L27 20 L25 17.5 Z"
              fill="#D7343C"
            />
            {/* Trophy Left Handle (#F0A459) */}
            <Path
              d="M21 12.5 H18 C16.8 12.5 16 13.3 16 14.5 V15.5 C16 17 17.2 18.2 18.8 18.2 H21"
              stroke="#F0A459"
              strokeWidth={1.3}
              strokeLinecap="round"
            />
            {/* Trophy Right Handle (#F0A459) */}
            <Path
              d="M33 12.5 H36 C37.2 12.5 38 13.3 38 14.5 V15.5 C38 17 36.8 18.2 35.2 18.2 H33"
              stroke="#F0A459"
              strokeWidth={1.3}
              strokeLinecap="round"
            />
            {/* Trophy Stem & Pedestal (#F0A459) */}
            <Path d="M25 23.8 V26.5 H29 V23.8" stroke="#F0A459" strokeWidth={1.3} />
            <Path d="M22 26.5 H32" stroke="#F0A459" strokeWidth={1.6} strokeLinecap="round" />

            {/* 3 Red Growth Bars (Left, Center, Right) */}
            <Rect x={19.5} y={34} width={4.2} height={8.5} rx={1.2} fill="#F12730" />
            <Rect x={24.9} y={29.5} width={4.2} height={13} rx={1.2} fill="#F12730" />
            <Rect x={30.3} y={33} width={4.2} height={9.5} rx={1.2} fill="#F12730" />
          </Svg>
        </View>

        {/* Center Text Info */}
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={styles.titleWhite}>You </Text>
            <Text style={styles.titleDot}>• </Text>
            <Text style={styles.titleRed}>Top 5%</Text>
          </View>
          <Text style={styles.subtitleText}>
            See how you compare and what{'\n'}keeps you ahead.
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F12730',
    shadowColor: '#F12730',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 15,
    elevation: 6,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#090506',
  },
  emblemWrapper: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textCol: {
    flex: 1,
    paddingRight: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  titleWhite: {
    fontFamily: fontFamilies.bold,
    fontSize: 16.5,
    fontWeight: '800',
    color: '#F0F0F0',
    letterSpacing: 0.2,
  },
  titleDot: {
    fontFamily: fontFamilies.bold,
    fontSize: 16.5,
    fontWeight: '800',
    color: '#F0F0F0',
  },
  titleRed: {
    fontFamily: fontFamilies.bold,
    fontSize: 16.5,
    fontWeight: '800',
    color: '#F12730',
    letterSpacing: 0.2,
  },
  subtitleText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12.5,
    color: '#B8B5B7',
    lineHeight: 17.5,
  },
  chevronCol: {
    width: 22,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});


