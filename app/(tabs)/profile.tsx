import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Screen } from '@/components/common/Screen';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { fontFamilies } from '@/theme/typography';
import { DEFAULT_BLURHASH } from '@/services/media/cloudinary';

// Modular Profile Components
import { AvatarSelectionModal, getAvatarSource } from '@/components/profile/AvatarSelectionModal';
export { getAvatarSource } from '@/components/profile/AvatarSelectionModal';
import { EditNameModal } from '@/components/profile/EditNameModal';
import { EditProfileFormData, EditProfileModal } from '@/components/profile/EditProfileModal';
import { GenericInfoModal } from '@/components/profile/GenericInfoModal';
import { InviteFriendsModal } from '@/components/profile/InviteFriendsModal';
import { RateHunterModal } from '@/components/profile/RateHunterModal';
import { RecentActivityModal } from '@/components/profile/RecentActivityModal';
import { SystemSettingsModal } from '@/components/profile/SystemSettingsModal';
import { WeeklyProgressCard } from '@/components/features/streaks/WeeklyProgressCard';

import { useSettingsStore } from '@/store/useSettingsStore';
import { getCurrentUser, updateProfile, updateUserAvatar, type UpdateProfilePayload } from '@/services/api/auth.service';
import { getUserSettings } from '@/services/api/settings.service';
import { useAvatarsReady } from '@/services/api/avatar.service';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  // Re-renders once the avatar catalog loads so the header avatar reflects
  // the user's actual avatar_id instead of the generic fallback image.
  useAvatarsReady();
  const userAny = user as any;

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Persistent Settings Store (Audio, Haptics, Notifications, Units)
  const {
    unitSystem,
    setUnitSystem,
    soundEffectsEnabled,
    setSoundEffectsEnabled,
    hapticsEnabled,
    setHapticsEnabled,
    allNotificationsEnabled,
    setAllNotificationsEnabled,
    dailyMotivationEnabled,
    setDailyMotivationEnabled,
    taskRemindersEnabled,
    setTaskRemindersEnabled,
    streakAtRiskEnabled,
    setStreakAtRiskEnabled,
    streakMilestonesEnabled,
    setStreakMilestonesEnabled,
    streakStatusAlertsEnabled,
    setStreakStatusAlertsEnabled,
    levelUpAlertsEnabled,
    setLevelUpAlertsEnabled,
    rewardReadyAlertsEnabled,
    setRewardReadyAlertsEnabled,
    announcementsEnabled,
    setAnnouncementsEnabled,
  } = useSettingsStore();

  // Modals Visibility
  const [isEditProfileModalVisible, setIsEditProfileModalVisible] = useState(false);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [isRecentActivityModalVisible, setIsRecentActivityModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isRateModalVisible, setIsRateModalVisible] = useState(false);
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Confirm Dialogs
  const [isLogoutConfirmVisible, setIsLogoutConfirmVisible] = useState(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);

  // Account Deletion Checker
  useEffect(() => {
    if (userAny?.delete_at) {
      const checkDeletion = () => {
        const remainingMs = userAny.delete_at - Date.now();
        if (remainingMs <= 0) {
          logout();
          router.replace('/(auth)/login');
        }
      };
      checkDeletion();
      const interval = setInterval(checkDeletion, 10000);
      return () => clearInterval(interval);
    }
  }, [userAny?.delete_at, logout]);

  // Sync account settings from backend on mount
  useEffect(() => {
    let isMounted = true;
    getUserSettings()
      .then((settings) => {
        if (isMounted && settings?.units) {
          setUnitSystem(settings.units);
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, [setUnitSystem]);

  // Handlers
  const handleUnitSystemChange = (system: 'metric' | 'imperial') => {
    setUnitSystem(system);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
  };

  const handleSaveProfileForm = async (updatedForm: EditProfileFormData) => {
    if (user && updatedForm.name.trim()) {
      let heightInCm = 181;
      const heightVal = parseFloat(updatedForm.height);
      if (!isNaN(heightVal)) {
        if (updatedForm.heightUnit === 'ft') {
          heightInCm = Math.round(heightVal / 0.0328084);
        } else {
          heightInCm = Math.round(heightVal);
        }
      }

      let weightInKg = 75;
      const weightVal = parseFloat(updatedForm.weight);
      if (!isNaN(weightVal)) {
        if (updatedForm.weightUnit === 'lbs') {
          weightInKg = Math.round((weightVal / 2.20462) * 10) / 10;
        } else {
          weightInKg = Math.round(weightVal * 10) / 10;
        }
      }

      let formattedBirthday = updatedForm.birthday;
      if (updatedForm.birthday) {
        const parts = updatedForm.birthday.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          let year = parts[2];
          if (year.length === 2) {
            const numYear = parseInt(year, 10);
            year = numYear > 30 ? `19${year}` : `20${year}`;
          }
          formattedBirthday = `${day}/${month}/${year}`;
        }
      }

      const payload: UpdateProfilePayload = {
        name: updatedForm.name.trim(),
        gender: updatedForm.gender.toUpperCase(),
        birthday: formattedBirthday,
        height: heightInCm,
        weight: weightInKg,
      };

      if (updatedForm.avatar_id !== undefined && updatedForm.avatar_id !== null) {
        payload.avatar_id = Number(updatedForm.avatar_id) || updatedForm.avatar_id;
      }

      try {
        const updatedUserFromPatch = await updateProfile(payload);
        setUser(updatedUserFromPatch);

        // Fetch fresh user data from /auth/me to refresh UI state completely
        try {
          const freshUser = await getCurrentUser();
          if (freshUser) {
            setUser(freshUser);
          }
        } catch (meError) {
          console.warn('[Profile] Failed to refresh user profile via getCurrentUser:', meError);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
        Alert.alert('Profile Updated', 'Your profile records have been saved.');
      } catch (err: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
        Alert.alert('Update Failed', err.message || 'Failed to update profile.');
        throw err;
      }
    }
  };

  const handleSaveName = (newName: string) => {
    if (user && newName.trim()) {
      setUser({ ...user, displayName: newName.trim(), name: newName.trim() } as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    }
  };

  const handleSelectAvatar = async (avatarId: string, avatarUrl: string, isChanged?: boolean) => {
    const currentIdStr = String(userAny?.avatar_id ?? '');
    const currentUrlStr = String(user?.avatarUrl ?? '');

    // If the user didn't change the avatar, DO NOT call any API!
    if (isChanged === false || (currentIdStr === String(avatarId) && currentUrlStr === String(avatarUrl))) {
      setIsAvatarModalVisible(false);
      return;
    }

    if (user) {
      setUser({ ...user, avatarUrl, avatar_id: avatarId } as any);
      try {
        const updatedUser = await updateUserAvatar(Number(avatarId) || avatarId);
        setUser(updatedUser);
        try {
          const freshUser = await getCurrentUser();
          if (freshUser) {
            setUser(freshUser);
          }
        } catch { }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      } catch (err: any) {
        console.warn('[Profile] Failed to update avatar on backend:', err);
        Alert.alert('Avatar Update Failed', err.message || 'Failed to update avatar.');
      }
    }
    setIsAvatarModalVisible(false);
  };

  const handleLogout = () => setIsLogoutConfirmVisible(true);

  const confirmLogout = async () => {
    setIsLogoutConfirmVisible(false);
    await logout();
    router.replace('/(auth)/login');
  };

  const handleDeleteAccount = () => {
    setIsDeleteConfirmVisible(true);
  };

  const confirmDeleteAccount = async () => {
    setIsDeleteConfirmVisible(false);
    setIsEditProfileModalVisible(false);
    if (user) {
      const deleteTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
      setUser({ ...user, delete_at: deleteTime } as any);
      Alert.alert(
        'Account Scheduled for Deletion',
        'You have 7 days to retrieve your account. After 7 days, your account will be fully deleted.'
      );
    }
  };

  const handleCancelDeletion = () => {
    if (user) {
      const updatedUser = { ...user };
      delete (updatedUser as any).delete_at;
      setUser(updatedUser);
      Alert.alert('Account Restored', 'Your account deletion request has been cancelled.');
    }
  };

  const handleMenuPress = (key: string) => {
    switch (key) {
      case 'edit_profile':
        setIsEditProfileModalVisible(true);
        break;
      case 'invite':
        setIsInviteModalVisible(true);
        break;
      case 'activity':
        setIsRecentActivityModalVisible(true);
        break;

      case 'settings':
        setIsSettingsModalVisible(true);
        break;
      case 'rewards':
        router.push('/rewards');
        break;
      case 'rate_app':
        setIsRateModalVisible(true);
        break;
      case 'send_feedback':
        router.push('/feedback');
        break;
      case 'instagram':
        Linking.openURL('https://instagram.com');
        break;
      case 'facebook':
        Linking.openURL('https://facebook.com');
        break;
      case 'x':
        Linking.openURL('https://x.com');
        break;
      case 'signout':
        handleLogout();
        break;
      default:
        break;
    }
  };

  const displayName = userAny?.name ?? user?.displayName ?? 'Shadow Hunter';
  const progression = userAny?.user_progression || user?.user_progression || {};
  const level = progression?.current_level ?? user?.level ?? 1;
  const rankName = (
    progression?.rank_name ||
    progression?.rank ||
    progression?.current_level_name ||
    userAny?.rank ||
    'DORMANT'
  ).toUpperCase();

  const currentXp = progression?.total_xp ?? user?.xp ?? 0;
  const nextLevelXp = progression?.next_level_xp_required ?? progression?.next_level_required_xp ?? 0;
  const xpUntilNext = nextLevelXp > currentXp ? nextLevelXp - currentXp : 0;
  const progressPct = nextLevelXp > 0
    ? Math.min(100, Math.max(0, Math.round((currentXp / nextLevelXp) * 100)))
    : 0;

  const currentAvatarSource = getAvatarSource(user?.avatarUrl, userAny?.avatar_id);
  // The card's background portrait renders large (55% of card width, full
  // height) — the default avatar source is sized for a ~70px circle, so
  // reusing it here upscaled a 160px-wide image across a much bigger area
  // and came out blurry. Request a wider derivative for this one spot.
  const watermarkAvatarSource = getAvatarSource(user?.avatarUrl, userAny?.avatar_id, 700);
  const referralCode = userAny?.referral_code ?? '45JLFI17';

  // Animated XP loader — Reanimated shared value driving the bar's `width`
  // entirely on the UI thread (RN's classic `Animated` can only animate
  // `width` with `useNativeDriver: false`, i.e. by ticking on the JS thread).
  const xpProgress = useSharedValue(0);
  const [displayPct, setDisplayPct] = useState(0);

  // Load from initial current level progress on focus / mount
  useFocusEffect(
    useCallback(() => {
      xpProgress.value = 0;
      setDisplayPct(0);
      xpProgress.value = withTiming(progressPct, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      });
    }, [progressPct, xpProgress])
  );

  // Mirrors the animated value into React state for the on-screen "N%"
  // label — but only when the rounded percentage actually changes, instead
  // of on every animation frame like the old Animated.Value listener did.
  useAnimatedReaction(
    () => Math.round(xpProgress.value),
    (rounded, previous) => {
      if (rounded !== previous) {
        runOnJS(setDisplayPct)(rounded);
      }
    },
    [xpProgress]
  );

  const xpBarStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, xpProgress.value))}%`,
  }));

  return (
    <Screen style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Hunter Profile</Text>
        </View>

        {/* Deletion Warning Banner */}
        {userAny?.delete_at && (
          <View style={styles.deletionPendingBanner}>
            <View style={styles.deletionPendingLeft}>
              <Ionicons
                name="warning-outline"
                size={16}
                color="#EF4444"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.deletionPendingText}>
                Account deletes in{' '}
                {Math.max(
                  1,
                  Math.ceil((userAny.delete_at - Date.now()) / (1000 * 60 * 60 * 24))
                )}{' '}
                days
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCancelDeletion}
              style={styles.undoDeletionBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.undoDeletionText}>Undo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TOP PROFILE SECTION */}
        <View style={styles.profileCard}>
          {/* Character Artwork Background */}
          <Image
            source={watermarkAvatarSource}
            style={styles.watermarkBg}
            contentFit="cover"
            cachePolicy="memory-disk"
            placeholder={{ blurhash: DEFAULT_BLURHASH }}
            transition={150}
          />

          <View style={styles.cardHeader}>
            {/* Avatar Section */}
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={() => setIsAvatarModalVisible(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF9500', '#F97316', '#EA580C']}
                style={styles.avatarGlowRing}
              >
                <View style={styles.avatarCircleFrame}>
                  <Image
                    source={currentAvatarSource}
                    style={styles.avatarImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    placeholder={{ blurhash: DEFAULT_BLURHASH }}
                    transition={150}
                  />
                </View>
              </LinearGradient>

              {/* LVL Badge */}
              <View style={styles.levelBadgeContainer}>
                <Text style={styles.levelLabelText}>LVL</Text>
                <Text style={styles.levelNumberText}>{level}</Text>
              </View>
            </TouchableOpacity>

            {/* Profile Info Section */}
            <View style={styles.userInfoContainer}>
              <View style={styles.nameRow}>
                <View style={styles.nameLeftGroup}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {displayName}
                  </Text>
                </View>

                {/* Invite Icon Button */}
                <TouchableOpacity
                  style={styles.inviteIconOnlyBtn}
                  onPress={() => handleMenuPress('invite')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="paper-plane-outline" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Class / Title */}
              <View style={styles.classRow}>
                <MaterialCommunityIcons
                  name="shield-outline"
                  size={14}
                  color="#FE5B01"
                />
                <Text style={styles.classText}>{rankName}</Text>
              </View>
            </View>
          </View>

          {/* EXPERIENCE TRACKER SECTION */}
          <View style={styles.xpSection}>
            <View style={styles.xpHeaderRow}>
              <Text style={styles.xpTitleText}>EXPERIENCE TRACKER</Text>
              <Text style={styles.xpPercentText}>{displayPct}%</Text>
            </View>

            {/* Progress Bar Track */}
            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[styles.progressBarFill, xpBarStyle]}
              >
                <LinearGradient
                  colors={['#EA580C', '#FE5B01', '#FBBF24']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressGradientFill}
                />
              </Animated.View>
            </View>

            <Text style={styles.xpSubtext}>
              {xpUntilNext.toLocaleString()} XP until <Text style={styles.xpBoldText}>next rank</Text>
            </Text>
          </View>
        </View>

        {/* WEEKLY CAMPAIGN PROGRESS CARD (Commented out)
        <WeeklyProgressCard
          weekStatus={user?.week_status}
          completedDaysCount={user?.completedDaysCount}
          avatarUrl={user?.avatarUrl}
        />
        */}

        {/* MAIN MENU OPTIONS CARD */}
        <View style={styles.menuContainer}>
          <MenuItem
            icon="create-outline"
            label="Edit Profile"
            onPress={() => handleMenuPress('edit_profile')}
          />
          <MenuItem
            icon="time-outline"
            label="Activities"
            onPress={() => handleMenuPress('activity')}
          />

          <MenuItem
            icon="settings-outline"
            label="System Settings"
            onPress={() => handleMenuPress('settings')}
          />
          <MenuItem
            icon="gift-outline"
            label="Rewards"
            onPress={() => handleMenuPress('rewards')}
            isLast
          />
        </View>

        {/* WE LOVE FEEDBACK! SECTION */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>We Love Feedback!</Text>
          <View style={styles.menuContainer}>
            <MenuItem
              icon="star-outline"
              label="Rate HunterX"
              onPress={() => handleMenuPress('rate_app')}
            />
            <MenuItem
              icon="chatbubble-ellipses-outline"
              label="Send Feedback"
              subtitle="What can we improve?"
              onPress={() => handleMenuPress('send_feedback')}
              isLast
            />
          </View>
        </View>

        {/* FOLLOW US SECTION */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>Follow Us</Text>
          <View style={styles.menuContainer}>
            <MenuItem
              icon="logo-instagram"
              label="Instagram"
              onPress={() => handleMenuPress('instagram')}
            />
            <MenuItem
              icon="logo-facebook"
              label="Facebook"
              onPress={() => handleMenuPress('facebook')}
            />
            <MenuItem
              icon="close-outline"
              label="X"
              onPress={() => handleMenuPress('x')}
              isLast
            />
          </View>
        </View>

        {/* LOG OUT CARD */}
        <View style={styles.menuContainer}>
          <MenuItem
            icon="exit-outline"
            label="Log Out"
            onPress={() => handleMenuPress('signout')}
            isDestructive
            isLast
          />
        </View>

        {/* FOOTER METADATA SECTION */}
        <View style={styles.footerSection}>
          <Text style={styles.footerHeading}>Made with ❤️ in India</Text>
          <Text style={styles.footerSubheading}>To make the world a healthier place.</Text>

          <View style={styles.footerLinksRow}>
            <TouchableOpacity onPress={() => setActiveModal('Terms of Service')}>
              <Text style={styles.footerLinkText}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerDotText}>•</Text>
            <TouchableOpacity onPress={() => setActiveModal('Privacy Policy')}>
              <Text style={styles.footerLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerDotText}>•</Text>
            <TouchableOpacity onPress={() => setActiveModal('Disclaimer')}>
              <Text style={styles.footerLinkText}>Disclaimer</Text>
            </TouchableOpacity>
            <Text style={styles.footerDotText}>•</Text>
            <TouchableOpacity onPress={() => setActiveModal('Acknowledgements')}>
              <Text style={styles.footerLinkText}>Acknowledgements</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerVersionText}>
            Version: {Constants.expoConfig?.version ?? '1.0.0'} (
            {Platform.select({
              ios: Constants.expoConfig?.ios?.buildNumber,
              android: Constants.expoConfig?.android?.versionCode?.toString(),
            }) ?? '1'}
            )
          </Text>
        </View>
      </ScrollView>

      {/* MODULAR SUB-MODALS */}
      <InviteFriendsModal
        visible={isInviteModalVisible}
        onClose={() => setIsInviteModalVisible(false)}
        referralCode={referralCode}
        displayName={displayName}
      />

      <RecentActivityModal
        visible={isRecentActivityModalVisible}
        onClose={() => setIsRecentActivityModalVisible(false)}
        user={user}
      />

      <SystemSettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        user={user}
        onUpdateUser={(updated) => setUser(updated)}
        unitSystem={unitSystem}
        onUnitSystemChange={handleUnitSystemChange}
        soundEffectsEnabled={soundEffectsEnabled}
        setSoundEffectsEnabled={setSoundEffectsEnabled}
        hapticsEnabled={hapticsEnabled}
        setHapticsEnabled={setHapticsEnabled}
        allNotificationsEnabled={allNotificationsEnabled}
        setAllNotificationsEnabled={setAllNotificationsEnabled}
        dailyMotivationEnabled={dailyMotivationEnabled}
        setDailyMotivationEnabled={setDailyMotivationEnabled}
        taskRemindersEnabled={taskRemindersEnabled}
        setTaskRemindersEnabled={setTaskRemindersEnabled}
        streakAtRiskEnabled={streakAtRiskEnabled}
        setStreakAtRiskEnabled={setStreakAtRiskEnabled}
        streakMilestonesEnabled={streakMilestonesEnabled}
        setStreakMilestonesEnabled={setStreakMilestonesEnabled}
        streakStatusAlertsEnabled={streakStatusAlertsEnabled}
        setStreakStatusAlertsEnabled={setStreakStatusAlertsEnabled}
        levelUpAlertsEnabled={levelUpAlertsEnabled}
        setLevelUpAlertsEnabled={setLevelUpAlertsEnabled}
        rewardReadyAlertsEnabled={rewardReadyAlertsEnabled}
        setRewardReadyAlertsEnabled={setRewardReadyAlertsEnabled}
        announcementsEnabled={announcementsEnabled}
        setAnnouncementsEnabled={setAnnouncementsEnabled}
      />

      <RateHunterModal
        visible={isRateModalVisible}
        onClose={() => setIsRateModalVisible(false)}
      />

      <EditProfileModal
        visible={isEditProfileModalVisible}
        onClose={() => setIsEditProfileModalVisible(false)}
        user={user}
        unitSystem={unitSystem}
        onSave={handleSaveProfileForm}
        onOpenAvatarPicker={() => {
          setIsEditProfileModalVisible(false);
          setIsAvatarModalVisible(true);
        }}
        onDeleteAccount={handleDeleteAccount}
      />

      <AvatarSelectionModal
        visible={isAvatarModalVisible}
        onClose={() => setIsAvatarModalVisible(false)}
        currentAvatar={user?.avatarUrl}
        currentAvatarId={userAny?.avatar_id}
        onSelectAvatar={handleSelectAvatar}
      />

      <EditNameModal
        visible={isEditNameModalVisible}
        initialName={displayName}
        onSave={handleSaveName}
        onClose={() => setIsEditNameModalVisible(false)}
      />

      <GenericInfoModal
        visible={!!activeModal}
        title={activeModal}
        onClose={() => setActiveModal(null)}
      />

      <ConfirmDialog
        visible={isLogoutConfirmVisible}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmLabel="Log Out"
        destructive
        onConfirm={confirmLogout}
        onCancel={() => setIsLogoutConfirmVisible(false)}
      />

      <ConfirmDialog
        visible={isDeleteConfirmVisible}
        title="Delete Account"
        message="You have 7 days to retrieve your account. After 7 days, your account will be fully deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDeleteAccount}
        onCancel={() => setIsDeleteConfirmVisible(false)}
      />
    </Screen>
  );
}

// Menu Item Component
interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  isDestructive?: boolean;
  isLast?: boolean;
}

function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  isDestructive,
  isLast,
}: MenuItemProps) {
  const iconColor = isDestructive ? '#EF4444' : '#E4E4E7';
  const textColor = isDestructive ? '#EF4444' : '#F4F4F5';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
        !isLast && styles.menuItemBorder,
      ]}
      onPress={onPress}
    >
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={22} color={iconColor} />
        <View style={styles.menuTextGroup}>
          <Text style={[styles.menuLabel, { color: textColor }]}>{label}</Text>
          {!!subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={isDestructive ? '#EF4444' : '#71717A'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  container: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  deletionPendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 4,
  },
  deletionPendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deletionPendingText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },
  undoDeletionBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  undoDeletionText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  profileCard: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    position: 'relative',
  },
  watermarkBg: {
    position: 'absolute',
    right: -10,
    top: 0,
    bottom: 0,
    width: '55%',
    height: '100%',
    opacity: 0.4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlowRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircleFrame: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    backgroundColor: '#16161A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  levelBadgeContainer: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    backgroundColor: '#0C0C0E',
    borderWidth: 1.5,
    borderColor: '#FE5B01',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 38,
  },
  levelLabelText: {
    fontFamily: fontFamilies.bold,
    fontSize: 8,
    fontWeight: '900',
    color: '#FE5B01',
    letterSpacing: 0.5,
    lineHeight: 10,
  },
  levelNumberText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 15,
  },
  userInfoContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  userName: {
    fontFamily: fontFamilies.bold,
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  editIconBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#222226',
    borderWidth: 1,
    borderColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  classText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    fontWeight: '800',
    color: '#FE5B01',
    letterSpacing: 1.1,
  },
  inviteIconOnlyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  xpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpTitleText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    fontWeight: '800',
    color: '#A1A1AA',
    letterSpacing: 1,
  },
  xpPercentText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: '900',
    color: '#FE5B01',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#1C1C20',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressGradientFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 5,
  },
  xpSubtext: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#A1A1AA',
  },
  xpBoldText: {
    fontFamily: fontFamilies.bold,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionContainer: {
    gap: 6,
  },
  sectionHeaderTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#A1A1AA',
    marginLeft: 4,
  },
  menuContainer: {
    backgroundColor: '#121215',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#242428',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemPressed: {
    backgroundColor: '#1A1A1F',
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  menuTextGroup: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    fontWeight: '600',
  },
  menuSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerSubheading: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: '#71717A',
    marginBottom: 6,
  },
  footerLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  footerLinkText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: '#A1A1AA',
    textDecorationLine: 'underline',
  },
  footerDotText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: '#52525B',
  },
  footerVersionText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: '#71717A',
    marginTop: 4,
  },
});
