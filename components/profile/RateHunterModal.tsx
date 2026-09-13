import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen } from '@/components/common/Screen';
import { fontFamilies } from '@/theme/typography';
import { CLOUDINARY_ASSETS } from '@/constants/cloudinaryAssets';
import { optimizeCloudinaryUrl, DEFAULT_BLURHASH } from '@/services/media/cloudinary';
import { submitRating } from '@/services/api/rating.service';
import { showGlobalToast } from '@/store/useToastStore';

const HAS_SHOWN_STORE_REVIEW_KEY = 'hasShownStoreReviewPrompt';
const STORE_REVIEW_PROMPT_DELAY_MS = 800;

/**
 * Requests the native App Store / Play Store review prompt.
 *
 * Must run only after the calling modal has fully finished dismissing —
 * iOS's SKStoreReviewController (and Android's in-app review sheet) will
 * silently no-op if it's called while another native view transition
 * (e.g. this screen's own Modal closing) is still in flight.
 */
async function requestNativeStoreReview() {
  try {
    const hasShownLocally = await AsyncStorage.getItem(HAS_SHOWN_STORE_REVIEW_KEY);
    if (hasShownLocally) return;

    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;

    await StoreReview.requestReview();
    // Only remember "shown" once we actually got through requestReview()
    // without error — otherwise a failed/unavailable attempt would
    // permanently block all future attempts on this device.
    await AsyncStorage.setItem(HAS_SHOWN_STORE_REVIEW_KEY, 'true').catch(() => {});
  } catch (err) {
    console.warn('[RateHunterModal] StoreReview error:', err);
  }
}

const PREDEFINED_REVIEWS: Record<number, string> = {
  1: 'Encountered bugs and performance issues. Needs significant improvement.',
  2: 'The concept is good, but needs smoother navigation and feature polish.',
  3: 'Good hunter tracker! With a few more tweaks and quest varieties, it will be great.',
  4: 'Really enjoying the quests, XP gamification, and hunter theme! Great app.',
  5: 'Absolute masterpiece! The ultimate fitness and habit tracker for hunters.',
};

export interface RateHunterModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RateHunterModal({ visible, onClose }: RateHunterModalProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [rateFeedbackText, setRateFeedbackText] = useState(PREDEFINED_REVIEWS[5]);
  const [rateCategory, setRateCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI Entry Slide Animation (Card & text slide up from down after initial image load)
  const bottomSectionSlideAnim = useRef(new Animated.Value(320)).current;
  const bottomSectionOpacityAnim = useRef(new Animated.Value(0)).current;
  const backBtnOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Initial Page Load Transition: Image is shown first, then UI slides up from bottom
      bottomSectionSlideAnim.setValue(320);
      bottomSectionOpacityAnim.setValue(0);
      backBtnOpacityAnim.setValue(0);

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.spring(bottomSectionSlideAnim, {
            toValue: 0,
            friction: 8.5,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(bottomSectionOpacityAnim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(backBtnOpacityAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
        ]).start();
      }, 420);

      return () => {
        clearTimeout(timer);
      };
    } else {
      bottomSectionSlideAnim.setValue(320);
      bottomSectionOpacityAnim.setValue(0);
      backBtnOpacityAnim.setValue(0);
    }
  }, [visible, bottomSectionSlideAnim, bottomSectionOpacityAnim, backBtnOpacityAnim]);

  const handleStarPress = (starNum: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectedRating(starNum);
    setRateFeedbackText(PREDEFINED_REVIEWS[starNum] || '');
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await submitRating({
        rating: selectedRating,
        feedback: rateFeedbackText.trim(),
        category: rateCategory,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();

      const confirmationMsg = res?.message || 'Thanks for your feedback, Hunter';
      showGlobalToast(confirmationMsg, 'success');

      if (res?.promptStoreReview) {
        // Wait for this Modal's dismiss transition to fully settle before
        // presenting the native review sheet — requesting it too early
        // (while the modal is still animating away) gets silently dropped.
        setTimeout(() => {
          requestNativeStoreReview();
        }, STORE_REVIEW_PROMPT_DELAY_MS);
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('Submission Failed', err.message || 'Unable to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Screen style={styles.screen}>
        {/* FULLSCREEN BACKGROUND ARTWORK CONTAINER */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Image
            source={{ uri: optimizeCloudinaryUrl(CLOUDINARY_ASSETS.rate_hunter_knight.uri, 1200) }}
            style={styles.fullScreenKnightBg}
            contentFit="cover"
            cachePolicy="memory-disk"
            placeholder={{ blurhash: DEFAULT_BLURHASH }}
            transition={200}
          />

          {/* Bottom Dark Gradient for High-Contrast Readable Review Card */}
          <LinearGradient
            colors={[
              'rgba(9, 9, 11, 0.0)',
              'rgba(9, 9, 11, 0.15)',
              'rgba(9, 9, 11, 0.65)',
              'rgba(9, 9, 11, 0.94)',
              '#09090B',
            ]}
            locations={[0, 0.28, 0.55, 0.78, 1.0]}
            style={StyleSheet.absoluteFillObject}
          />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.rateScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* Top Area: Floating Back Button */}
          <Animated.View style={[styles.rateTopArea, { opacity: backBtnOpacityAnim }]}>
            <View style={styles.rateHeaderTopBar}>
              <TouchableOpacity
                style={styles.rateFloatingBackBtn}
                onPress={onClose}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Bottom Animated Container: Slides Up from Down on Page Load */}
          <Animated.View
            style={[
              styles.rateBottomArea,
              {
                opacity: bottomSectionOpacityAnim,
                transform: [{ translateY: bottomSectionSlideAnim }],
              },
            ]}
          >
            {/* Rate HunterX Branding Title right above card */}
            <View style={styles.rateHeroTextGroup}>
              <Text style={styles.rateHeroSuperTitle}>SHAPE THE REALM</Text>
              <Text style={styles.rateHeroMainTitle}>
                Rate <Text style={{ color: '#FFFFFF' }}>Hunter</Text>
                <Text style={{ color: '#FE5B01' }}>X</Text>
              </Text>
              <Text style={styles.rateHeroSubtitle}>
                Your honest rating powers updates and fuels our hunter development.
              </Text>
            </View>

            {/* Review Card */}
            <View style={styles.rateCardContainer}>
              {/* Dynamic Reaction Badge */}
              <View style={styles.reactionBadgeRow}>
                {selectedRating > 0 ? (
                  <View style={styles.reactionBadge}>
                    <Text style={styles.reactionBadgeEmoji}>
                      {selectedRating === 1
                        ? '⚡'
                        : selectedRating === 2
                        ? '🗡️'
                        : selectedRating === 3
                        ? '🛡️'
                        : selectedRating === 4
                        ? '🔥'
                        : '👑'}
                    </Text>
                    <Text style={styles.reactionBadgeText}>
                      {selectedRating === 1
                        ? 'Needs Polish'
                        : selectedRating === 2
                        ? 'Fair Journey'
                        : selectedRating === 3
                        ? 'Good App'
                        : selectedRating === 4
                        ? 'Great System!'
                        : 'Legendary Hunter!'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.rateCardPrompt}>Tap a star to rate your hunt</Text>
                )}
              </View>

              {/* 5 Interactive Stars */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((starNum) => {
                  const isSelected = selectedRating >= starNum;
                  return (
                    <TouchableOpacity
                      key={starNum}
                      style={[styles.starBox, isSelected && styles.starBoxSelected]}
                      onPress={() => handleStarPress(starNum)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={isSelected ? 'star' : 'star-outline'}
                        size={28}
                        color={isSelected ? '#FE5B01' : '#52525B'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Feedback Input Section for All Levels */}
              <View style={styles.rateActionSection}>
                <View style={styles.feedbackSection}>
                  <Text style={styles.feedbackSectionTitle}>
                    {selectedRating >= 3 ? 'Your Review' : 'What can we improve?'}
                  </Text>

                  <View style={styles.feedbackCategoriesRow}>
                    {['Quests & XP', 'UI & Design', 'Performance', 'Notifications', 'Other'].map(
                      (cat) => {
                        const isCatSelected = rateCategory === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.feedbackCategoryPill,
                              isCatSelected && styles.feedbackCategoryPillSelected,
                            ]}
                            onPress={() => setRateCategory(isCatSelected ? null : cat)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.feedbackCategoryText,
                                isCatSelected && styles.feedbackCategoryTextSelected,
                              ]}
                            >
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>

                  <TextInput
                    style={styles.rateTextInput}
                    placeholder="Write your feedback..."
                    placeholderTextColor="#71717A"
                    value={rateFeedbackText}
                    onChangeText={setRateFeedbackText}
                    multiline
                    numberOfLines={3}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollRef.current?.scrollToEnd({ animated: true });
                      }, 150);
                    }}
                  />

                  <TouchableOpacity
                    style={styles.ratePrimaryBtn}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#FFFFFF', '#F4F4F5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.ratePrimaryGradient}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#09090B" />
                      ) : (
                        <>
                          <Ionicons
                            name={selectedRating >= 3 ? 'star' : 'send'}
                            size={16}
                            color="#09090B"
                            style={{ marginRight: 8 }}
                          />
                          <Text style={styles.ratePrimaryBtnText}>
                            {selectedRating >= 3 ? 'Submit Review ✨' : 'Submit Direct Feedback'}
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Developer Trust Badge */}
              <View style={styles.rateTrustRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#FE5B01" />
                <Text style={styles.rateTrustText}>Built & updated weekly for hunters worldwide</Text>
              </View>
            </View>
          </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  fullScreenKnightBg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  rateScrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 28,
  },
  rateTopArea: {
    width: '100%',
    gap: 16,
  },
  rateHeaderTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 4,
  },
  rateFloatingBackBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateHeroTextGroup: {
    gap: 3,
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 4,
  },
  rateHeroSuperTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: '#A1A1AA',
    letterSpacing: 2,
    fontWeight: '800',
  },
  rateHeroMainTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  rateHeroSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: '#A1A1AA',
    lineHeight: 18,
    marginTop: 2,
  },
  rateBottomArea: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
  },
  rateCardContainer: {
    width: '100%',
    backgroundColor: 'rgba(20, 20, 24, 0.94)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#272732',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  reactionBadgeRow: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(254, 91, 1, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(254, 91, 1, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
  },
  reactionBadgeEmoji: {
    fontSize: 15,
  },
  reactionBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: '#FE5B01',
    fontWeight: '800',
  },
  rateCardPrompt: {
    fontFamily: fontFamilies.medium,
    fontSize: 13.5,
    color: '#71717A',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    marginVertical: 10,
  },
  starBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1C1C22',
    borderWidth: 1.5,
    borderColor: '#2E2E3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBoxSelected: {
    backgroundColor: 'rgba(254, 91, 1, 0.16)',
    borderColor: '#FE5B01',
  },
  rateActionSection: {
    width: '100%',
    marginTop: 18,
  },
  ratePrimaryBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 6,
  },
  ratePrimaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  ratePrimaryBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: 0.3,
  },
  feedbackSection: {
    width: '100%',
    gap: 12,
  },
  feedbackSectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  feedbackCategoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  feedbackCategoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1C1C22',
    borderWidth: 1,
    borderColor: '#2D2D38',
  },
  feedbackCategoryPillSelected: {
    backgroundColor: 'rgba(254, 91, 1, 0.16)',
    borderColor: '#FE5B01',
  },
  feedbackCategoryText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11.5,
    color: '#A1A1AA',
  },
  feedbackCategoryTextSelected: {
    color: '#FE5B01',
    fontWeight: '700',
  },
  rateTextInput: {
    width: '100%',
    backgroundColor: '#1A1A22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A36',
    color: '#FFFFFF',
    padding: 12,
    minHeight: 76,
    textAlignVertical: 'top',
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  rateTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  rateTrustText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: '#71717A',
  },
});
