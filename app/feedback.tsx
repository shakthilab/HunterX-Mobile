import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { HunterToast, type HunterToastType } from '@/components/common/HunterToast';
import { Screen } from '@/components/common/Screen';
import { useAuth } from '@/hooks/useAuth';
import { showGlobalToast } from '@/store/useToastStore';
import {
  sendFeedback,
  fetchMyFeedback,
  type ApiFeedbackCategory,
  type UserFeedbackItem,
} from '@/services/api/feedback.service';
import { uploadImageToCloudinary } from '@/services/media/cloudinary';
import { fontFamilies } from '@/theme/typography';

const CATEGORIES: { id: ApiFeedbackCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'bug_report', label: 'Bug Report', icon: 'bug-outline' },
  { id: 'suggestion', label: 'Suggestion', icon: 'bulb-outline' },
  { id: 'other', label: 'Other', icon: 'chatbox-ellipses-outline' },
];

const PLACEHOLDERS: Record<ApiFeedbackCategory, string> = {
  bug_report: 'What went wrong? Steps to reproduce if possible...',
  suggestion: 'What new feature or improvement would you love to see?',
  other: 'Share whatever is on your mind...',
};

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export default function FeedbackScreen() {
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'raise' | 'history'>('raise');
  const [pendingTabSwitch, setPendingTabSwitch] = useState<'raise' | 'history' | null>(null);

  // Form States
  const [selectedCategory, setSelectedCategory] = useState<ApiFeedbackCategory | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [allowContact, setAllowContact] = useState(true);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // UI Flow States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Feedback History States
  const [myFeedbackList, setMyFeedbackList] = useState<UserFeedbackItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [copiedTicketId, setCopiedTicketId] = useState<string | number | null>(null);

  // Toast State
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: HunterToastType;
  }>({
    visible: false,
    message: '',
    type: 'error',
  });

  // Track unsaved changes
  const hasUnsavedContent = Boolean(selectedCategory || feedbackText.trim().length > 0 || screenshotUri);

  const resetForm = () => {
    setSelectedCategory(null);
    setFeedbackText('');
    setScreenshotUri(null);
    setAllowContact(true);
    setIsInputFocused(false);
  };

  const navigateBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/profile');
      }
    } catch {
      router.replace('/(tabs)/profile');
    }
  };

  const handleTabSwitch = (targetTab: 'raise' | 'history') => {
    if (activeTab === targetTab) return;

    if (activeTab === 'raise' && hasUnsavedContent) {
      setPendingTabSwitch(targetTab);
      setShowDiscardConfirm(true);
    } else {
      setActiveTab(targetTab);
    }
  };

  const handleBackPress = () => {
    if (activeTab === 'raise' && hasUnsavedContent) {
      setPendingTabSwitch(null);
      setShowDiscardConfirm(true);
    } else {
      navigateBack();
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab === 'raise' && hasUnsavedContent) {
        setPendingTabSwitch(null);
        setShowDiscardConfirm(true);
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [activeTab, hasUnsavedContent]);

  // Load Feedback History
  const loadFeedbackHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await fetchMyFeedback();
      setMyFeedbackList(data);
    } catch (err) {
      console.warn('[FeedbackScreen] Error fetching feedback history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFeedbackHistory();
    }, [loadFeedbackHistory])
  );

  const showToast = (message: string, type: HunterToastType = 'error') => {
    setToast({ visible: true, message, type });
  };

  const handleCategorySelect = (category: ApiFeedbackCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedCategory(category);
    if (toast.visible) setToast((prev) => ({ ...prev, visible: false }));
  };

  const handlePickScreenshot = async () => {
    console.log('[FeedbackScreen] handlePickScreenshot triggered');
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    console.log('[FeedbackScreen] Dismissing keyboard & waiting 150ms...');
    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      console.log('[FeedbackScreen] Checking media library permissions...');
      const permRes = await ImagePicker.getMediaLibraryPermissionsAsync().catch((pErr) => {
        console.log('[FeedbackScreen] getMediaLibraryPermissionsAsync caught:', pErr);
        return null;
      });
      console.log('[FeedbackScreen] Permission status:', permRes);

      console.log('[FeedbackScreen] Launching ImagePicker.launchImageLibraryAsync...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: 1,
      });

      console.log('[FeedbackScreen] ImagePicker result:', JSON.stringify(result));

      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('[FeedbackScreen] Selected asset:', asset.uri, 'fileSize:', asset.fileSize);
        if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
          showToast('Image size exceeds 10MB limit. Please select a smaller image.', 'warning');
          return;
        }
        if (asset.uri) {
          setScreenshotUri(asset.uri);
          console.log('[FeedbackScreen] Screenshot URI set successfully!');
        }
      } else {
        console.log('[FeedbackScreen] Image picking canceled or no assets selected.');
      }
    } catch (err: any) {
      console.error('[FeedbackScreen] ERROR during image picking:', err);
      showToast('Unable to open image library. Please try again.', 'error');
    }
  };

  const handleRemoveScreenshot = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setScreenshotUri(null);
  };

  const handleCopyTicket = async (ticketId: string | number) => {
    try {
      await Clipboard.setStringAsync(String(ticketId));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setCopiedTicketId(ticketId);
      setTimeout(() => {
        setCopiedTicketId(null);
      }, 1500);
    } catch (err) {
      console.warn('[FeedbackScreen] Clipboard error:', err);
    }
  };

  const isFormValid =
    !!selectedCategory && feedbackText.trim().length >= MIN_LENGTH;

  const handleSubmit = async () => {
    if (!selectedCategory) {
      showToast('Please select a feedback category.', 'warning');
      return;
    }

    if (feedbackText.trim().length < MIN_LENGTH) {
      showToast(`Please enter at least ${MIN_LENGTH} characters.`, 'warning');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      let uploadedScreenshotUrl: string | null = null;
      if (screenshotUri) {
        try {
          const uploadRes = await uploadImageToCloudinary(screenshotUri, 'misc');
          uploadedScreenshotUrl = uploadRes.url;
        } catch (uploadErr) {
          console.log('Cloudinary upload error, continuing with submission:', uploadErr);
        }
      }

      const payload = {
        category: selectedCategory,
        message: feedbackText.trim(),
        attachmentUrl: uploadedScreenshotUrl,
        allowFollowup: allowContact,
        appVersion: Constants.expoConfig?.version ?? '1.0.0',
        deviceOs: Device.osName ?? Platform.OS,
      };

      const res = await sendFeedback(payload);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      const ticketNum = res?.ticketId ?? res?.ticket_id ?? res?.id ?? 'NEW';
      showGlobalToast(`Report #${ticketNum} received — the System is reviewing it.`, 'success');

      resetForm();
      setActiveTab('history');
      loadFeedbackHistory();
    } catch (err: any) {
      console.log('Feedback submission failed:', err);
      const serverMsg =
        err?.message ||
        'Unable to submit feedback. Please check your connection and try again.';
      showToast(serverMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPlaceholder = selectedCategory
    ? PLACEHOLDERS[selectedCategory]
    : 'Select a category above to start writing your feedback...';

  const renderStatusBadge = (status: string) => {
    const s = (status || 'received').toLowerCase();
    if (s === 'resolved' || s === 'completed') {
      return (
        <View style={[styles.statusBadge, styles.statusBadgeGreen]}>
          <Ionicons name="checkmark-circle" size={12} color="#22C55E" style={{ marginRight: 3 }} />
          <Text style={[styles.statusBadgeText, styles.statusBadgeTextGreen]}>RESOLVED</Text>
        </View>
      );
    }
    if (s === 'in_review' || s === 'review' || s === 'in-progress') {
      return (
        <View style={[styles.statusBadge, styles.statusBadgeAmber]}>
          <Text style={[styles.statusBadgeText, styles.statusBadgeTextAmber]}>IN REVIEW</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBadge, styles.statusBadgeGray]}>
        <Text style={[styles.statusBadgeText, styles.statusBadgeTextGray]}>RECEIVED</Text>
      </View>
    );
  };

  const getCategoryMeta = (cat: string) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('bug')) {
      return { label: 'Bug Report', icon: 'bug-outline' as const };
    }
    if (c.includes('suggest')) {
      return { label: 'Suggestion', icon: 'bulb-outline' as const };
    }
    return { label: 'Other', icon: 'chatbox-ellipses-outline' as const };
  };

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Feedback</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        {/* TOP SEGMENTED TAB SWITCHER */}
        <View style={styles.tabBarContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'raise' && styles.tabButtonActive]}
            onPress={() => handleTabSwitch('raise')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'raise' && styles.tabTextActive]}>
              Raise
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
            onPress={() => handleTabSwitch('history')}
            activeOpacity={0.8}
          >
            <View style={styles.tabBadgeRow}>
              <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                Your Requests
              </Text>
              {myFeedbackList.length > 0 && (
                <View style={styles.tabCountBadge}>
                  <Text style={styles.tabCountText}>{myFeedbackList.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'raise' ? (
            /* TAB 1: RAISE FEEDBACK FORM */
            <View style={styles.tabContentGroup}>
              {/* HERO HEADER */}
              <View style={styles.heroSection}>
                <Text style={styles.heroTitle}>How can we calibrate?</Text>
                <Text style={styles.heroSubtitle}>
                  Report system anomalies or suggest enhancements to the Tactical OS. Your telemetry is critical.
                </Text>
              </View>

              {/* FIELD 1: CATEGORY SELECTOR */}
              <View style={styles.sectionContainer}>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryCard,
                          isSelected && styles.categoryCardSelected,
                        ]}
                        onPress={() => handleCategorySelect(cat.id)}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.categoryIconWrap,
                            isSelected && styles.categoryIconWrapSelected,
                          ]}
                        >
                          <Ionicons
                            name={cat.icon}
                            size={18}
                            color={isSelected ? '#FE5B01' : '#A1A1AA'}
                          />
                        </View>
                        <Text
                          style={[
                            styles.categoryCardText,
                            isSelected && styles.categoryCardTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* FIELD 2: FEEDBACK TEXTAREA */}
              <View style={styles.sectionContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Feedback Details</Text>
                  <Text
                    style={[
                      styles.charCounter,
                      feedbackText.length > 0 &&
                      feedbackText.length < MIN_LENGTH &&
                      styles.charCounterWarning,
                    ]}
                  >
                    {feedbackText.length}/{MAX_LENGTH}
                  </Text>
                </View>

                <View
                  style={[
                    styles.inputCard,
                    !selectedCategory && styles.inputCardDisabled,
                    isInputFocused && styles.inputCardFocused,
                  ]}
                >
                  <TextInput
                    style={[styles.textInput, !selectedCategory && styles.textInputDisabled]}
                    placeholder={currentPlaceholder}
                    placeholderTextColor="#71717A"
                    value={feedbackText}
                    onChangeText={setFeedbackText}
                    onFocus={() => {
                      setIsInputFocused(true);
                      setTimeout(() => {
                        scrollRef.current?.scrollTo({ y: 180, animated: true });
                      }, 150);
                    }}
                    onBlur={() => setIsInputFocused(false)}
                    editable={!!selectedCategory}
                    multiline
                    maxLength={MAX_LENGTH}
                    textAlignVertical="top"
                  />
                </View>

                {feedbackText.length > 0 && feedbackText.length < MIN_LENGTH && (
                  <Text style={styles.helperText}>
                    Please enter at least {MIN_LENGTH - feedbackText.length} more characters.
                  </Text>
                )}
              </View>

              {/* FIELD 3: SCREENSHOT ATTACHMENT */}
              <View style={styles.sectionContainer}>
                <Text style={styles.fieldLabel}>Attachment (Optional)</Text>

                {screenshotUri ? (
                  /* Attached Preview Card */
                  <View style={styles.attachedFileCard}>
                    <Image source={{ uri: screenshotUri }} style={styles.thumbnail} contentFit="cover" />
                    <View style={styles.attachedInfo}>
                      <Text style={styles.attachedTitle} numberOfLines={1}>
                        Screenshot Attached
                      </Text>
                      <Text style={styles.attachedSubtitle}>Ready to upload with submission</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={handleRemoveScreenshot}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={18} color="#A1A1AA" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Upload Button */
                  <TouchableOpacity
                    style={styles.uploadCard}
                    onPress={handlePickScreenshot}
                    activeOpacity={0.75}
                  >
                    <View style={styles.uploadIconCircle}>
                      <Feather name="image" size={18} color="#FE5B01" />
                    </View>
                    <View style={styles.uploadTextWrap}>
                      <Text style={styles.uploadPrimaryText}>Attach a screenshot or photo</Text>
                      <Text style={styles.uploadSecondaryText}>PNG, JPG up to 10MB</Text>
                    </View>
                    <Ionicons name="add" size={20} color="#71717A" />
                  </TouchableOpacity>
                )}
              </View>

              {/* FIELD 4: CONTACT PERMISSION */}
              <TouchableOpacity
                style={styles.contactCard}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setAllowContact(!allowContact);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.checkboxSquare, allowContact && styles.checkboxSquareActive]}>
                  {allowContact && <Ionicons name="checkmark" size={14} color="#000000" />}
                </View>
                <View style={styles.contactTextGroup}>
                  <Text style={styles.contactTitle}>Allow follow-up via email</Text>
                  <Text style={styles.contactSubtitle}>
                    We may reach out to your registered email if we need more details.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* FIELD 5: SUBMIT BUTTON */}
              <TouchableOpacity
                style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting || !isFormValid}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    isFormValid
                      ? ['#FFFFFF', '#F4F4F5']
                      : ['#1E1E24', '#1E1E24']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#09090B" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="send-outline"
                        size={17}
                        color={isFormValid ? '#09090B' : '#71717A'}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.submitText,
                          !isFormValid && styles.submitTextDisabled,
                        ]}
                      >
                        Submit Feedback
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            /* TAB 2: YOUR REQUESTS HISTORY */
            <View style={styles.historyTabContainer}>
              <View style={styles.historyHeaderSection}>
                <Text style={styles.heroTitle}>Your Requests</Text>
                <Text style={styles.heroSubtitle}>
                  Track the status of your submitted tickets and system reports.
                </Text>
              </View>

              {isLoadingHistory ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FE5B01" />
                  <Text style={styles.loadingText}>Fetching your reports...</Text>
                </View>
              ) : myFeedbackList.length > 0 ? (
                <View style={styles.historyListGroup}>
                  {myFeedbackList.map((item, index) => {
                    const meta = getCategoryMeta(item.category);
                    const msgText = item.message || item.feedback_text || (item as any).content || 'No message provided';
                    const ticketNum = item.ticketId ?? item.ticket_id ?? (item as any).ticket_number ?? item.id ?? (index + 1);
                    const itemKey = item.id ?? item.ticketId ?? item.ticket_id ?? `feedback_${index}`;
                    const isCopied = copiedTicketId === ticketNum;
                    const rawDate = item.createdAt || item.created_at || (item as any).timestamp || (item as any).date;
                    const dateStr = rawDate
                      ? new Date(rawDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Recently';

                    return (
                      <View key={itemKey} style={styles.historyCard}>
                        <View style={styles.historyHeaderRow}>
                          <View style={styles.ticketBadgeRow}>
                            <Text style={styles.ticketNumberText}>#{ticketNum}</Text>
                            <TouchableOpacity
                              style={styles.copyBtn}
                              onPress={() => handleCopyTicket(ticketNum)}
                              activeOpacity={0.7}
                            >
                              {isCopied ? (
                                <View style={styles.copiedInlineBadge}>
                                  <Ionicons name="checkmark-done" size={12} color="#22C55E" />
                                  <Text style={styles.copiedInlineText}>Copied!</Text>
                                </View>
                              ) : (
                                <Ionicons name="copy-outline" size={14} color="#71717A" />
                              )}
                            </TouchableOpacity>
                          </View>
                          {renderStatusBadge(item.status)}
                        </View>

                        <View style={styles.historyCategoryBadge}>
                          <Ionicons name={meta.icon} size={14} color="#FE5B01" style={{ marginRight: 5 }} />
                          <Text style={styles.historyCategoryText}>{meta.label}</Text>
                        </View>

                        <Text style={styles.historyMessageText} numberOfLines={2}>
                          {msgText}
                        </Text>
                        <Text style={styles.historyDateText}>{dateStr}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyHistoryCard}>
                  <Ionicons name="documents-outline" size={28} color="#52525B" />
                  <Text style={styles.emptyHistoryTitle}>No reports submitted yet</Text>
                  <Text style={styles.emptyHistoryText}>
                    Switch to the Raise tab to submit a bug report or suggestion.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>



        {/* DISCARD CONFIRMATION DIALOG */}
        <ConfirmDialog
          visible={showDiscardConfirm}
          title="Discard this report?"
          message="Your feedback hasn't been sent yet. If you leave now, it'll be lost."
          confirmLabel="Discard"
          cancelLabel="Keep Editing"
          destructive={true}
          onConfirm={() => {
            setShowDiscardConfirm(false);
            resetForm();
            if (pendingTabSwitch) {
              setActiveTab(pendingTabSwitch);
              setPendingTabSwitch(null);
            } else {
              navigateBack();
            }
          }}
          onCancel={() => {
            setShowDiscardConfirm(false);
            setPendingTabSwitch(null);
          }}
        />

        {/* TOAST POPUP */}
        <HunterToast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0C',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1E',
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 16.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerRightSpacer: {
    width: 38,
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#111115',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222228',
    padding: 4,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: '#FE5B01',
  },
  tabText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#71717A',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabCountBadge: {
    backgroundColor: 'rgba(254, 91, 1, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabCountText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#FE5B01',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  tabContentGroup: {
    gap: 24,
  },
  heroSection: {
    gap: 6,
    paddingVertical: 2,
    marginBottom: 2,
  },
  heroTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 13.5,
    color: '#9E9EA8',
    lineHeight: 19,
  },
  sectionContainer: {
    gap: 10,
  },
  fieldLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: '#A1A1AA',
    letterSpacing: 0.6,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCounter: {
    fontFamily: fontFamilies.medium,
    fontSize: 11.5,
    color: '#71717A',
  },
  charCounterWarning: {
    color: '#F59E0B',
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131317',
    borderWidth: 1,
    borderColor: '#24242C',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 8,
  },
  categoryCardSelected: {
    backgroundColor: 'rgba(254, 91, 1, 0.12)',
    borderColor: '#FE5B01',
  },
  categoryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1C1C22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconWrapSelected: {
    backgroundColor: 'rgba(254, 91, 1, 0.2)',
  },
  categoryCardText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: '#A1A1AA',
    textAlign: 'center',
  },
  categoryCardTextSelected: {
    color: '#FE5B01',
    fontWeight: '700',
  },
  inputCard: {
    backgroundColor: '#131317',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#24242C',
    padding: 14,
    minHeight: 145,
  },
  inputCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#0E0E12',
  },
  inputCardFocused: {
    borderColor: '#FE5B01',
  },
  textInput: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    minHeight: 115,
  },
  textInputDisabled: {
    color: '#71717A',
  },
  helperText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    color: '#F59E0B',
    marginLeft: 2,
  },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131317',
    borderWidth: 1,
    borderColor: '#24242C',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  uploadIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(254, 91, 1, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTextWrap: {
    flex: 1,
    gap: 2,
  },
  uploadPrimaryText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#E4E4E7',
  },
  uploadSecondaryText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: '#71717A',
  },
  attachedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131317',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2E2E38',
    padding: 10,
    gap: 12,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#202026',
  },
  attachedInfo: {
    flex: 1,
    gap: 2,
  },
  attachedTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  attachedSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: '#71717A',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#202028',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#111115',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#202026',
    padding: 14,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#3F3F46',
    backgroundColor: '#18181D',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxSquareActive: {
    backgroundColor: '#FE5B01',
    borderColor: '#FE5B01',
  },
  contactTextGroup: {
    flex: 1,
    gap: 2,
  },
  contactTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  contactSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    color: '#71717A',
    lineHeight: 16,
  },
  fixedBottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: '#0A0A0C',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1E',
  },
  submitButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: 0.3,
  },
  submitTextDisabled: {
    color: '#71717A',
  },

  /* TAB 2: HISTORY STYLES */
  historyTabContainer: {
    gap: 18,
  },
  historyHeaderSection: {
    gap: 6,
    paddingVertical: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: '#A1A1AA',
  },
  historyListGroup: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#131317',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#22222A',
    padding: 16,
    gap: 10,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketNumberText: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  copyBtn: {
    padding: 4,
  },
  copiedInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  copiedInlineText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#22C55E',
  },
  historyCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyCategoryText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12.5,
    color: '#E4E4E7',
  },
  historyMessageText: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: '#A1A1AA',
    lineHeight: 18,
  },
  historyDateText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: '#52525B',
  },
  emptyHistoryCard: {
    backgroundColor: '#111115',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F1F26',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  emptyHistoryTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    color: '#E4E4E7',
  },
  emptyHistoryText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12.5,
    color: '#71717A',
    textAlign: 'center',
  },

  /* STATUS BADGES */
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeGray: {
    backgroundColor: '#27272A',
  },
  statusBadgeAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusBadgeGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  statusBadgeTextGray: {
    color: '#A1A1AA',
  },
  statusBadgeTextAmber: {
    color: '#F59E0B',
  },
  statusBadgeTextGreen: {
    color: '#22C55E',
  },
});
