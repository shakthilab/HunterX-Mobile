import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { fetchTasksToday, completeTask, reopenTask } from '@/services/api/tasks.service';
import type { TaskItem } from '@/types/task';
import { useAuthStore } from '@/store/useAuthStore';
import { getCurrentUser } from '@/services/api/auth.service';
import { optimizeCloudinaryUrl, DEFAULT_BLURHASH } from '@/services/media/cloudinary';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Screen } from '@/components/common/Screen';
import { ExactMedalIcon } from '@/components/common/ExactMedalIcon';
import { DayCompleteScreen } from '@/components/features/missions/DayCompleteScreen';
import { QuestListCard } from '@/components/features/missions/QuestListCard';
import { LootDropModal } from '@/components/features/loot/LootDropModal';
import { QuestActionModal } from '@/components/features/missions/QuestActionModal';
import { TaskCompletedToast } from '@/components/features/missions/TaskCompletedToast';
import { TaskCompletionBottomSheet } from '@/components/features/missions/TaskCompletionBottomSheet';
import { WeeklyTracker } from '@/components/features/streaks/WeeklyTracker';
import * as Haptics from 'expo-haptics';
import { playTaskDoneSound } from '@/services/audio/taskDoneSound';
import { useAuth } from '@/hooks/useAuth';
import { useLootDrop } from '@/hooks/useLootDrop';
import { fontFamilies } from '@/theme/typography';
import { getAvatarSource } from './profile';
import { useAvatarsReady } from '@/services/api/avatar.service';

export interface QuestItem {
  id: string;
  title: string;
  category: string;
  xpReward: number;
  xpPartial?: number;
  type: 'daily' | 'weekly';
  image: any;
  status: 'todo' | 'done' | 'partial' | 'skipped';
  earnedXp?: number;
  showTickButton?: boolean;
  showWrongButton?: boolean;
  hasStatusPopup?: boolean;
  imageHeight?: number;
  imageStyle?: any;
  targetValue?: string;
  allows_partial?: boolean;
}

const LAST_TASK_SHEET_DATE_KEY = '@hunterx_task_sheet_last_shown_date';

function getTodayDateStr(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const INITIAL_QUESTS: QuestItem[] = [
  {
    id: '1',
    title: 'Sleep 8 Hours',
    category: 'REST',
    xpReward: 10,
    type: 'daily',
    showTickButton: true,
    showWrongButton: true,
    hasStatusPopup: false,
    imageHeight: 120,
    image: null,
    status: 'todo',
  },
  {
    id: '2',
    title: 'Drink 3L Water',
    category: 'HYDRATE',
    xpReward: 10,
    type: 'daily',
    showTickButton: true,
    showWrongButton: true,
    hasStatusPopup: false,
    image: null,
    status: 'todo',
  },
  {
    id: '3',
    title: 'Protein Goal',
    category: 'NUTRITION',
    xpReward: 10,
    type: 'daily',
    showTickButton: true,
    showWrongButton: true,
    hasStatusPopup: false,
    targetValue: '128 g',
    image: null,
    imageStyle: { height: 170, top: -25 },
    status: 'todo',
  },
  {
    id: '4',
    title: 'Run 10km',
    category: 'CARDIO',
    xpReward: 10,
    type: 'weekly',
    showTickButton: true,
    showWrongButton: true,
    hasStatusPopup: false,
    image: null,
    status: 'todo',
  },
];

const ANIME_AVATARS = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=400&auto=format&fit=crop',
];

function mapTaskToQuest(item: TaskItem, type: 'daily' | 'weekly'): QuestItem {
  const tagUpper = item.tag?.toUpperCase() || '';

  // Dynamically bind image from the API response, requesting a
  // format/quality/size-optimized Cloudinary variant instead of the
  // full-resolution original (see services/media/cloudinary.ts).
  const image = item.image_url ? { uri: optimizeCloudinaryUrl(item.image_url) } : null;

  let status: 'todo' | 'done' | 'partial' | 'skipped' = 'todo';
  if (item.status === 'COMPLETED') {
    status = 'done';
  } else if (item.status === 'PARTIAL') {
    status = 'partial';
  } else if (item.status === 'SKIPPED') {
    status = 'skipped';
  }

  let targetValue: string | undefined = undefined;
  if (item.target_value !== null && item.target_value !== undefined) {
    let unit = item.target_unit || '';
    if (unit === 'grams') {
      unit = 'g';
    } else if (unit === 'liters') {
      unit = 'L';
    } else if (unit === 'hours' || unit === 'hour') {
      unit = 'hrs';
    }
    
    if (unit === 'hrs' || unit === 'g' || unit === 'L') {
      targetValue = `${item.target_value}${unit}`;
    } else {
      targetValue = `${item.target_value} ${unit}`.trim();
    }
  }

  return {
    id: item.id,
    title: item.title,
    category: item.tag || 'QUEST',
    xpReward: item.xp_reward,
    xpPartial: item.xp_partial,
    type,
    image,
    status,
    earnedXp: item.xp_earned,
    showTickButton: item.status !== 'COMPLETED' && item.status !== 'SKIPPED',
    showWrongButton: item.status !== 'COMPLETED' && item.status !== 'SKIPPED',
    targetValue,
    allows_partial: item.allows_partial,
    imageHeight: tagUpper === 'REST' ? 120 : undefined,
    imageStyle: tagUpper === 'NUTRITION' ? { height: 170, top: -25 } : undefined,
  };
}

export default function MissionsHomeScreen() {
  const { user } = useAuth();
  const { lastDrop, roll } = useLootDrop();
  const params = useLocalSearchParams<{ fromAscension?: string }>();
  const isFromAscension = params.fromAscension === 'true';

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Re-renders once the avatar catalog loads so the header avatar reflects
  // the user's actual avatar_id instead of the generic fallback image.
  useAvatarsReady();

  const [dropVisible, setDropVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'todo' | 'done' | 'skipped'>('todo');

  // Cinematic black overlay fade-out matching the intro audio after onboarding
  const [showBlackIntroOverlay, setShowBlackIntroOverlay] = useState(isFromAscension);
  const blackFadeAnim = useRef(new Animated.Value(isFromAscension ? 1 : 0)).current;

  useEffect(() => {
    if (isFromAscension) {
      Animated.timing(blackFadeAnim, {
        toValue: 0,
        duration: 2400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setShowBlackIntroOverlay(false);
      });
    }
  }, [isFromAscension, blackFadeAnim]);

  const [quests, setQuests] = useState<QuestItem[]>([]);
  // Mirrors `quests` synchronously so the handlers below can read the
  // latest list without needing `quests` in their own dependency array —
  // that's what lets them stay referentially stable across renders, which
  // in turn is what lets <QuestListCard> below actually skip re-rendering
  // via React.memo instead of every quest row re-rendering on every
  // unrelated state change in this screen.
  const questsRef = useRef(quests);
  questsRef.current = quests;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedQuest, setSelectedQuest] = useState<QuestItem | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [completedToastVisible, setCompletedToastVisible] = useState(false);
  const [completedToastTitle, setCompletedToastTitle] = useState('Task Completed!');
  const [completedToastSubtitle, setCompletedToastSubtitle] = useState('Great job, hunter!');
  const [dayCompleteModalVisible, setDayCompleteModalVisible] = useState(false);
  const [toastXp, setToastXp] = useState(10);
  const [errorToastVisible, setErrorToastVisible] = useState(false);
  const [errorToastTitle, setErrorToastTitle] = useState('Action Failed');
  const [errorToastSubtitle, setErrorToastSubtitle] = useState('');
  const [taskBottomSheetVisible, setTaskBottomSheetVisible] = useState(false);
  const [taskBottomSheetTitle, setTaskBottomSheetTitle] = useState('You started your proof of health streak!');
  const [taskBottomSheetSubtitle, setTaskBottomSheetSubtitle] = useState<string | undefined>(undefined);
  const [taskBottomSheetXp, setTaskBottomSheetXp] = useState(10);

  // refreshUser defaults to false: useAuthStore.restoreSession() already
  // fetches the user once at app boot, so re-fetching it here too on every
  // plain mount would just duplicate that request. Callers that need fresh
  // XP/streak/level after something actually changed it server-side (a
  // manual pull-to-refresh, or after completeTask/reopenTask) pass true.
  const loadTasks = useCallback(async (options?: { refreshUser?: boolean }) => {
    try {
      setError(null);
      const [tasksData, refreshedUser] = await Promise.all([
        fetchTasksToday(),
        options?.refreshUser ? getCurrentUser() : Promise.resolve(null),
      ]);
      const mappedDaily = (tasksData.daily || []).map((item) => mapTaskToQuest(item, 'daily'));
      const mappedWeekly = (tasksData.weekly || []).map((item) => mapTaskToQuest(item, 'weekly'));
      const mapped = [...mappedDaily, ...mappedWeekly];
      setQuests(mapped);
      if (refreshedUser) {
        useAuthStore.getState().setUser(refreshedUser);
      }

      // Warm the memory+disk cache for every quest image right away rather
      // than waiting for each card to mount. Fire-and-forget: a failed
      // prefetch just falls back to the normal on-demand load in the
      // <ExpoImage> itself, so this never blocks the task list from showing.
      mapped.forEach((quest) => {
        if (quest.image?.uri) {
          ExpoImage.prefetch(quest.image.uri, 'memory-disk').catch(() => {});
        }
      });
    } catch (err: any) {
      console.error('[LoadTasks Error]', err);
      setError(err?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks({ refreshUser: true });
    setRefreshing(false);
  }, [loadTasks]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const displayName = user?.displayName ? user.displayName.toUpperCase() : 'SEYMEN';
  const displayXP = (user?.xp ?? 1240).toLocaleString();
  const displayLevel = user?.level ?? 8;
  const displayStreak = user?.currentStreak ?? user?.user_progression?.daily_streak ?? 16;
  const completedDays =
    user?.completedDaysCount ??
    (user?.week_status?.days
      ? user.week_status.days.filter((d) => d.status === 'DONE' || d.status === 'COMPLETED').length
      : user?.weeklyStreak ?? user?.user_progression?.weekly_streak ?? (displayStreak > 0 ? Math.min(displayStreak, 7) : 1));

  const dailyQuests = quests.filter((q) => q.type === 'daily');
  const weeklyQuests = quests.filter((q) => q.type === 'weekly');

  const todoQuests = quests.filter((q) => q.status === 'todo');
  const doneQuests = quests.filter((q) => q.status === 'done' || q.status === 'partial');
  const skippedQuests = quests.filter((q) => q.status === 'skipped');

  const dailyTodoQuests = todoQuests.filter((q) => q.type === 'daily');
  const weeklyTodoQuests = todoQuests.filter((q) => q.type === 'weekly');
  const dailyDoneQuests = doneQuests.filter((q) => q.type === 'daily');
  const weeklyDoneQuests = doneQuests.filter((q) => q.type === 'weekly');
  const dailySkippedQuests = skippedQuests.filter((q) => q.type === 'daily');
  const weeklySkippedQuests = skippedQuests.filter((q) => q.type === 'weekly');

  // Automatically pop up DayCompleteScreen celebration ONCE per day when all daily tasks are completed/skipped
  useEffect(() => {
    if (loading) return;

    if (dailyQuests.length > 0 && dailyTodoQuests.length === 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const storageKey = `hasShownDayComplete_${todayStr}`;

      AsyncStorage.getItem(storageKey)
        .then((hasShown) => {
          if (!hasShown) {
            AsyncStorage.setItem(storageKey, 'true').catch(() => {});
            const timer = setTimeout(() => {
              setDayCompleteModalVisible(true);
            }, 350);
            return () => clearTimeout(timer);
          }
        })
        .catch((err) => {
          console.warn('[DayCompleteModal] Storage check error:', err);
        });
    }
  }, [loading, dailyQuests.length, dailyTodoQuests.length]);

  const prevTodoCountRef = useRef<number | null>(null);

  // Automatically manage activeTab based on tasks
  useEffect(() => {
    if (!loading) {
      const prevCount = prevTodoCountRef.current;
      const currentCount = todoQuests.length;

      // On initial load, default to 'todo' tab so user can see To-Do tab and Daily Quests Cleared banner
      if (prevCount === null) {
        setActiveTab('todo');
      }
      // Action occurred: task reopened/added back to todo
      else if (currentCount > 0 && prevCount === 0) {
        setActiveTab('todo');
      }

      prevTodoCountRef.current = currentCount;
    }
  }, [loading, todoQuests.length, quests.length]);

  const handleCompleteTask = useCallback(async (
    questId: string,
    actionStatus: 'COMPLETED' | 'PARTIAL' | 'SKIPPED' | 'PENDING'
  ) => {
    const previousQuests = questsRef.current;
    const mappedStatus = actionStatus === 'COMPLETED' ? 'done' : actionStatus === 'PARTIAL' ? 'partial' : actionStatus === 'SKIPPED' ? 'skipped' : 'todo';

    const targetQuest = previousQuests.find(q => q.id === questId);
    if (!targetQuest) return;

    let optimisticEarnedXp = 0;
    if (actionStatus === 'COMPLETED') {
      optimisticEarnedXp = targetQuest.xpReward;
    } else if (actionStatus === 'PARTIAL') {
      optimisticEarnedXp = targetQuest.xpPartial ?? Math.round(targetQuest.xpReward / 2);
    }

    setQuests((prev) =>
      prev.map((q) =>
        q.id === questId
          ? {
              ...q,
              status: mappedStatus,
              earnedXp: actionStatus === 'PENDING' ? undefined : optimisticEarnedXp,
            }
          : q
      )
    );

    if (actionStatus === 'COMPLETED' || actionStatus === 'PARTIAL') {
      const isPartial = actionStatus === 'PARTIAL';
      setCompletedToastTitle(isPartial ? 'Partial Progress!' : 'Task Completed!');
      setCompletedToastSubtitle(
        isPartial ? 'Progress logged · Half XP earned!' : 'Great job, hunter!'
      );
      setToastXp(optimisticEarnedXp);

      // Check if this is the FIRST task completed of the day
      const isFirstTaskOfToday = previousQuests.filter(
        (q) => q.status === 'done' || q.status === 'partial'
      ).length === 0;

      if (isFirstTaskOfToday) {
        // Show celebration bottom sheet ONLY on the first task of the day
        setTaskBottomSheetTitle(`Quest Cleared: ${targetQuest.title}`);
        setTaskBottomSheetSubtitle(
          'One day down. The flame grows stronger with each rise.'
        );
        setTaskBottomSheetXp(optimisticEarnedXp);
        setTaskBottomSheetVisible(true);
      } else {
        // Subsequent tasks completed on the same day show top toast instead
        setCompletedToastVisible(true);
      }

      playTaskDoneSound(isPartial ? 'partial' : 'completed');
    } else {
      setCompletedToastVisible(false);
    }

    try {
      const data = await completeTask(questId, actionStatus);
      const serverStatus = data.status === 'COMPLETED' ? 'done' : data.status === 'PARTIAL' ? 'partial' : data.status === 'SKIPPED' ? 'skipped' : 'todo';

      setQuests((prev) =>
        prev.map((q) =>
          q.id === questId
            ? {
                ...q,
                status: serverStatus,
                earnedXp: data.status === 'PENDING' ? undefined : data.xp_earned,
              }
            : q
        )
      );

      try {
        const refreshedUser = await getCurrentUser();
        useAuthStore.getState().setUser(refreshedUser);
      } catch (userErr) {
        console.error('[RefreshUser Error]', userErr);
      }
    } catch (err: any) {
      console.error('[CompleteTask Error]', err);
      setQuests(previousQuests);
      setCompletedToastVisible(false);

      const status = err.response?.status;
      const message = err.response?.data?.message || err.message || 'Failed to update task';

      if (status === 401) {
        await useAuthStore.getState().logout();
        return;
      }

      if (status === 403) {
        setErrorToastTitle('Task Stale');
        setErrorToastSubtitle('This task is not assigned to you for the current period. Refreshing...');
        setErrorToastVisible(true);
        await loadTasks();
        return;
      }

      setErrorToastTitle('Action Failed');
      setErrorToastSubtitle(message);
      setErrorToastVisible(true);
    }
  }, [loadTasks]);

  // Takes a questId (not a full QuestItem) and stays referentially stable
  // ([handleCompleteTask] never changes identity — see above) specifically
  // so <QuestListCard>'s React.memo isn't defeated by a new function prop
  // on every render.
  const handleOpenQuestActions = useCallback((questId: string) => {
    const quest = questsRef.current.find((q) => q.id === questId);
    if (!quest) return;
    if (quest.allows_partial) {
      setSelectedQuest(quest);
      setActionModalVisible(true);
    } else {
      handleCompleteTask(quest.id, 'COMPLETED');
    }
  }, [handleCompleteTask]);

  const handleDirectSkip = useCallback((questId: string) => {
    handleCompleteTask(questId, 'SKIPPED');
  }, [handleCompleteTask]);

  const handleResetQuest = useCallback(async (questId: string) => {
    const previousQuests = questsRef.current;
    setQuests((prev) =>
      prev.map((q) =>
        q.id === questId ? { ...q, status: 'todo', earnedXp: undefined } : q
      )
    );
    try {
      await reopenTask(questId);
      try {
        const refreshedUser = await getCurrentUser();
        useAuthStore.getState().setUser(refreshedUser);
      } catch (userErr) {
        console.error('[RefreshUser Error]', userErr);
      }
    } catch (err: any) {
      console.error('[ReopenTask Error]', err);
      setQuests(previousQuests);

      const status = err.response?.status;
      const message = err.response?.data?.message || err.message || 'Failed to reopen task';

      if (status === 401) {
        await useAuthStore.getState().logout();
        return;
      }

      setErrorToastTitle('Reopen Failed');
      setErrorToastSubtitle(message);
      setErrorToastVisible(true);
    }
  }, [loadTasks]);

  return (
    <Screen style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#E5A93C"
            colors={["#E5A93C"]}
          />
        }
      >
        {/* TOP HEADER */}
        <View style={styles.topHeader}>
          <View style={styles.userProfileGroup}>
            <View style={styles.avatarWrapper}>
              <ExpoImage
                source={getAvatarSource(user?.avatarUrl, (user as any)?.avatar_id)}
                style={styles.avatarImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                placeholder={{ blurhash: DEFAULT_BLURHASH }}
                transition={150}
              />
              <View style={styles.levelBadgeCircle}>
                <Text style={styles.levelBadgeText}>{displayLevel}</Text>
              </View>
            </View>

            <View style={styles.userTitles}>
              <Text style={styles.greetingText}>HEY, {displayName}!</Text>
              <Text style={styles.xpSubtext}>{displayXP} XP · ARISE, HUNTER.</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.streakPill}>
              <Ionicons name="flame" size={20} color="#FF5500" />
              <Text style={styles.streakText}>{displayStreak}</Text>
            </View>

            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ACTIVE CAMPAIGN SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleWide}>ACTIVE CAMPAIGN</Text>
        </View>

        {/* WEEKLY TRACKER (2ND ITEM) */}
        <WeeklyTracker
          weekStatus={user?.week_status}
          streakDays={displayStreak}
          completedDaysCount={completedDays}
          avatarUrl={user?.avatarUrl}
          avatarId={(user as any)?.avatar_id}
        />

        {/* FILTER TABS ROW */}
        <View style={styles.filterTabsRow}>
          {/* TODO Tab */}
          <Pressable
            style={[
              styles.filterTab,
              activeTab === 'todo' ? styles.filterTabActive : styles.filterTabInactive,
            ]}
            onPress={() => setActiveTab('todo')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeTab === 'todo' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              TODO
            </Text>
            <View
              style={[
                styles.tabBadge,
                activeTab === 'todo' ? styles.tabBadgeActive : styles.tabBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === 'todo' ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive,
                ]}
              >
                {todoQuests.length}
              </Text>
            </View>
          </Pressable>

          {/* DONE Tab */}
          <Pressable
            style={[
              styles.filterTab,
              activeTab === 'done' ? styles.filterTabActive : styles.filterTabInactive,
            ]}
            onPress={() => setActiveTab('done')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeTab === 'done' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              DONE
            </Text>
            <View
              style={[
                styles.tabBadge,
                activeTab === 'done' ? styles.tabBadgeActive : styles.tabBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === 'done' ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive,
                ]}
              >
                {doneQuests.length}
              </Text>
            </View>
          </Pressable>

          {/* SKIPPED Tab */}
          <Pressable
            style={[
              styles.filterTab,
              activeTab === 'skipped' ? styles.filterTabActive : styles.filterTabInactive,
            ]}
            onPress={() => setActiveTab('skipped')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeTab === 'skipped' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              SKIPPED
            </Text>
            <View
              style={[
                styles.tabBadge,
                activeTab === 'skipped' ? styles.tabBadgeActive : styles.tabBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === 'skipped' ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive,
                ]}
              >
                {skippedQuests.length}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* CONDITIONALLY RENDER CONTENT BASED ON ACTIVE FILTER TAB */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E5A93C" />
          </View>
        ) : error ? (
          <View style={styles.emptyStateCard}>
            <Ionicons name="alert-circle-outline" size={56} color="#FF4D6D" />
            <Text style={styles.emptyStateTitle}>Error Loading Tasks</Text>
            <Text style={styles.emptyStateSubtext}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadTasks()}>
              <Text style={styles.retryButtonText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeTab === 'todo' && (
              <>
                {quests.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <Ionicons name="calendar-outline" size={56} color="#71717A" />
                    <Text style={styles.emptyStateTitle}>No Tasks Assigned</Text>
                    <Text style={styles.emptyStateSubtext}>
                      There are no tasks assigned to you for today.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* DAILY QUESTS Section or PEAK REACHED Banner */}
                    {dailyQuests.length > 0 && dailyTodoQuests.length === 0 ? (
                      <LinearGradient
                        colors={['#18181B', '#0E0E10']}
                        style={styles.peakReachedCard}
                      >
                        <View style={styles.peakReachedLeftCol}>
                          <View style={styles.peakHeaderRow}>
                            <Ionicons name="trophy" size={18} color="#E5A93C" style={{ marginRight: 6 }} />
                            <Text style={styles.peakReachedSubtag}>PEAK REACHED</Text>
                          </View>
                          <Text style={styles.peakReachedTitle}>Daily Quests Cleared!</Text>
                          <Text style={styles.peakReachedSubtext}>
                            All objectives successfully resolved for today. Arise, Hunter.
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.peakShareBtn}
                          activeOpacity={0.85}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setDayCompleteModalVisible(true);
                          }}
                        >
                          <Text style={styles.peakShareBtnText}>CELEBRATE</Text>
                          <Ionicons name="sparkles" size={14} color="#0A0A0A" />
                        </TouchableOpacity>
                      </LinearGradient>
                    ) : dailyTodoQuests.length > 0 ? (
                      <>
                        <Text style={styles.sectionMonoLabel}>DAILY QUESTS</Text>
                        {dailyTodoQuests.map((quest) => (
                          <QuestListCard
                            key={quest.id}
                            quest={quest}
                            variant="todo"
                            proteinGoal={user?.daily_protein_goal}
                            onComplete={handleOpenQuestActions}
                            onSkip={handleDirectSkip}
                            onReset={handleResetQuest}
                          />
                        ))}
                      </>
                    ) : null}

                {/* WEEKLY QUESTS Section */}
                {weeklyTodoQuests.length > 0 && (
                  <>
                    <Text style={[styles.sectionMonoLabel, { marginTop: 24 }]}>WEEKLY QUESTS</Text>
                    {weeklyTodoQuests.map((quest) => (
                      <QuestListCard
                        key={quest.id}
                        quest={quest}
                        variant="todo"
                        proteinGoal={user?.daily_protein_goal}
                        onComplete={handleOpenQuestActions}
                        onSkip={handleDirectSkip}
                        onReset={handleResetQuest}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* DONE TAB */}
        {activeTab === 'done' && (
          <>
            {doneQuests.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <ExactMedalIcon size={56} color="#71717A" />
                <Text style={styles.emptyStateTitle}>Nothing Completed Yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap the tick box on any quest to update its status.
                </Text>
              </View>
            ) : (
              <>
                {/* DAILY QUESTS Section */}
                {dailyDoneQuests.length > 0 && (
                  <>
                    <Text style={styles.sectionMonoLabel}>DAILY QUESTS</Text>
                    {dailyDoneQuests.map((quest) => (
                      <QuestListCard
                        key={quest.id}
                        quest={quest}
                        variant="done"
                        proteinGoal={user?.daily_protein_goal}
                        onComplete={handleOpenQuestActions}
                        onSkip={handleDirectSkip}
                        onReset={handleResetQuest}
                      />
                    ))}
                  </>
                )}

                {/* WEEKLY QUESTS Section */}
                {weeklyDoneQuests.length > 0 && (
                  <>
                    <Text style={[styles.sectionMonoLabel, { marginTop: dailyDoneQuests.length > 0 ? 24 : 0 }]}>WEEKLY QUESTS</Text>
                    {weeklyDoneQuests.map((quest) => (
                      <QuestListCard
                        key={quest.id}
                        quest={quest}
                        variant="done"
                        proteinGoal={user?.daily_protein_goal}
                        onComplete={handleOpenQuestActions}
                        onSkip={handleDirectSkip}
                        onReset={handleResetQuest}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* SKIPPED TAB */}
        {activeTab === 'skipped' && (
          <>
            {skippedQuests.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="ban-outline" size={54} color="#71717A" />
                <Text style={styles.emptyStateTitle}>No Skipped Quests</Text>
                <Text style={styles.emptyStateSubtext}>
                  You haven't skipped any quests today.
                </Text>
              </View>
            ) : (
              <>
                {/* DAILY QUESTS Section */}
                {dailySkippedQuests.length > 0 && (
                  <>
                    <Text style={styles.sectionMonoLabel}>DAILY QUESTS</Text>
                    {dailySkippedQuests.map((quest) => (
                      <QuestListCard
                        key={quest.id}
                        quest={quest}
                        variant="skipped"
                        proteinGoal={user?.daily_protein_goal}
                        onComplete={handleOpenQuestActions}
                        onSkip={handleDirectSkip}
                        onReset={handleResetQuest}
                      />
                    ))}
                  </>
                )}

                {/* WEEKLY QUESTS Section */}
                {weeklySkippedQuests.length > 0 && (
                  <>
                    <Text style={[styles.sectionMonoLabel, { marginTop: dailySkippedQuests.length > 0 ? 24 : 0 }]}>WEEKLY QUESTS</Text>
                    {weeklySkippedQuests.map((quest) => (
                      <QuestListCard
                        key={quest.id}
                        quest={quest}
                        variant="skipped"
                        proteinGoal={user?.daily_protein_goal}
                        onComplete={handleOpenQuestActions}
                        onSkip={handleDirectSkip}
                        onReset={handleResetQuest}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      {/* Quest Action Selection Modal (Partial, Skip, Complete) */}
      <QuestActionModal
        visible={actionModalVisible}
        questTitle={selectedQuest?.title ?? ''}
        questCategory={selectedQuest?.category ?? ''}
        xpReward={selectedQuest?.xpReward ?? 0}
        questTargetValue={selectedQuest?.targetValue ?? undefined}
        onClose={() => setActionModalVisible(false)}
        onFullComplete={() => {
          if (selectedQuest) {
            handleCompleteTask(selectedQuest.id, 'COMPLETED');
          }
          setActionModalVisible(false);
        }}
        onPartialComplete={() => {
          if (selectedQuest) {
            handleCompleteTask(selectedQuest.id, 'PARTIAL');
          }
          setActionModalVisible(false);
        }}
        onSkip={() => {
          if (selectedQuest) {
            handleCompleteTask(selectedQuest.id, 'SKIPPED');
          }
          setActionModalVisible(false);
        }}
      />
      {/* Loot Drop Modal */}
      <LootDropModal visible={dropVisible} rarity={lastDrop} onDismiss={() => setDropVisible(false)} />

      {/* Task Completed Toast Popup */}
      <TaskCompletedToast
        visible={completedToastVisible}
        xp={toastXp}
        title={completedToastTitle}
        subtitle={completedToastSubtitle}
        onDismiss={() => setCompletedToastVisible(false)}
      />

      {/* Error Toast Popup */}
      <TaskCompletedToast
        visible={errorToastVisible}
        title={errorToastTitle}
        subtitle={errorToastSubtitle}
        isError={true}
        onDismiss={() => setErrorToastVisible(false)}
      />

      {/* Task Completion Celebration Bottom Sheet Modal */}
      <TaskCompletionBottomSheet
        visible={taskBottomSheetVisible}
        title={taskBottomSheetTitle}
        subtitle={taskBottomSheetSubtitle}
        streakDays={displayStreak}
        xp={taskBottomSheetXp}
        weekStatus={user?.week_status}
        onClose={() => setTaskBottomSheetVisible(false)}
        onContinue={() => setTaskBottomSheetVisible(false)}
      />

      {/* Day Complete Modal Popup */}
      {dayCompleteModalVisible && (
        <DayCompleteScreen
          quests={quests}
          onContinue={() => setDayCompleteModalVisible(false)}
        />
      )}

      {/* Full-Screen Black View Fade-Out (Matches Intro Audio) */}
      {showBlackIntroOverlay && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: '#000000',
              opacity: blackFadeAnim,
              zIndex: 99999,
            },
          ]}
          pointerEvents="none"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* Peak Reached Completion Banner */
  peakReachedCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 20,
  },
  peakReachedLeftCol: {
    flex: 1,
    marginRight: 16,
  },
  peakReachedSubtag: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: '#FF6A00',
    letterSpacing: 1.5,
  },
  peakReachedTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: '#FFFFFF',
    marginTop: 4,
  },
  peakShareBtn: {
    backgroundColor: '#FAF8F5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  peakShareBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: '#0A0A0A',
    letterSpacing: 1,
  },
  screen: {
    backgroundColor: '#09090B',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },

  /* Top Header */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  userProfileGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#3F3F46',
  },
  levelBadgeCircle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#18181B',
    borderWidth: 1.5,
    borderColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: '#FFFFFF',
  },
  userTitles: {
    justifyContent: 'center',
  },
  greetingText: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  xpSubtext: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#191817',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#8A3B18',
    shadowColor: '#FF5500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  streakText: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Active Campaign */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleWide: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  dayCounterText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#A1A1AA',
  },
  campaignCardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  campaignBgImage: {
    width: '100%',
    height: 180,
  },
  campaignBgStyle: {
    resizeMode: 'cover',
  },
  campaignOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 16,
    justifyContent: 'space-between',
  },
  campaignTitleContainer: {
    marginTop: 4,
  },
  campaignTitleLine: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 2,
    lineHeight: 32,
  },
  campaignDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  campaignDetailLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#A1A1AA',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  campaignDetailValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* Filter Tabs */
  filterTabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
  },
  filterTabActive: {
    backgroundColor: '#E4E4E7',
  },
  filterTabInactive: {
    backgroundColor: '#161618',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  filterTabText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    letterSpacing: 0.8,
  },
  filterTabTextActive: {
    color: '#09090B',
  },
  filterTabTextInactive: {
    color: '#E4E4E7',
  },
  tabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  tabBadgeInactive: {
    backgroundColor: '#27272A',
  },
  tabBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
  },
  tabBadgeTextActive: {
    color: '#09090B',
  },
  tabBadgeTextInactive: {
    color: '#A1A1AA',
  },

  /* Main Quests */
  sectionMonoLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: '#71717A',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  fullImageQuestCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#121215',
  },
  fullCardImageBg: {
    width: '100%',
    height: 145,
  },
  fullCardImageStyle: {
    resizeMode: 'cover',
  },
  fullCardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: 14,
    justifyContent: 'space-between',
  },
  fullCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orangeXpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  orangeXpBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  fullCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  fullCardTextCol: {
    flex: 1,
    paddingRight: 10,
    gap: 4,
  },
  fullCardTitleText: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  fullCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullCardMetaText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#E4E4E7',
  },
  fullCardMetaDivider: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#71717A',
  },
  // Card-level quest styles (questCard, questImage*, xpBadge*, category*,
  // targetValue*, tick/wrong buttons, ...) moved to QuestListCard.tsx along
  // with the JSX that used them.
  creamSquareTickButtonChecked: {
    backgroundColor: '#22C55E',
  },
  categoryPillDivider: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: '#52525B',
  },
  questActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressSubtext: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: '#A1A1AA',
  },
  progressPercentText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#27272A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E4E4E7',
    borderRadius: 2,
  },

  /* Daily Quests */
  dailyGridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dailyCard: {
    flex: 1,
    backgroundColor: '#121215',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    overflow: 'hidden',
  },
  dailyImageWrapper: {
    height: 140,
  },
  dailyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dailyBody: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    flex: 1,
  },
  dailyRewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyRewardText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: '#A1A1AA',
  },
  dailyProgressSubtext: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: '#A1A1AA',
  },
  dailyProgressPercentText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },

  /* Empty State Card */
  emptyStateCard: {
    backgroundColor: '#121215',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingVertical: 56,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  emptyStateTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: '#A1A1AA',
    textAlign: 'center',
  },

  /* Badges & Reset Actions */
  doneBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  partialBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#E5A93C',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    color: '#000000',
    letterSpacing: 0.5,
  },
  peakHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  peakReachedSubtext: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 4,
    lineHeight: 16,
  },
});
