import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '@/components/common/Screen';
import { LeaderboardHeroHeader } from '@/components/features/leaderboard/LeaderboardHeroHeader';
import {
  TopCategoryFilterBar,
  type MainCategoryTab,
} from '@/components/features/leaderboard/LeaderboardFilterPills';
import { LeaderboardCommunityCard } from '@/components/features/leaderboard/LeaderboardCommunityCard';
import {
  LeaderboardHunterRow,
  type LeaderboardHunter,
} from '@/components/features/leaderboard/LeaderboardHunterRow';
import { LeaderboardHelpModal } from '@/components/features/leaderboard/LeaderboardHelpModal';
import { LeaderboardTop5Modal } from '@/components/features/leaderboard/LeaderboardTop5Modal';
import { useAvatarsReady } from '@/services/api/avatar.service';

import { useAuth } from '@/hooks/useAuth';

// Rich Cloudinary Avatar CDN URLs for crisp anime avatars
const AVATARS = {
  jinwoo: 'https://res.cloudinary.com/sc8zzixt/image/upload/f_auto,q_auto/v1788468328/hunterx/app-assets/arise_avatar_11.jpg',
  gojo: 'https://res.cloudinary.com/sc8zzixt/image/upload/f_auto,q_auto/v1788468328/hunterx/app-assets/arise_avatar_2.jpg',
  femaleHunter: 'https://res.cloudinary.com/sc8zzixt/image/upload/f_auto,q_auto/v1788468328/hunterx/app-assets/arise_avatar_4.jpg',
  hunter4: 'https://res.cloudinary.com/sc8zzixt/image/upload/f_auto,q_auto/v1788468328/hunterx/app-assets/arise_avatar_1.jpg',
  hunter5: 'https://res.cloudinary.com/sc8zzixt/image/upload/f_auto,q_auto/v1788468328/hunterx/app-assets/arise_avatar_3.jpg',
  hunter6: 'https://res.cloudinary.com/sc8zzixt/image/upload/f_auto,q_auto/v1788468328/hunterx/app-assets/arise_avatar_5.jpg',
  hunter7: 'https://res.cloudinary.com/sc8zzixt/image/upload/f_auto,q_auto/v1788468328/hunterx/app-assets/arise_avatar_6.jpg',
  hunter8: 'https://res.cloudinary.com/sc8zzixt/image/upload/f_auto,q_auto/v1788468328/hunterx/app-assets/arise_avatar_7.jpg',
  hunter9: 'https://res.cloudinary.com/sc8zzixt/image/upload/f_auto,q_auto/v1788468328/hunterx/app-assets/arise_avatar_8.jpg',
  hunter10: 'https://res.cloudinary.com/sc8zzixt/image/upload/f_auto,q_auto/v1788468328/hunterx/app-assets/arise_avatar_9.jpg',
  currentUser: 'https://res.cloudinary.com/sc8zzixt/image/upload/f_auto,q_auto/v1788468328/hunterx/app-assets/arise_avatar_11.jpg',
};

const ALL_HUNTERS: LeaderboardHunter[] = [
  // Top 3 Featured Hunters (Rendered as Cards with Crowns)
  {
    id: '1',
    rank: 1,
    displayName: 'ShadowRise',
    score: 237420,
    level: 28,
    avatarUrl: AVATARS.jinwoo,
    quote: 'BUILT\nDIFFERENT',
  },
  {
    id: '2',
    rank: 2,
    displayName: 'Zenith',
    score: 229880,
    level: 26,
    avatarUrl: AVATARS.gojo,
    quote: 'DISCIPLINE\nWINS',
  },
  {
    id: '3',
    rank: 3,
    displayName: 'Nova',
    score: 218540,
    level: 25,
    avatarUrl: AVATARS.femaleHunter,
    quote: 'PROGRESS\nOVER\nPERFECTION',
  },
  // Ranks 4+ Hunters
  {
    id: '4',
    rank: 4,
    displayName: 'PixelPulse',
    score: 201365,
    level: 24,
    avatarUrl: AVATARS.hunter4,
    quote: 'CONSISTENCY\nCREATES\nFREEDOM',
  },
  {
    id: '5',
    rank: 5,
    displayName: 'NightRunner',
    score: 198430,
    level: 24,
    avatarUrl: AVATARS.hunter5,
    quote: 'SMALL\nSTEPS\nBIGGER YOU',
  },
  {
    id: '6',
    rank: 6,
    displayName: 'StrideSenpai',
    score: 189210,
    level: 23,
    avatarUrl: AVATARS.hunter6,
    quote: 'GOOD\nHABITS\nBRIGHTER DAYS',
  },
  {
    id: '7',
    rank: 7,
    displayName: 'MotionMind',
    score: 176980,
    level: 22,
    avatarUrl: AVATARS.hunter7,
    quote: 'ANOTHER\nSTEP\nFORWARD',
  },
  {
    id: '8',
    rank: 8,
    displayName: 'GoalGetter',
    score: 165740,
    level: 21,
    avatarUrl: AVATARS.hunter8,
    quote: 'DISCIPLINE\nTODAY\nFREEDOM TOMORROW',
  },
  {
    id: '9',
    rank: 9,
    displayName: 'AlphaKai',
    score: 158620,
    level: 21,
    avatarUrl: AVATARS.hunter9,
    quote: 'MIND MOVES\nMOUNTAINS',
  },
  {
    id: '10',
    rank: 10,
    displayName: 'FitPhantom',
    score: 152300,
    level: 20,
    avatarUrl: AVATARS.hunter10,
    quote: 'SILENT PROGRESS\nLOUD RESULTS',
  },
];

export default function LeaderboardScreen() {
  const { user } = useAuth();
  useAvatarsReady();

  const currentUserData = useMemo<LeaderboardHunter>(() => {
    const userLevel = user?.user_progression?.current_level ?? user?.level ?? 20;
    const userXp = user?.user_progression?.total_xp ?? user?.xp ?? 142350;
    const userAvatar = user?.avatarUrl || AVATARS.currentUser;
    const userName = user?.displayName || user?.name || 'You';

    return {
      id: user?.id || 'current-user-12',
      rank: 12,
      displayName: userName,
      score: userXp,
      level: userLevel,
      avatarUrl: userAvatar,
      quote: 'KEEP\nHUNTING',
      isCurrentUser: true,
    };
  }, [user]);

  // Filters State
  const [category, setCategory] = useState<MainCategoryTab>('Global');

  // Modals State
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [top5ModalVisible, setTop5ModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  }, []);

  // Filtered rows based on category
  const filteredHunters = useMemo(() => {
    let list = ALL_HUNTERS;

    if (category === 'Friends') {
      list = list.slice(0, 5);
    } else if (category === 'Gen Z') {
      list = list.filter((_, idx) => idx % 2 === 0);
    }

    return list;
  }, [category]);

  const top3Hunters = useMemo(() => {
    return filteredHunters.filter((h) => h.rank <= 3);
  }, [filteredHunters]);

  const remainingHunters = useMemo(() => {
    return filteredHunters.filter((h) => h.rank > 3);
  }, [filteredHunters]);

  return (
    <Screen style={styles.screenContainer} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#09090B" />

      {/* Deep dark canvas background matching profile screen */}
      <LinearGradient
        colors={['#09090B', '#09090B', '#060608']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FE5B01"
            colors={['#FE5B01']}
          />
        }
      >
        {/* 1. HERO HEADER WITH LEADERBOARDONE.PNG */}
        <LeaderboardHeroHeader
          onInfoPress={() => setHelpModalVisible(true)}
        />

        {/* 2. CATEGORY FILTER BAR (Global | Friends | Gen Z) */}
        <TopCategoryFilterBar
          category={category}
          onSelectCategory={setCategory}
        />

        {/* 3. YOU • TOP 5% PROMO CARD */}
        <LeaderboardCommunityCard
          onPress={() => setTop5ModalVisible(true)}
        />

        {/* 4. TOP 3 FEATURED HUNTER CARDS (Ranks 1, 2, 3) */}
        <View style={styles.top3Container}>
          {top3Hunters.map((hunter) => (
            <LeaderboardHunterRow
              key={hunter.id}
              hunter={hunter}
            />
          ))}
        </View>

        {/* 5. REGULAR RANKED LIST (Ranks 4 - 10+) */}
        <View style={styles.rankListContainer}>
          {remainingHunters.map((hunter) => (
            <LeaderboardHunterRow
              key={hunter.id}
              hunter={hunter}
            />
          ))}
        </View>

        {/* 6. CURRENT USER HIGHLIGHTED CARD (Rank 12) */}
        <LeaderboardHunterRow
          hunter={currentUserData}
        />
      </ScrollView>

      {/* Rules / Help Modal */}
      <LeaderboardHelpModal
        visible={helpModalVisible}
        onClose={() => setHelpModalVisible(false)}
      />

      {/* You • Top 5% Detailed Modal */}
      <LeaderboardTop5Modal
        visible={top5ModalVisible}
        onClose={() => setTop5ModalVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  top3Container: {
    marginTop: 4,
    marginBottom: 4,
  },
  rankListContainer: {
    marginTop: 2,
    marginBottom: 4,
  },
});

