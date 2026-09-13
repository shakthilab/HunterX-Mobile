import React, { useCallback } from 'react';
import { Tabs, useFocusEffect, usePathname, useRouter } from 'expo-router';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/theme/colors';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();

  // Hardware back button handler to prevent back navigation to auth/onboarding screens
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // If on the Home tab, intercept back press so it never goes back to login/onboarding
        if (
          pathname === '/(tabs)' ||
          pathname === '/(tabs)/' ||
          pathname === '/(tabs)/index' ||
          pathname === '/'
        ) {
          return true; // Blocks native back press from returning to onboarding/auth
        }

        // If on another tab (Profile, Battles, Inventory), navigate back to Home tab
        router.navigate('/(tabs)');
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [pathname, router])
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        // Bar height + bottom padding grow with the device's own inset so the
        // bar's background actually reaches the bottom edge (home indicator /
        // gesture bar area) instead of leaving a gap that falls back to the
        // default system black there.
        tabBarStyle: [styles.tabBar, { height: 64 + insets.bottom, paddingBottom: 8 + insets.bottom }],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons name="home-sharp" size={20} color={focused ? '#FE5B01' : '#71717A'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: 'Metrics',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons name="stats-chart" size={20} color={focused ? '#FE5B01' : '#71717A'} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Battles',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <MaterialCommunityIcons name="sword-cross" size={22} color={focused ? '#FE5B01' : '#71717A'} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons name="person-outline" size={20} color={focused ? '#FE5B01' : '#71717A'} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopColor: '#18181B',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: '#3F3F46',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
});
