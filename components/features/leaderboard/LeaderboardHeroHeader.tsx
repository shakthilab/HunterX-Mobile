import React from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { fontFamilies } from '@/theme/typography';

const LEADERBOARD_HERO_BG = require('@/assets/images/leaderboardone.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LeaderboardHeroHeaderProps {
  onInfoPress?: () => void;
}

export const LeaderboardHeroHeader: React.FC<LeaderboardHeroHeaderProps> = ({
  onInfoPress,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(tabs)');
    }
  };

  return (
    <View style={styles.headerContainer}>
      {/* Background Graphic: leaderboardone.png covering the hero */}
      <Image
        source={LEADERBOARD_HERO_BG}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Top subtle dark overlay for status bar readability */}
      <LinearGradient
        colors={['rgba(2, 2, 3, 0.85)', 'rgba(2, 2, 3, 0.3)', 'transparent']}
        locations={[0, 0.25, 0.45]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Bottom smooth fade to black content canvas */}
      <LinearGradient
        colors={['transparent', 'rgba(2, 2, 3, 0.75)', '#020203']}
        locations={[0.55, 0.85, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* TOP NAVIGATION ROW */}
      <View style={styles.topNavRow}>
        {/* Left: HunterX Brand Title + Tagline */}
        <View style={styles.brandBlock}>
          <View style={styles.brandRow}>
            <Text style={styles.brandHunter}>Hunter</Text>
            <Text style={styles.brandX}>X</Text>
          </View>
          <Text style={styles.brandSubtitle}>TRACK. IMPROVE. GO FURTHER.</Text>
        </View>

        {/* Right: Clean Question Mark (?) Button */}
        <TouchableOpacity
          style={styles.infoBtn}
          onPress={onInfoPress}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="help-circle-outline" size={28} color="#F4F5F6" />
        </TouchableOpacity>
      </View>

      {/* MIDDLE & BOTTOM SECTION */}
      <View style={styles.contentSection}>
        {/* Floating Stylized Red Handwritten Creed on Left Over Mountain Artwork */}
        <View style={styles.leftCreedCol}>
          <Text style={styles.creedHandwritten}>SAME</Text>
          <Text style={styles.creedHandwritten}>GOAL</Text>
          <Text style={styles.creedHandwritten}>HIGHER</Text>
          <Text style={styles.creedHandwritten}>HUMANS.</Text>
        </View>

        {/* Bottom Row: Large "Leaderboard" Title on Left + "DISCIPLINE BUILDS FREEDOM" on Right */}
        <View style={styles.bottomRow}>
          <Text style={styles.screenMainTitle}>Leaderboard</Text>

          {/* Right Pillar Words: DISCIPLINE BUILDS FREEDOM */}
          <View style={styles.creedPillarsCol}>
            <Text style={styles.creedPillarText}>DISCIPLINE</Text>
            <Text style={styles.creedPillarText}>BUILDS</Text>
            <Text style={styles.creedPillarText}>FREEDOM</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    height: 330,
    position: 'relative',
    justifyContent: 'space-between',
    paddingBottom: 8,
    backgroundColor: '#020203',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    zIndex: 20,
  },
  brandBlock: {
    alignItems: 'flex-start',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandHunter: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    fontWeight: '800',
    color: '#F4F5F6',
    letterSpacing: 0.2,
  },
  brandX: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    fontWeight: '900',
    color: '#F12730',
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 8,
    fontWeight: '800',
    color: '#8D98A3',
    letterSpacing: 1.2,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  infoBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Middle & Bottom Sections */
  contentSection: {
    paddingHorizontal: 18,
    paddingBottom: 4,
    zIndex: 15,
  },
  leftCreedCol: {
    alignSelf: 'flex-start',
    transform: [{ rotate: '-10deg' }],
    marginBottom: 16,
    marginLeft: 6,
  },
  creedHandwritten: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: '900',
    color: '#F12730',
    letterSpacing: 1,
    lineHeight: 18,
    textShadowColor: 'rgba(241, 39, 48, 0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  screenMainTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    fontWeight: '800',
    color: '#F4F5F6',
    letterSpacing: 0.2,
  },
  creedPillarsCol: {
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
  creedPillarText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    fontWeight: '800',
    color: '#8D98A3',
    letterSpacing: 1.2,
    lineHeight: 13,
    textTransform: 'uppercase',
  },
});

