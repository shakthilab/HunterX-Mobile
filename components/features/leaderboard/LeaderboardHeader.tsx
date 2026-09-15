import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { fontFamilies } from '@/theme/typography';

interface LeaderboardHeaderProps {
  title?: string;
  onInfoPress?: () => void;
}

export const LeaderboardHeader: React.FC<LeaderboardHeaderProps> = ({
  title = 'Leaderboard',
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
      {/* Back Button - STRICT RULE: No background, no circular border, clean */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={handleBack}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="chevron-back" size={24} color="#F4F5F6" />
      </TouchableOpacity>

      {/* Screen Brand Title */}
      <View style={styles.brandBlock}>
        <View style={styles.brandRow}>
          <Text style={styles.brandHunter}>Hunter</Text>
          <Text style={styles.brandX}>X</Text>
        </View>
        <Text style={styles.brandSubtitle}>TRACK. IMPROVE. GO FURTHER.</Text>
      </View>

      {/* Info / Help Button */}
      <TouchableOpacity
        style={styles.infoBtn}
        onPress={onInfoPress}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="help-circle-outline" size={24} color="#8D98A3" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 20,
    backgroundColor: '#020203',
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandHunter: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    fontWeight: '800',
    color: '#F4F5F6',
    letterSpacing: 0.2,
  },
  brandX: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    fontWeight: '900',
    color: '#F12730',
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 8,
    fontWeight: '800',
    color: '#8D98A3',
    letterSpacing: 1.3,
    marginTop: 1,
    textTransform: 'uppercase',
  },
  infoBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
