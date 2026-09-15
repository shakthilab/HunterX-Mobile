import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { fontFamilies } from '@/theme/typography';

export type MainCategoryTab = 'Global' | 'Friends' | 'Gen Z';

interface TopCategoryFilterBarProps {
  category: MainCategoryTab;
  onSelectCategory: (category: MainCategoryTab) => void;
}

const CATEGORIES: MainCategoryTab[] = ['Global', 'Friends', 'Gen Z'];

export const TopCategoryFilterBar: React.FC<TopCategoryFilterBarProps> = ({
  category,
  onSelectCategory,
}) => {
  return (
    <View style={styles.topBarContainer}>
      <View style={styles.filterRow}>
        {CATEGORIES.map((tab) => {
          const isActive = category === tab;

          return (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.85}
              onPress={() => onSelectCategory(tab)}
              style={styles.tabTouchArea}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#CE1A24', '#8C0E15', '#380508']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.activePillGradient}
                >
                  <Text style={styles.activePillText}>{tab}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactivePill}>
                  <Text style={styles.inactivePillText}>{tab}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topBarContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabTouchArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Active Glowing Red Pill */
  activePillGradient: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#FF333E',
    shadowColor: '#F12730',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 8,
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePillText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* Inactive Individual Pill */
  inactivePill: {
    backgroundColor: '#0D1114',
    borderWidth: 1,
    borderColor: '#1C232A',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactivePillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#8D98A3',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
