import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';

import { fontFamilies } from '@/theme/typography';
import { useMetricsStore } from '@/store/useMetricsStore';
import { healthConnectAdapter, appleHealthAdapter } from '@/services/health/healthService';
import { OrbitalHealthGraphic } from './OrbitalHealthGraphic';
import { MountainFooterGraphic } from './MountainFooterGraphic';
import { HealthBackgroundDecor } from './HealthBackgroundDecor';
import { GoogleIcon } from '@/components/common/GoogleIcon';

interface ConnectHealthViewProps {
  onBack?: () => void;
  showBackButton?: boolean;
  onConnectedSuccess?: () => void;
  isModal?: boolean;
}

export function ConnectHealthView({
  onBack,
  showBackButton = false,
  onConnectedSuccess,
  isModal = false,
}: ConnectHealthViewProps) {
  const insets = useSafeAreaInsets();

  const {
    isHealthConnected,
    connectedProvider,
    connectProvider,
    disconnectProvider,
  } = useMetricsStore(
    useShallow((state) => ({
      isHealthConnected: state.isHealthConnected,
      connectedProvider: state.connectedProvider,
      connectProvider: state.connectProvider,
      disconnectProvider: state.disconnectProvider,
    }))
  );

  useEffect(() => {
    console.log('====================================================');
    console.log(`🔌 [ConnectHealthView] Connect Screen Mounted on ${Platform.OS}`);
    if (Platform.OS === 'android') {
      console.log('   Checking Android Health Connect SDK availability...');
      healthConnectAdapter.isAvailable().then((avail) => {
        console.log(`   Health Connect isAvailable result on mount: ${avail}`);
      });
    } else if (Platform.OS === 'ios') {
      console.log('   Checking iOS Apple Health availability...');
      appleHealthAdapter.isAvailable().then((avail) => {
        console.log(`   Apple Health isAvailable result on mount: ${avail}`);
      });
    }
    console.log('====================================================');
  }, []);

  const [selectedProvider, setSelectedProvider] = useState<
    'apple_health' | 'health_connect'
  >('apple_health');

  const [connectingProvider, setConnectingProvider] = useState<
    'apple_health' | 'health_connect' | null
  >(null);

  const handleConnect = async (provider: 'apple_health' | 'health_connect') => {
    setSelectedProvider(provider);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isHealthConnected && connectedProvider === provider) {
      Alert.alert(
        'Disconnect Health Data',
        'Are you sure you want to disconnect sync with HunterX?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: () => {
              disconnectProvider();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            },
          },
        ]
      );
      return;
    }

    setConnectingProvider(provider);
    try {
      await connectProvider(provider);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onConnectedSuccess) {
        onConnectedSuccess();
      }
    } catch (e) {
      Alert.alert('Connection Failed', 'Could not link health provider. Please try again.');
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleHelpPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Health Integration',
      'HunterX reads your steps, calories, active minutes, heart rate, and sleep data locally from Apple HealthKit or Android Health Connect. Your data never leaves your device unencrypted.',
      [{ text: 'Got it' }]
    );
  };

  const hasBack = showBackButton && !!onBack;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: isModal ? insets.top : Math.max(insets.top, 16),
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {/* Background Topographic Contours, Crimson Aura & Mountain Backdrop */}
      <HealthBackgroundDecor />

      {/* Header Bar */}
      {hasBack ? (
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Prominent Concentric Orbital Graphic */}
        <OrbitalHealthGraphic />

        {/* Scaled Title & Subtitle */}
        <View style={styles.textHeader}>
          <Text style={styles.mainTitle}>Connect Your{'\n'}Health Data</Text>
          <Text style={styles.subTitle}>
            Sync your activity, sleep, and wellness data to unlock powerful insights in HunterX.
          </Text>
        </View>

        {/* Provider Option 1: Apple Health */}
        <TouchableOpacity
          style={[
            styles.providerCardOuter,
            selectedProvider === 'apple_health' && styles.cardActiveShadow,
          ]}
          onPress={() => handleConnect('apple_health')}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={
              selectedProvider === 'apple_health'
                ? ['#2A2E3B', '#1E212C', '#D84315', '#FF5A1E']
                : ['#22242F', '#181922', '#181922', '#22242F']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            locations={selectedProvider === 'apple_health' ? [0, 0.42, 0.78, 1] : [0, 0.5, 0.5, 1]}
            style={styles.cardBorderGradient}
          >
            <View style={styles.providerCardInner}>
              <View style={styles.providerIconContainer}>
                <Ionicons name="logo-apple" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.providerInfo}>
                <Text style={styles.providerSubtitle}>Connect with</Text>
                <Text style={styles.providerTitle}>Apple Health</Text>
                <Text style={styles.providerDesc}>
                  Sync your health and fitness data securely using HealthKit.
                </Text>
              </View>
              <View style={styles.providerAction}>
                {connectingProvider === 'apple_health' ? (
                  <ActivityIndicator size="small" color="#FE5B01" />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={selectedProvider === 'apple_health' ? '#FFFFFF' : '#8E8E98'}
                  />
                )}
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Provider Option 2: Google Fit / Health Connect */}
        <TouchableOpacity
          style={[
            styles.providerCardOuter,
            selectedProvider === 'health_connect' && styles.cardActiveShadow,
          ]}
          onPress={() => handleConnect('health_connect')}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={
              selectedProvider === 'health_connect'
                ? ['#2A2E3B', '#1E212C', '#D84315', '#FF5A1E']
                : ['#22242F', '#181922', '#181922', '#22242F']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            locations={selectedProvider === 'health_connect' ? [0, 0.42, 0.78, 1] : [0, 0.5, 0.5, 1]}
            style={styles.cardBorderGradient}
          >
            <View style={styles.providerCardInner}>
              <View style={styles.providerIconContainer}>
                <GoogleIcon size={30} />
              </View>
              <View style={styles.providerInfo}>
                <Text style={styles.providerSubtitle}>Connect with</Text>
                <Text style={styles.providerTitle}>Google Fit / Health Connect</Text>
                <Text style={styles.providerDesc}>
                  Sync your health and fitness data securely using Health Connect.
                </Text>
              </View>
              <View style={styles.providerAction}>
                {connectingProvider === 'health_connect' ? (
                  <ActivityIndicator size="small" color="#FE5B01" />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={selectedProvider === 'health_connect' ? '#FFFFFF' : '#8E8E98'}
                  />
                )}
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Feature and Trust Points */}
        <View style={styles.featuresList}>
          {/* Feature 1 */}
          <View style={styles.featureItem}>
            <View style={styles.featureIconBubble}>
              <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Track what matters</Text>
              <Text style={styles.featureSubtitle}>
                Steps, calories, sleep, heart rate and more.
              </Text>
            </View>
          </View>

          {/* Feature 2 */}
          <View style={styles.featureItem}>
            <View style={styles.featureIconBubble}>
              <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Your data stays private</Text>
              <Text style={styles.featureSubtitle}>
                You're in control. We only access what you allow.
              </Text>
            </View>
          </View>

          {/* Feature 3 */}
          <View style={styles.featureItem}>
            <View style={styles.featureIconBubble}>
              <Ionicons name="star-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Get deeper insights</Text>
              <Text style={styles.featureSubtitle}>
                See your progress and build better habits with HunterX.
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Atmosphere Image with Quote */}
        <MountainFooterGraphic />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050608',
  },
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerBarNoBack: {
    justifyContent: 'flex-end',
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  textHeader: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  mainTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 31,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subTitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 14.5,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 330,
  },
  providerCardOuter: {
    borderRadius: 22,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  cardActiveShadow: {
    shadowColor: '#FE5B01',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 7,
  },
  cardBorderGradient: {
    borderRadius: 22,
    padding: 1.3,
  },
  providerCardInner: {
    backgroundColor: '#121319',
    borderRadius: 20.7,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    position: 'relative',
  },
  providerIconContainer: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  providerInfo: {
    flex: 1,
    paddingRight: 8,
  },
  providerSubtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 12.5,
    color: '#8E8E98',
    marginBottom: 3,
  },
  providerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  providerDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 12.5,
    color: '#7A7A86',
    lineHeight: 17,
  },
  providerAction: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresList: {
    marginTop: 18,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#161922',
    borderWidth: 1.2,
    borderColor: '#252936',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  featureSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 12.8,
    color: '#8A8F9E',
    lineHeight: 17.5,
  },
  footerGraphicWrapper: {
    height: 200,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    marginTop: 10,
    overflow: 'hidden',
  },
  quoteText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: '#828292',
    textAlign: 'center',
    letterSpacing: 3.5,
    lineHeight: 20,
    marginBottom: 10,
    zIndex: 2,
  },
});
