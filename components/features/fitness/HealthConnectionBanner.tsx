import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { fontFamilies } from '@/theme/typography';
import { useMetricsStore } from '@/store/useMetricsStore';

interface HealthConnectionBannerProps {
  onPress: () => void;
}

export function HealthConnectionBanner({ onPress }: HealthConnectionBannerProps) {
  // Selecting just these three fields (instead of the whole store) matters
  // here specifically: useMetricsStore's `datasets` field changes on every
  // focus/foreground/sync refresh, and without a selector this banner would
  // re-render on every one of those even though it never reads `datasets`.
  const { isHealthConnected, lastSyncedText, isSyncing } = useMetricsStore(
    useShallow((state) => ({
      isHealthConnected: state.isHealthConnected,
      lastSyncedText: state.lastSyncedText,
      isSyncing: state.isSyncing,
    }))
  );

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.bannerWrapper}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={
          isHealthConnected
            ? ['rgba(16, 42, 38, 0.85)', 'rgba(10, 26, 23, 0.95)']
            : ['rgba(30, 25, 30, 0.85)', 'rgba(18, 16, 19, 0.95)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {/* Left Circular Icon Badge */}
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: isHealthConnected ? '#19D188' : '#3F3F46',
            },
          ]}
        >
          <Ionicons
            name={isHealthConnected ? 'heart' : 'heart-dislike-outline'}
            size={18}
            color="#FFFFFF"
          />
        </View>

        {/* Info Text */}
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>
            {isHealthConnected ? 'Health Connected' : 'Connect Health Data'}
          </Text>
          <Text style={styles.syncText}>
            {isSyncing
              ? 'Syncing health data...'
              : isHealthConnected
              ? `Last synced • ${lastSyncedText}`
              : 'Tap to sync steps, sleep & workouts'}
          </Text>
        </View>

        {/* Right Arrow / Spinner */}
        <View style={styles.actionContainer}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#19D188" />
          ) : (
            <Ionicons name="chevron-forward" size={18} color="#71717A" />
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bannerWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1D3B33',
    marginBottom: 16,
    shadowColor: '#19D188',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#19D188',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 3,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  syncText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
