import React, { useRef, useState, useEffect } from 'react';
import {
  Alert,
  Animated,
  Clipboard,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from '@/components/common/ViewShotCompat';
import type { ViewShotHandle } from '@/types/viewShot';
import RNShare from '@/services/share/RNShare';
import { Screen } from '@/components/common/Screen';
import { CLOUDINARY_ASSETS } from '@/constants/cloudinaryAssets';
import { optimizeCloudinaryUrl, DEFAULT_BLURHASH } from '@/services/media/cloudinary';
import { fontFamilies } from '@/theme/typography';

export interface InviteFriendsModalProps {
  visible: boolean;
  onClose: () => void;
  referralCode?: string;
  displayName?: string;
}

export function InviteFriendsModal({
  visible,
  onClose,
  referralCode = 'HX-9824X',
  displayName = 'SYSTEM',
}: InviteFriendsModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const referralLink = `https://join.hunterx.app/guestpass/${referralCode}`;
  const guestPassCardRef = useRef<ViewShotHandle>(null);

  // Scan Line Animation Value
  const scanAnim = useRef(new Animated.Value(0)).current;
  // Glow Pulse Animation Value
  const glowAnim = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    let animation: any = null;
    const startScanAnimation = () => {
      scanAnim.setValue(0);
      animation = Animated.timing(scanAnim, {
        toValue: 135,
        duration: 3400,
        useNativeDriver: true,
      });
      animation.start(({ finished }: { finished: boolean }) => {
        if (finished) {
          startScanAnimation();
        }
      });
    };

    if (visible) {
      startScanAnimation();
    } else {
      scanAnim.setValue(0);
      if (animation) animation.stop();
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [visible, scanAnim]);

  useEffect(() => {
    let animation: any = null;
    const startGlowAnimation = () => {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.55,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.25,
            duration: 2200,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    };

    if (visible) {
      startGlowAnimation();
    } else {
      glowAnim.setValue(0.25);
      if (animation) animation.stop();
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [visible, glowAnim]);

  const handleCopyLink = () => {
    setIsCopied(true);
    Clipboard.setString(referralLink);
    Alert.alert('Link Copied!', 'Your unique referral link has been copied to clipboard.');
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleSendInvitation = async () => {
    const shareMessage = `Claim a free week of HunterX with my Guest Pass! Use code: ${referralCode}\n\nJoin here: ${referralLink}`;

    try {
      const cardImageUri = await guestPassCardRef.current?.capture?.();
      await RNShare.open({
        title: 'HunterX Guest Pass',
        message: shareMessage,
        url: cardImageUri,
        failOnCancel: false,
      });
    } catch (error: any) {
      if (error?.message === 'User did not share') return;
      try {
        await Share.share({
          message: shareMessage,
          title: 'HunterX Guest Pass',
        });
      } catch (fallbackError) {
        console.log('Fallback share failed:', fallbackError);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Screen style={styles.screen}>
        {/* Header Bar */}
        <View style={styles.inviteHeaderBar}>
          <TouchableOpacity
            style={styles.editBackBtn}
            onPress={onClose}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.inviteHeaderTitle}>Invite Friends</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.inviteScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Headline */}
          <View style={styles.inviteHeadlineGroup}>
            <Text style={styles.inviteHeadlineText}>
              Share HunterX Access with Your Friends
            </Text>
            <Text style={styles.inviteSubheadlineText}>
              Unlock legendary workouts & level up together!
            </Text>
          </View>

          {/* CARD GLOW CONTAINER */}
          <View style={styles.guestPassCardGlowContainer}>
            {/* Pulsing Glow Background Layer */}
            <Animated.View style={[styles.guestPassPulseGlowLayer, { opacity: glowAnim }]} />

            {/* REVAMPED ANIME HERO GUEST PASS CARD */}
            <ViewShot
              ref={guestPassCardRef}
              options={{ format: 'png', quality: 1 }}
              style={{ width: '100%', borderRadius: 20, overflow: 'hidden' }}
            >
              <View style={styles.guestPassCardWrapper}>
                <Image
                  source={{ uri: optimizeCloudinaryUrl(CLOUDINARY_ASSETS.refer_bg.uri) }}
                  style={styles.guestPassAnimeArtBg}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  placeholder={{ blurhash: DEFAULT_BLURHASH }}
                  transition={150}
                />

                {/* Scanning Line Animation Layer */}
                <Animated.View
                  style={[
                    styles.scanLineContainer,
                    {
                      transform: [{ translateY: scanAnim }],
                      opacity: scanAnim.interpolate({
                        inputRange: [0, 15, 100, 115],
                        outputRange: [0, 0.25, 0.25, 0],
                      }),
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['rgba(254, 91, 1, 0)', 'rgba(254, 91, 1, 0.25)', 'rgba(254, 91, 1, 0)']}
                    style={styles.scanLineGlow}
                  />
                  <View style={styles.scanLineCore} />
                </Animated.View>

                <LinearGradient
                  colors={['rgba(10, 15, 30, 0.45)', 'rgba(6, 10, 22, 0.65)', 'rgba(10, 18, 36, 0.85)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.guestPassGradientOverlay}
                >
                  {/* Top Row: Legendary Badge and Sys Req */}
                  <View style={styles.guestPassTopRow}>
                    <View style={styles.guestPassRarityBadge}>
                      <View style={styles.starCircleIcon}>
                        <Ionicons name="star" size={7} color="#0E1116" />
                      </View>
                      <Text style={styles.guestPassRarityText}>LEGENDARY GUEST PASS</Text>
                    </View>
                    <View style={styles.guestPassSysReqGroup}>
                      <Text style={styles.guestPassAuthText}>Code : {referralCode}</Text>
                    </View>
                  </View>

                  {/* Main Titles Overlay */}
                  <View style={styles.guestPassCenterTextGroup}>
                    <Text style={styles.guestPassMainTitle}>Guest Pass</Text>
                    <Text style={styles.guestPassSubTitle}>ALL-ACCESS HUNTER PASS</Text>

                    {/* Integrated Awakening Bonus Badge */}
                    <LinearGradient
                      colors={['rgba(254, 91, 1, 0.3)', 'rgba(254, 91, 1, 0.08)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.guestPassRewardBadge}
                    >
                      <View style={styles.guestPassRewardIconWrap}>
                        <Ionicons name="sparkles" size={10} color="#FE5B01" />
                      </View>
                      <Text style={styles.guestPassRewardText}>
                        AWAKENING BONUS <Text style={styles.guestPassRewardXp}>+50 XP</Text>
                      </Text>
                    </LinearGradient>
                  </View>

                  {/* Bottom Row */}
                  <View style={styles.guestPassFooterRow}>
                    <View style={styles.guestPassBrandGroup}>
                      <View style={styles.guestPassIconBadge}>
                        <MaterialCommunityIcons name="sword-cross" size={13} color="#FFFFFF" />
                      </View>
                      <Text style={styles.guestPassBrandText}>HunterX.</Text>
                    </View>
                    <View style={styles.guestPassIssuerBadge}>
                      <Text style={styles.guestPassIssuerText}>
                        ISSUED BY {displayName ? displayName.toUpperCase() : 'SYSTEM'}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </ViewShot>
          </View>

          {/* Unique Referral Link Section */}
          <View style={styles.referralSectionContainer}>
            <Text style={styles.referralSectionHeader}>Your unique referral link</Text>

            <View style={styles.referralDottedInputBox}>
              <Text style={styles.referralUrlText} numberOfLines={1}>
                {referralLink}
              </Text>
              <TouchableOpacity
                style={styles.copyPillBtn}
                onPress={handleCopyLink}
                activeOpacity={0.8}
              >
                <Text style={styles.copyPillText}>{isCopied ? 'Copied!' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.referralSubtext}>
              Only new hunters may pass through this gate
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Send Invitation Action Button */}
        <View style={styles.bottomInviteBtnWrapper}>
          <TouchableOpacity
            style={styles.sendInvitePillBtn}
            onPress={handleSendInvitation}
            activeOpacity={0.85}
          >
            <Ionicons name="paper-plane" size={18} color="#000000" />
            <Text style={styles.sendInviteBtnText}>Awaken a Hunter</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  inviteHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#242428',
    height: 56,
  },
  editBackBtn: {
    width: 48,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  inviteHeaderTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  inviteScrollContent: {
    padding: 20,
    alignItems: 'center',
    gap: 20,
    paddingBottom: 110,
  },
  inviteHeadlineGroup: {
    alignItems: 'center',
    gap: 6,
  },
  inviteHeadlineText: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
  },
  inviteSubheadlineText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  guestPassCardGlowContainer: {
    width: '100%',
    position: 'relative',
  },
  guestPassPulseGlowLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: '#0A0E17',
    shadowColor: '#FE5B01',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 10,
  },
  guestPassCardWrapper: {
    width: '100%',
    height: 245,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0A0E17',
  },
  guestPassAnimeArtBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  guestPassGradientOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  scanLineContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 16,
    justifyContent: 'center',
    zIndex: 2,
  },
  scanLineGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 16,
  },
  scanLineCore: {
    height: 1.5,
    backgroundColor: 'rgba(254, 91, 1, 0.5)',
    width: '100%',
  },
  guestPassTopRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  guestPassRarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: '#FE5B01',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  guestPassRarityText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    fontWeight: '900',
    color: '#FE5B01',
    letterSpacing: 0.5,
  },
  starCircleIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FE5B01',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestPassSysReqGroup: {
    alignItems: 'flex-end',
  },
  guestPassAuthText: {
    fontFamily: fontFamilies.bold,
    fontSize: 8.5,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  guestPassCenterTextGroup: {
    position: 'absolute',
    bottom: 44,
    left: 12,
    zIndex: 10,
  },
  guestPassMainTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  guestPassSubTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FE5B01',
    letterSpacing: 1.2,
    marginTop: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  guestPassRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(254, 91, 1, 0.5)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(10, 15, 30, 0.7)',
  },
  guestPassRewardIconWrap: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(254, 91, 1, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestPassRewardText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
  },
  guestPassRewardXp: {
    fontFamily: fontFamilies.bold,
    fontWeight: '900',
    color: '#FE5B01',
  },
  guestPassFooterRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  guestPassBrandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guestPassIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#22D3EE',
  },
  guestPassBrandText: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  guestPassIssuerBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.75,
    borderColor: 'rgba(34, 211, 238, 0.25)',
  },
  guestPassIssuerText: {
    fontFamily: fontFamilies.bold,
    fontSize: 7.5,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  referralSectionContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  referralSectionHeader: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  referralDottedInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#16161C',
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#3F3F46',
    borderStyle: 'dashed',
    paddingVertical: 8,
    paddingLeft: 18,
    paddingRight: 8,
  },
  referralUrlText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#A1A1AA',
    flex: 1,
    marginRight: 10,
  },
  copyPillBtn: {
    backgroundColor: '#E4E4E7',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  copyPillText: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#09090B',
  },
  referralSubtext: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#71717A',
    textAlign: 'center',
  },
  bottomInviteBtnWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  sendInvitePillBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  sendInviteBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.3,
  },
});
