import React from 'react';
import {
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { fontFamilies } from '@/theme/typography';

const HERO_BG = require('@/assets/images/leaderboardone.png');
const QUESTION_MARKDOWN_BG = require('@/assets/images/questionmarkdown.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LeaderboardHelpModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LeaderboardHelpModal: React.FC<LeaderboardHelpModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <StatusBar barStyle="light-content" backgroundColor="#020203" />

        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. TOP HERO HEADER */}
            <View style={styles.heroHeader}>
              <Image source={HERO_BG} style={styles.heroBgImage} resizeMode="cover" />

              {/* Gradient overlays */}
              <LinearGradient
                colors={['rgba(2, 2, 3, 0.45)', 'transparent', 'rgba(2, 2, 3, 0.85)', '#020203']}
                locations={[0, 0.3, 0.75, 1]}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />

              {/* Close Button (Top Right) */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color="#F4F5F6" />
              </TouchableOpacity>

              {/* Top Right Slanted Orange/Red Handwritten Creed */}
              <View style={styles.topRightCreed}>
                <Text style={styles.topCreedText}>HUNT</Text>
                <Text style={styles.topCreedText}>COMPETE</Text>
                <Text style={styles.topCreedText}>IMPROVE</Text>
              </View>

              {/* Header Title & Subtitle */}
              <View style={styles.heroTitleGroup}>
                <Text style={styles.guideMainTitle}>Leaderboard Guide</Text>
                <Text style={styles.guideSubtitle}>
                  Everything you need to know about{'\n'}HunterX Leaderboards.
                </Text>
              </View>
            </View>

            {/* 2. GUIDE FEATURE CARDS LIST */}
            <View style={styles.cardsContainer}>
              {/* Card 1: What is the Leaderboard? */}
              <View style={styles.guideCard}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="crown" size={20} color="#F3AF72" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>What is the Leaderboard?</Text>
                  <Text style={styles.cardDesc}>
                    The leaderboard shows Hunters from around the world ranked by their activity and consistency. It's a place to celebrate progress and stay motivated together.
                  </Text>
                </View>
              </View>

              {/* Card 2: Ranking Periods */}
              <View style={styles.guideCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="calendar" size={19} color="#F12730" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Ranking Periods</Text>
                  <Text style={styles.cardDesc}>
                    You can view rankings for Today, This Week, This Month, or All Time.
                  </Text>
                </View>
              </View>

              {/* Card 3: Leaderboard Tabs */}
              <View style={styles.guideCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="people" size={20} color="#F12730" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Leaderboard Tabs</Text>
                  <View style={styles.tabListGroup}>
                    <View style={styles.tabRow}>
                      <View style={[styles.bulletDot, { backgroundColor: '#F12730' }]} />
                      <Text style={styles.tabDesc}>
                        <Text style={styles.tabBold}>Global</Text> – Compete with all HunterX users worldwide.
                      </Text>
                    </View>
                    <View style={styles.tabRow}>
                      <View style={[styles.bulletDot, { backgroundColor: '#F3AF72' }]} />
                      <Text style={styles.tabDesc}>
                        <Text style={styles.tabBold}>Friends</Text> – See how you rank among your friends.
                      </Text>
                    </View>
                    <View style={styles.tabRow}>
                      <View style={[styles.bulletDot, { backgroundColor: '#B8C6D1' }]} />
                      <Text style={styles.tabDesc}>
                        <Text style={styles.tabBold}>Gen Z</Text> – A special leaderboard for Gen Z Hunters.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Card 4: How Points are Calculated */}
              <View style={styles.guideCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="flame" size={20} color="#F12730" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>How Points are Calculated</Text>
                  <Text style={styles.cardDesc}>
                    Your points (XP) are calculated from your daily hunter achievements:
                  </Text>
                  <View style={styles.tabListGroup}>
                    <View style={styles.tabRow}>
                      <View style={[styles.bulletDot, { backgroundColor: '#F12730' }]} />
                      <Text style={styles.tabDesc}>
                        <Text style={styles.tabBold}>Daily Quests & Missions</Text> – Complete daily discipline tasks and healthy habits to earn XP.
                      </Text>
                    </View>
                    <View style={styles.tabRow}>
                      <View style={[styles.bulletDot, { backgroundColor: '#F3AF72' }]} />
                      <Text style={styles.tabDesc}>
                        <Text style={styles.tabBold}>Steps & Physical Activity</Text> – Reach your daily step milestones and log active workouts.
                      </Text>
                    </View>
                    <View style={styles.tabRow}>
                      <View style={[styles.bulletDot, { backgroundColor: '#B8C6D1' }]} />
                      <Text style={styles.tabDesc}>
                        <Text style={styles.tabBold}>Daily Streaks</Text> – Maintain consecutive day streaks to earn bonus XP multipliers and climb the ranks.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Card 5: Your Rank */}
              <View style={styles.guideCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="star" size={19} color="#F3AF72" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Your Rank</Text>
                  <Text style={styles.cardDesc}>
                    Your current rank is highlighted, so you can easily see where you stand.
                  </Text>
                </View>
              </View>

              {/* Card 6: Levels */}
              <View style={styles.guideCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="arrow-up" size={20} color="#F12730" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Levels</Text>
                  <Text style={styles.cardDesc}>
                    As you earn more points, you level up. Higher levels unlock new milestones and recognition.
                  </Text>
                </View>
              </View>

              {/* Card 7: Be a Better You */}
              <View style={styles.guideCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="flag" size={19} color="#F12730" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Be a Better You</Text>
                  <Text style={styles.cardDesc}>
                    The leaderboard isn't just about competition. It's about building a healthier, stronger you — together with the HunterX community.
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. BOTTOM FOOTER ARTWORK & CREEDS (questionmarkdown.png) */}
            <View style={styles.footerGraphicContainer}>
              <Image source={QUESTION_MARKDOWN_BG} style={styles.footerBgImage} resizeMode="cover" />

              {/* Top and Bottom Fades */}
              <LinearGradient
                colors={['#020203', 'transparent', '#020203']}
                locations={[0, 0.35, 1]}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />

              {/* Left Creed */}
              <View style={styles.bottomLeftCreed}>
                <Text style={styles.bottomCreedHandwritten}>DIFFERENT</Text>
                <Text style={styles.bottomCreedHandwritten}>JOURNEYS.</Text>
                <Text style={styles.bottomCreedHandwritten}>SAME GOAL.</Text>
              </View>

              {/* Right Creed */}
              <View style={styles.bottomRightCreed}>
                <Text style={styles.bottomPillarText}>A</Text>
                <Text style={styles.bottomPillarText}>STRONGER</Text>
                <Text style={styles.bottomPillarText}>YOU</Text>
                <Text style={styles.bottomPillarText}>GOES</Text>
                <Text style={styles.bottomPillarText}>FURTHER</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#020203',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  /* HERO HEADER */
  heroHeader: {
    width: '100%',
    height: 220,
    position: 'relative',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  heroBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  topRightCreed: {
    position: 'absolute',
    top: 50,
    right: 20,
    alignItems: 'flex-end',
    transform: [{ rotate: '-8deg' }],
  },
  topCreedText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
    lineHeight: 15,
    letterSpacing: 1,
    textShadowColor: 'rgba(239, 68, 68, 0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  heroTitleGroup: {
    zIndex: 20,
  },
  guideMainTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  guideSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: '#A1A1AA',
    lineHeight: 18,
  },

  /* CARDS LIST */
  cardsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#121215',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242428',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#2A2A30',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#A1A1AA',
    lineHeight: 17,
  },
  tabListGroup: {
    marginTop: 4,
    gap: 6,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  tabDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#A1A1AA',
    flex: 1,
    lineHeight: 16,
  },
  tabBold: {
    fontFamily: fontFamilies.bold,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* BOTTOM FOOTER */
  footerGraphicContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    marginTop: 16,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  footerBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  bottomLeftCreed: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    transform: [{ rotate: '-8deg' }],
  },
  bottomCreedHandwritten: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
    lineHeight: 16,
    letterSpacing: 1,
    textShadowColor: 'rgba(239, 68, 68, 0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  bottomRightCreed: {
    position: 'absolute',
    bottom: 20,
    right: 18,
    alignItems: 'flex-end',
  },
  bottomPillarText: {
    fontFamily: fontFamilies.bold,
    fontSize: 7.5,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 1.2,
    lineHeight: 11,
  },
});

