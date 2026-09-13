import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { fontFamilies } from '@/theme/typography';
import { TimeRange } from '@/store/useMetricsStore';
import { useToastStore } from '@/store/useToastStore';

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
  availableRanges?: TimeRange[];
}

const RANGES: TimeRange[] = ['Today', 'Week', 'Month', 'Year'];

export function TimeRangeSelector({
  selected,
  onSelect,
  availableRanges = ['Today'],
}: TimeRangeSelectorProps) {
  const showToast = useToastStore((state) => state.showToast);

  const handleSelect = (range: TimeRange) => {
    const isAvailable = availableRanges.includes(range);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!isAvailable) {
      showToast('Stats stack up automatically as you move', 'info', 3000, false);
      return;
    }

    if (range !== selected) {
      onSelect(range);
    }
  };

  return (
    <View style={styles.container}>
      {RANGES.map((range) => {
        const isSelected = range === selected;
        const isAvailable = availableRanges.includes(range);

        return (
          <TouchableOpacity
            key={range}
            style={[
              styles.pill,
              isSelected && styles.activePill,
              !isAvailable && !isSelected && styles.disabledPill,
            ]}
            onPress={() => handleSelect(range)}
            activeOpacity={isAvailable ? 0.7 : 0.85}
          >
            <Text
              style={[
                styles.pillText,
                isSelected && styles.activePillText,
                !isAvailable && !isSelected && styles.disabledPillText,
              ]}
            >
              {range}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F0F12',
    borderRadius: 22,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E1E24',
  },
  pill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  activePill: {
    backgroundColor: '#5C171C',
    borderWidth: 1,
    borderColor: '#87232B',
    shadowColor: '#FF2A40',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  disabledPill: {
    opacity: 0.35,
  },
  pillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#71717A',
  },
  activePillText: {
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
  },
  disabledPillText: {
    color: '#52525B',
  },
});
