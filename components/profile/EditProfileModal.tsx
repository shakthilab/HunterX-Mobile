import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { GoogleIcon } from '@/components/common/GoogleIcon';
import { HunterToast } from '@/components/common/HunterToast';
import { Screen } from '@/components/common/Screen';
import { fontFamilies } from '@/theme/typography';
import { AvatarSelectionModal, getAvatarSource } from './AvatarSelectionModal';
import { useAvatarsReady } from '@/services/api/avatar.service';
import { DEFAULT_BLURHASH } from '@/services/media/cloudinary';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEARS_LIST = Array.from({ length: 81 }, (_, i) => 1950 + i);

const formatBirthday = (dob: string | null | undefined): string => {
  if (!dob) return '';
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(dob)) return dob;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
    const parts = dob.split('/');
    return `${parts[0]}/${parts[1]}/${parts[2].slice(-2)}`;
  }
  if (typeof dob === 'string' && dob.includes('-')) {
    const dateStr = dob.split('T')[0];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0].slice(-2);
      const month = parts[1];
      const day = parts[2];
      return `${day}/${month}/${year}`;
    }
  }
  const date = new Date(dob);
  if (!isNaN(date.getTime())) {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const shortYear = String(date.getUTCFullYear()).slice(-2);
    return `${day}/${month}/${shortYear}`;
  }
  return dob;
};

export interface EditProfileFormData {
  name: string;
  gender: string;
  birthday: string;
  height: string;
  heightUnit: 'cm' | 'ft';
  weight: string;
  weightUnit: 'kg' | 'lbs';
  protein: string;
  avatar_id?: number | string;
  avatar_url?: string;
}

export interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: any;
  unitSystem: 'metric' | 'imperial';
  onSave: (updatedForm: EditProfileFormData) => Promise<void> | void;
  onOpenAvatarPicker?: () => void;
  onDeleteAccount: () => void;
}

export function EditProfileModal({
  visible,
  onClose,
  user,
  unitSystem,
  onSave,
  onOpenAvatarPicker,
  onDeleteAccount,
}: EditProfileModalProps) {
  // Re-renders once the avatar catalog loads so the header preview reflects
  // the user's actual avatar_id instead of the generic fallback image.
  useAvatarsReady();

  const [profileForm, setProfileForm] = useState<EditProfileFormData>({
    name: 'Shadow Hunter',
    gender: 'Male',
    birthday: '',
    height: '181',
    heightUnit: 'cm',
    weight: '75',
    weightUnit: 'kg',
    protein: '140',
  });

  const [initialForm, setInitialForm] = useState<EditProfileFormData>({
    name: 'Shadow Hunter',
    gender: 'Male',
    birthday: '',
    height: '181',
    heightUnit: 'cm',
    weight: '75',
    weightUnit: 'kg',
    protein: '140',
  });

  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);

  // Avatar picker state
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | number | null>(
    user?.avatar_id ?? null
  );
  const [initialAvatarId, setInitialAvatarId] = useState<string | number | null>(
    user?.avatar_id ?? null
  );
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(
    user?.avatarUrl ?? null
  );
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);

  // Date picker state
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'DAY' | 'MONTH' | 'YEAR'>('DAY');
  const [pickerDay, setPickerDay] = useState(15);
  const [pickerMonthIndex, setPickerMonthIndex] = useState(5);
  const [pickerYear, setPickerYear] = useState(1998);

  // Protein toast animation
  const [proteinToastVisible, setProteinToastVisible] = useState(false);
  const proteinToastAnim = useRef(new Animated.Value(0)).current;
  const proteinToastTimerRef = useRef<any>(null);

  useEffect(() => {
    if (visible && user) {
      const heightInCm = user?.height_cm ?? user?.height ?? 181;
      const weightInKg = user?.weight_kg ?? user?.weight ?? 75;
      const isImp = unitSystem === 'imperial';

      const heightDisplay = isImp
        ? (heightInCm * 0.0328084).toFixed(1)
        : heightInCm.toString();
      const weightDisplay = isImp
        ? (weightInKg * 2.20462).toFixed(1)
        : weightInKg.toString();

      const newForm: EditProfileFormData = {
        name: user?.name || user?.displayName || 'Shadow Hunter',
        gender: user?.gender || 'Male',
        birthday: formatBirthday(user?.date_of_birth || user?.dob || user?.birthday || null),
        height: heightDisplay,
        heightUnit: isImp ? 'ft' : 'cm',
        weight: weightDisplay,
        weightUnit: isImp ? 'lbs' : 'kg',
        protein: String(user?.daily_protein_goal ?? user?.protein_goal ?? 140),
        avatar_id: user?.avatar_id ?? undefined,
        avatar_url: user?.avatarUrl ?? undefined,
      };

      setProfileForm(newForm);
      setInitialForm(newForm);
      setSelectedAvatarId(user?.avatar_id ?? null);
      setInitialAvatarId(user?.avatar_id ?? null);
      setSelectedAvatarUrl(user?.avatarUrl ?? null);
      setIsGenderDropdownOpen(false);
      setIsDatePickerVisible(false);
      setIsAvatarModalVisible(false);
    }
  }, [visible, user, unitSystem]);

  const currentHeightCm = React.useMemo(() => {
    const val = parseFloat(profileForm.height);
    if (isNaN(val)) return 0;
    return profileForm.heightUnit === 'ft' ? Math.round(val / 0.0328084) : Math.round(val);
  }, [profileForm.height, profileForm.heightUnit]);

  const initialHeightCm = React.useMemo(() => {
    const val = parseFloat(initialForm.height);
    if (isNaN(val)) return 0;
    return initialForm.heightUnit === 'ft' ? Math.round(val / 0.0328084) : Math.round(val);
  }, [initialForm.height, initialForm.heightUnit]);

  const currentWeightKg = React.useMemo(() => {
    const val = parseFloat(profileForm.weight);
    if (isNaN(val)) return 0;
    return profileForm.weightUnit === 'lbs' ? Math.round((val / 2.20462) * 10) / 10 : Math.round(val * 10) / 10;
  }, [profileForm.weight, profileForm.weightUnit]);

  const initialWeightKg = React.useMemo(() => {
    const val = parseFloat(initialForm.weight);
    if (isNaN(val)) return 0;
    return initialForm.weightUnit === 'lbs' ? Math.round((val / 2.20462) * 10) / 10 : Math.round(val * 10) / 10;
  }, [initialForm.weight, initialForm.weightUnit]);

  const isHeightChanged = Math.abs(currentHeightCm - initialHeightCm) > 1;
  const isWeightChanged = Math.abs(currentWeightKg - initialWeightKg) > 0.3;

  const isProfileChanged =
    profileForm.name.trim() !== initialForm.name.trim() ||
    profileForm.gender !== initialForm.gender ||
    profileForm.birthday !== initialForm.birthday ||
    isHeightChanged ||
    isWeightChanged ||
    String(selectedAvatarId ?? '') !== String(initialAvatarId ?? '');

  const handleProteinRowPress = () => {
    setProteinToastVisible(true);
  };

  const openDatePicker = () => {
    if (profileForm.birthday) {
      const parts = profileForm.birthday.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        let y = parseInt(parts[2], 10);
        if (y < 100) {
          y = y > 30 ? 1900 + y : 2000 + y;
        }
        if (!isNaN(d) && d >= 1 && d <= 31) setPickerDay(d);
        if (!isNaN(m) && m >= 1 && m <= 12) setPickerMonthIndex(m - 1);
        if (!isNaN(y) && y >= 1950 && y <= 2030) setPickerYear(y);
      }
    } else if (user?.age) {
      const calculatedYear = new Date().getFullYear() - user.age;
      setPickerYear(calculatedYear);
      setPickerMonthIndex(0);
      setPickerDay(1);
    }
    setPickerMode('DAY');
    setIsDatePickerVisible(true);
  };

  const handleConfirmDate = () => {
    const formattedDay = pickerDay < 10 ? `0${pickerDay}` : `${pickerDay}`;
    const monthNum = pickerMonthIndex + 1;
    const formattedMonth = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
    const shortYear = `${pickerYear}`.slice(-2);

    setProfileForm({
      ...profileForm,
      birthday: `${formattedDay}/${formattedMonth}/${shortYear}`,
    });
    setPickerMode('DAY');
    setIsDatePickerVisible(false);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!profileForm.name.trim() || isSaving) return;
    try {
      setIsSaving(true);
      await onSave({
        ...profileForm,
        avatar_id: selectedAvatarId !== null && selectedAvatarId !== undefined ? selectedAvatarId : undefined,
        avatar_url: selectedAvatarUrl || undefined,
      });
      setInitialForm(profileForm);
      setInitialAvatarId(selectedAvatarId);
      // Keep modal open as requested; user will explicitly tap back/close button
    } catch {
      // Error handles inside onSave alert
    } finally {
      setIsSaving(false);
    }
  };

  const currentAvatarSource = getAvatarSource(
    selectedAvatarUrl || user?.avatarUrl,
    selectedAvatarId || user?.avatar_id
  );
  const providerStr =
    user?.provider ?? user?.authProvider ?? user?.auth_provider ?? 'EMAIL';
  const p = String(providerStr).toUpperCase();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Screen style={styles.screen}>
        {/* Header Bar */}
        <View style={styles.editProfileHeaderBar}>
          <TouchableOpacity
            style={styles.editBackBtn}
            onPress={onClose}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.editProfileTitle}>Edit Profile</Text>
          <TouchableOpacity
            style={styles.editSaveBtn}
            onPress={isProfileChanged && !isSaving ? handleSave : undefined}
            disabled={!isProfileChanged || isSaving}
            activeOpacity={0.7}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FE5B01" />
            ) : (
              <Text
                style={[
                  styles.saveActionText,
                  !isProfileChanged && styles.saveActionTextDisabled,
                ]}
              >
                SAVE
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.editProfileContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Header */}
          <View style={styles.editAvatarCenterSection}>
            <TouchableOpacity
              style={styles.editAvatarCircleWrapper}
              onPress={() => setIsAvatarModalVisible(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF7A00', '#FE5B01', '#E64A00']}
                style={styles.editAvatarGlowRing}
              >
                <View style={styles.editAvatarCircleFrame}>
                  <Image
                    source={currentAvatarSource}
                    style={styles.editAvatarImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    placeholder={{ blurhash: DEFAULT_BLURHASH }}
                    transition={150}
                  />
                </View>
              </LinearGradient>
              <View style={styles.editPencilBadge}>
                <Ionicons name="camera" size={14} color="#000000" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Form Fields Section */}
          <View style={styles.modernFormContainer}>
            {/* Name field */}
            <View style={styles.modernFormRow}>
              <View style={styles.modernRowLeft}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color="#FE5B01"
                  style={styles.rowIcon}
                />
                <Text style={styles.modernRowLabel}>Name</Text>
              </View>
              <TextInput
                style={styles.modernRowInput}
                value={profileForm.name}
                onChangeText={(val) => setProfileForm({ ...profileForm, name: val })}
                placeholderTextColor="#72727D"
              />
            </View>

            {/* Gender field */}
            <TouchableOpacity
              style={styles.modernFormRow}
              onPress={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
              activeOpacity={0.8}
            >
              <View style={styles.modernRowLeft}>
                <Ionicons
                  name="male-female-outline"
                  size={18}
                  color="#FE5B01"
                  style={styles.rowIcon}
                />
                <Text style={styles.modernRowLabel}>Gender</Text>
              </View>
              <View style={styles.modernDateValueRow}>
                <Text style={styles.modernDateValueText}>{profileForm.gender}</Text>
                <Ionicons
                  name={isGenderDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#71717A"
                />
              </View>
            </TouchableOpacity>

            {isGenderDropdownOpen && (
              <View style={styles.genderDropdownContainer}>
                {['Male', 'Female', 'Other'].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.genderDropdownItem,
                      profileForm.gender === item && styles.genderDropdownItemSelected,
                    ]}
                    onPress={() => {
                      setProfileForm({ ...profileForm, gender: item });
                      setIsGenderDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.genderDropdownItemText,
                        profileForm.gender === item && styles.genderDropdownItemTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {profileForm.gender === item && (
                      <Ionicons name="checkmark" size={16} color="#FE5B01" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Birthday field */}
            <TouchableOpacity
              style={styles.modernFormRow}
              onPress={openDatePicker}
              activeOpacity={0.8}
            >
              <View style={styles.modernRowLeft}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color="#FE5B01"
                  style={styles.rowIcon}
                />
                <Text style={styles.modernRowLabel}>Birthday</Text>
              </View>
              <View style={styles.modernDateValueRow}>
                {profileForm.birthday ? (
                  <Text style={styles.modernDateValueText}>{profileForm.birthday}</Text>
                ) : (
                  <View style={styles.updateBadge}>
                    <Text style={styles.updateBadgeText}>UPDATE</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#71717A" />
              </View>
            </TouchableOpacity>

            {/* Height switcher header above field */}
            <View style={styles.unitSwitcherAboveRow}>
              <View style={styles.inlineUnitSwitcher}>
                <TouchableOpacity
                  style={[
                    styles.inlineUnitBtn,
                    profileForm.heightUnit === 'cm' && styles.inlineUnitBtnActive,
                  ]}
                  onPress={() => {
                    if (profileForm.heightUnit === 'ft') {
                      const ftVal = parseFloat(profileForm.height);
                      const converted = isNaN(ftVal)
                        ? '181'
                        : Math.round(ftVal / 0.0328084).toString();
                      setProfileForm({ ...profileForm, heightUnit: 'cm', height: converted });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.inlineUnitBtnText,
                      profileForm.heightUnit === 'cm' && styles.inlineUnitBtnTextActive,
                    ]}
                  >
                    cm
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.inlineUnitBtn,
                    profileForm.heightUnit === 'ft' && styles.inlineUnitBtnActive,
                  ]}
                  onPress={() => {
                    if (profileForm.heightUnit === 'cm') {
                      const cmVal = parseFloat(profileForm.height);
                      const converted = isNaN(cmVal)
                        ? '5.9'
                        : (cmVal * 0.0328084).toFixed(1);
                      setProfileForm({ ...profileForm, heightUnit: 'ft', height: converted });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.inlineUnitBtnText,
                      profileForm.heightUnit === 'ft' && styles.inlineUnitBtnTextActive,
                    ]}
                  >
                    ft
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Height field */}
            <View style={styles.modernFormRow}>
              <View style={styles.modernRowLeft}>
                <Ionicons
                  name="resize-outline"
                  size={18}
                  color="#FE5B01"
                  style={styles.rowIcon}
                />
                <Text style={styles.modernRowLabel}>Height</Text>
              </View>
              <View style={styles.modernRowValueGroup}>
                <TextInput
                  style={styles.modernRowNumericInput}
                  value={profileForm.height}
                  onChangeText={(val) => setProfileForm({ ...profileForm, height: val })}
                  keyboardType="numeric"
                  placeholder={profileForm.heightUnit === 'cm' ? '181' : '5.9'}
                  placeholderTextColor="#72727D"
                />
                <Text style={styles.modernRowSuffix}>{profileForm.heightUnit}</Text>
              </View>
            </View>

            {/* Weight switcher header above field */}
            <View style={styles.unitSwitcherAboveRow}>
              <View style={styles.inlineUnitSwitcher}>
                <TouchableOpacity
                  style={[
                    styles.inlineUnitBtn,
                    profileForm.weightUnit === 'kg' && styles.inlineUnitBtnActive,
                  ]}
                  onPress={() => {
                    if (profileForm.weightUnit === 'lbs') {
                      const lbsVal = parseFloat(profileForm.weight);
                      const converted = isNaN(lbsVal)
                        ? '75.0'
                        : (lbsVal / 2.20462).toFixed(1);
                      setProfileForm({ ...profileForm, weightUnit: 'kg', weight: converted });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.inlineUnitBtnText,
                      profileForm.weightUnit === 'kg' && styles.inlineUnitBtnTextActive,
                    ]}
                  >
                    kg
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.inlineUnitBtn,
                    profileForm.weightUnit === 'lbs' && styles.inlineUnitBtnActive,
                  ]}
                  onPress={() => {
                    if (profileForm.weightUnit === 'kg') {
                      const kgVal = parseFloat(profileForm.weight);
                      const converted = isNaN(kgVal)
                        ? '165.3'
                        : (kgVal * 2.20462).toFixed(1);
                      setProfileForm({ ...profileForm, weightUnit: 'lbs', weight: converted });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.inlineUnitBtnText,
                      profileForm.weightUnit === 'lbs' && styles.inlineUnitBtnTextActive,
                    ]}
                  >
                    lbs
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Weight field */}
            <View style={styles.modernFormRow}>
              <View style={styles.modernRowLeft}>
                <Ionicons
                  name="fitness-outline"
                  size={18}
                  color="#FE5B01"
                  style={styles.rowIcon}
                />
                <Text style={styles.modernRowLabel}>Weight</Text>
              </View>
              <View style={styles.modernRowValueGroup}>
                <TextInput
                  style={styles.modernRowNumericInput}
                  value={profileForm.weight}
                  onChangeText={(val) => setProfileForm({ ...profileForm, weight: val })}
                  keyboardType="numeric"
                  placeholder={profileForm.weightUnit === 'kg' ? '75' : '165'}
                  placeholderTextColor="#72727D"
                />
                <Text style={styles.modernRowSuffix}>{profileForm.weightUnit}</Text>
              </View>
            </View>

            {/* Protein Goal field (Read-only with bottom toast on tap) */}
            <TouchableOpacity
              style={styles.modernFormRow}
              onPress={handleProteinRowPress}
              activeOpacity={0.7}
            >
              <View style={styles.modernRowLeft}>
                <MaterialCommunityIcons
                  name="arm-flex"
                  size={18}
                  color="#FE5B01"
                  style={styles.rowIcon}
                />
                <Text style={styles.modernRowLabel}>Daily Protein Goal</Text>
              </View>
              <View style={styles.modernDateValueRow}>
                <Text style={[styles.modernDateValueText, { color: '#FFFFFF' }]}>
                  {profileForm.protein || '140'}
                </Text>
                <Text style={styles.proteinSuffix}>g</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Linked Account Card */}
          <View style={styles.modernAccountCard}>
            <View style={styles.modernAccountLeft}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#FE5B01"
                style={styles.rowIcon}
              />
              <View>
                <Text style={styles.modernAccountLabel}>Linked Sign-In</Text>
                <Text style={styles.modernAccountEmail}>
                  {user?.email ?? 'hunter@hunterx.app'}
                </Text>
              </View>
            </View>
            {p === 'GOOGLE' ? (
              <View style={styles.googleProviderPill}>
                <GoogleIcon size={16} />
                <Text style={styles.googleProviderPillText}>Google</Text>
              </View>
            ) : p === 'APPLE' ? (
              <View style={styles.appleProviderPill}>
                <Ionicons name="logo-apple" size={16} color="#FFFFFF" />
                <Text style={styles.appleProviderPillText}>Apple</Text>
              </View>
            ) : (
              <View style={styles.emailProviderPill}>
                <Ionicons name="mail-outline" size={16} color="#FE5B01" />
                <Text style={styles.emailProviderPillText}>Email</Text>
              </View>
            )}
          </View>

          {/* Delete Account */}
          <TouchableOpacity
            style={styles.deleteAccountContainer}
            onPress={onDeleteAccount}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color="#EF4444"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Custom Calendar Date Picker Modal */}
        {isDatePickerVisible && (
          <View style={styles.customModalOverlay}>
            <View style={styles.calendarCard}>
              <Text style={styles.calendarTitle}>
                {pickerMode === 'DAY'
                  ? 'SELECT BIRTHDAY'
                  : pickerMode === 'MONTH'
                  ? 'SELECT MONTH'
                  : 'SELECT YEAR'}
              </Text>

              {pickerMode === 'DAY' ? (
                <View style={styles.calendarHeaderRow}>
                  <TouchableOpacity
                    onPress={() => {
                      if (pickerMonthIndex === 0) {
                        setPickerMonthIndex(11);
                        setPickerYear(pickerYear - 1);
                      } else {
                        setPickerMonthIndex(pickerMonthIndex - 1);
                      }
                    }}
                    style={styles.calNavBtn}
                  >
                    <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.calMonthYearClickableGroup}>
                    <TouchableOpacity
                      onPress={() => setPickerMode('MONTH')}
                      style={styles.calPillBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.calMonthYearText}>
                        {MONTH_NAMES[pickerMonthIndex]}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setPickerMode('YEAR')}
                      style={styles.calPillBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.calMonthYearText}>{pickerYear}</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      if (pickerMonthIndex === 11) {
                        setPickerMonthIndex(0);
                        setPickerYear(pickerYear + 1);
                      } else {
                        setPickerMonthIndex(pickerMonthIndex + 1);
                      }
                    }}
                    style={styles.calNavBtn}
                  >
                    <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.calBackToDayBtn}
                  onPress={() => setPickerMode('DAY')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={16} color="#FE5B01" />
                  <Text style={styles.calBackToDayText}>
                    Back to {MONTH_NAMES[pickerMonthIndex]} {pickerYear}
                  </Text>
                </TouchableOpacity>
              )}

              {pickerMode === 'DAY' && (
                <View style={styles.daysGrid}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                    const isSelected = d === pickerDay;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.dayCell,
                          isSelected && styles.selectedDayCell,
                        ]}
                        onPress={() => setPickerDay(d)}
                      >
                        <Text
                          style={[
                            styles.dayCellText,
                            isSelected && styles.selectedDayCellText,
                          ]}
                        >
                          {d}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {pickerMode === 'MONTH' && (
                <View style={styles.monthsGrid}>
                  {MONTH_NAMES.map((mName, idx) => {
                    const isSelected = idx === pickerMonthIndex;
                    return (
                      <TouchableOpacity
                        key={mName}
                        style={[
                          styles.monthCell,
                          isSelected && styles.selectedMonthCell,
                        ]}
                        onPress={() => {
                          setPickerMonthIndex(idx);
                          setPickerMode('DAY');
                        }}
                      >
                        <Text
                          style={[
                            styles.monthCellText,
                            isSelected && styles.selectedMonthCellText,
                          ]}
                        >
                          {mName.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {pickerMode === 'YEAR' && (
                <ScrollView
                  style={styles.yearsScrollContainer}
                  contentContainerStyle={styles.yearsGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {YEARS_LIST.map((y) => {
                    const isSelected = y === pickerYear;
                    return (
                      <TouchableOpacity
                        key={y}
                        style={[
                          styles.yearCell,
                          isSelected && styles.selectedYearCell,
                        ]}
                        onPress={() => {
                          setPickerYear(y);
                          setPickerMode('DAY');
                        }}
                      >
                        <Text
                          style={[
                            styles.yearCellText,
                            isSelected && styles.selectedYearCellText,
                          ]}
                        >
                          {y}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <View style={styles.calendarActionRow}>
                <TouchableOpacity
                  style={[styles.calBtn, styles.calCancelBtn]}
                  onPress={() => {
                    setPickerMode('DAY');
                    setIsDatePickerVisible(false);
                  }}
                >
                  <Text style={styles.calCancelText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.calBtn, styles.calConfirmBtn]}
                  onPress={handleConfirmDate}
                >
                  <Text style={styles.calConfirmText}>SET DATE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Center Alert Toast (Unified App Toast) */}
        <HunterToast
          visible={proteinToastVisible}
          message="You cannot edit protein goal"
          type="info"
          onHide={() => setProteinToastVisible(false)}
        />

        <AvatarSelectionModal
          visible={isAvatarModalVisible}
          onClose={() => setIsAvatarModalVisible(false)}
          currentAvatar={selectedAvatarUrl || user?.avatarUrl}
          currentAvatarId={selectedAvatarId || user?.avatar_id}
          onSelectAvatar={(avatarId, avatarUrl) => {
            setSelectedAvatarId(avatarId);
            setSelectedAvatarUrl(avatarUrl);
            setIsAvatarModalVisible(false);
          }}
        />
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  editProfileHeaderBar: {
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
  editProfileTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  editSaveBtn: {
    width: 48,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  saveActionText: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#FE5B01',
    letterSpacing: 0.5,
  },
  saveActionTextDisabled: {
    color: '#52525B',
    opacity: 0.5,
  },
  editProfileContainer: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  editAvatarCenterSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  editAvatarCircleWrapper: {
    position: 'relative',
    width: 106,
    height: 106,
    borderRadius: 53,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarGlowRing: {
    width: 106,
    height: 106,
    borderRadius: 53,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  editAvatarCircleFrame: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editPencilBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modernFormContainer: {
    gap: 12,
    marginVertical: 10,
  },
  modernFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  modernRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 20,
    textAlign: 'center',
  },
  modernRowLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#E4E4E7',
  },
  modernRowInput: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
    paddingVertical: 0,
  },
  modernDateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modernDateValueText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    fontWeight: '600',
    color: '#FE5B01',
  },
  genderDropdownContainer: {
    backgroundColor: '#1C1C22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D2D38',
    padding: 6,
    gap: 2,
  },
  genderDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  genderDropdownItemSelected: {
    backgroundColor: 'rgba(254, 91, 1, 0.12)',
  },
  genderDropdownItemText: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    color: '#D4D4D8',
  },
  genderDropdownItemTextSelected: {
    color: '#FE5B01',
    fontWeight: '700',
  },
  updateBadge: {
    backgroundColor: 'rgba(254, 91, 1, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(254, 91, 1, 0.3)',
  },
  updateBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: '#FE5B01',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  unitSwitcherAboveRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: -4,
    marginTop: 2,
  },
  inlineUnitSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#27272A',
    borderRadius: 7,
    padding: 2,
  },
  inlineUnitBtn: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineUnitBtnActive: {
    backgroundColor: '#FE5B01',
  },
  inlineUnitBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10.5,
    color: '#A1A1AA',
    fontWeight: '700',
  },
  inlineUnitBtnTextActive: {
    color: '#FFFFFF',
  },
  modernRowValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    marginLeft: 12,
  },
  modernRowNumericInput: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'right',
    minWidth: 44,
    paddingVertical: 0,
  },
  modernRowSuffix: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    color: '#71717A',
    marginLeft: 4,
  },
  proteinSuffix: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    color: '#A1A1AA',
    marginLeft: 4,
  },
  modernAccountCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modernAccountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modernAccountLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  modernAccountEmail: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#A1A1AA',
  },
  googleProviderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#FE5B01',
    backgroundColor: '#141416',
  },
  googleProviderPillText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#FE5B01',
  },
  appleProviderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#18181B',
  },
  appleProviderPillText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emailProviderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#FE5B01',
    backgroundColor: '#141416',
  },
  emailProviderPillText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#FE5B01',
  },
  deleteAccountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  deleteAccountText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    textDecorationLine: 'underline',
  },
  customModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 9999,
  },
  calendarCard: {
    width: '100%',
    backgroundColor: '#16161C',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FE5B01',
    padding: 20,
    alignItems: 'center',
  },
  calendarTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: '800',
    color: '#FE5B01',
    letterSpacing: 1,
    marginBottom: 16,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calMonthYearClickableGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calPillBtn: {
    backgroundColor: '#24242B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  calMonthYearText: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  calBackToDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#222228',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  calBackToDayText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#FE5B01',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 6,
    width: '100%',
    marginBottom: 20,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#222226',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayCell: {
    backgroundColor: '#FE5B01',
  },
  dayCellText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#D4D4D8',
  },
  selectedDayCellText: {
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  monthCell: {
    width: '28%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#222226',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMonthCell: {
    backgroundColor: '#FE5B01',
  },
  monthCellText: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#D4D4D8',
  },
  selectedMonthCellText: {
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  yearsScrollContainer: {
    maxHeight: 220,
    width: '100%',
    marginBottom: 20,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  yearCell: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#222226',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedYearCell: {
    backgroundColor: '#FE5B01',
  },
  yearCellText: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#D4D4D8',
  },
  selectedYearCellText: {
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calendarActionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  calBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCancelBtn: {
    backgroundColor: '#27272A',
  },
  calCancelText: {
    fontFamily: fontFamilies.bold,
    color: '#D4D4D8',
    fontWeight: '700',
    fontSize: 13,
  },
  calConfirmBtn: {
    backgroundColor: '#FE5B01',
  },
  calConfirmText: {
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  bottomCenterToast: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  bottomCenterToastText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
