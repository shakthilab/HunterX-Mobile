import { useEffect, useRef, useState } from 'react';
import { Link, router } from 'expo-router';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { GoogleIcon } from '@/components/common/GoogleIcon';
import { useAuth } from '@/hooks/useAuth';
import { resendOtp, verifyOtp } from '@/services/api/auth.service';
import { isGoogleSignInCancelled, signInWithGoogle } from '@/services/auth/googleAuth';
import { buildOnboardingAnswers, useOnboardingStore } from '@/store/useOnboardingStore';
import { showGlobalToast } from '@/store/useToastStore';
import { colors } from '@/theme/colors';
import { fontFamilies } from '@/theme/typography';

export default function SignupScreen() {
  const { signup, loginWithGoogle, isAuthenticating } = useAuth();
  const storeHunterName = useOnboardingStore((s) => s.hunterName);
  const verifiedEmail = useOnboardingStore((s) => s.verifiedEmail);
  const setVerifiedEmail = useOnboardingStore((s) => s.setVerifiedEmail);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // OTP Popup Modal states
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpCanResend, setOtpCanResend] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);
  const [isOtpSlotFocused, setIsOtpSlotFocused] = useState(false);
  const otpInputRef = useRef<TextInput>(null);

  const isEmailVerified = !!verifiedEmail && verifiedEmail === email.trim();
  const isValidEmail = (emailStr: string) => /\S+@\S+\.\S+/.test(emailStr.trim());

  const isFormValid =
    isValidEmail(email) &&
    isEmailVerified &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | 'confirmPassword' | null>(null);

  const titleAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(140, [
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [titleAnim, formAnim]);

  // Modal OTP countdown timer effect
  useEffect(() => {
    let interval: any;
    if (isOtpModalOpen && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setOtpCanResend(true);
    }
    return () => clearInterval(interval);
  }, [isOtpModalOpen, otpTimer]);

  // Real-time password matching validation
  useEffect(() => {
    if (confirmPassword.length > 0 && password !== confirmPassword) {
      setError('Passwords do not match');
    } else {
      setError(null);
    }
  }, [password, confirmPassword]);

  const createAnimatedStyle = (animVal: Animated.Value) => ({
    opacity: animVal,
    transform: [
      {
        translateY: animVal.interpolate({
          inputRange: [0, 1],
          outputRange: [60, 0],
        }),
      },
    ],
  });

  const handleSendEmailOtp = async () => {
    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    setSendingOtp(true);
    try {
      const msg = await resendOtp(cleanEmail);
      setOtpSuccessMsg(msg || 'Verification code sent to your email. It expires in 10 minutes.');
      // Open OTP popup modal directly over signup screen
      setOtpCode('');
      setOtpError(null);
      setOtpTimer(60);
      setOtpCanResend(false);
      setIsOtpModalOpen(true);
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtpCode = async () => {
    if (otpCode.length < 6) return;
    setOtpError(null);
    setOtpLoading(true);
    const cleanEmail = email.trim();
    try {
      await verifyOtp(cleanEmail, otpCode);
      setVerifiedEmail(cleanEmail);
      setIsOtpModalOpen(false); // Close modal popup
      setOtpCode('');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Verification failed');
      setOtpCode('');
      otpInputRef.current?.focus();
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtpInModal = async () => {
    if (!otpCanResend) return;
    setOtpError(null);
    setOtpCanResend(false);
    setOtpTimer(60);
    try {
      const msg = await resendOtp(email.trim());
      setOtpSuccessMsg(msg || 'Verification code sent to your email. It expires in 10 minutes.');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Failed to resend code');
    }
  };

  const renderOtpSlots = () => {
    const slots = [];
    for (let i = 0; i < 6; i++) {
      const char = otpCode[i] || '';
      const isFocusedSlot = isOtpSlotFocused && otpCode.length === i;
      slots.push(
        <Pressable
          key={i}
          style={[
            styles.modalSlotBox,
            char.length > 0 && styles.modalSlotBoxFilled,
            isFocusedSlot && styles.modalSlotBoxFocused,
          ]}
          onPress={() => otpInputRef.current?.focus()}
        >
          <Text style={[styles.modalSlotText, isFocusedSlot && styles.modalSlotTextFocused]}>
            {char}
          </Text>
          {isFocusedSlot && <View style={styles.modalFocusCursor} />}
        </Pressable>
      );
    }
    return slots;
  };

  const handleSignup = async () => {
    setError(null);
    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!isEmailVerified) {
      await handleSendEmailOtp();
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const storeState = useOnboardingStore.getState();

    const registerPayload = {
      name: storeState.hunterName || 'Hunter',
      email: cleanEmail,
      password: password,
      onboarding: buildOnboardingAnswers(),
    };

    try {
      await signup(registerPayload);
      router.replace('/(onboarding)/ascension');
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : 'Signup failed';
      if (errMsg.toLowerCase().includes('already exist') || errMsg.toLowerCase().includes('already registered')) {
        showGlobalToast('User Account is already exist', 'info');
      } else {
        setError(errMsg);
      }
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const { isNew } = await loginWithGoogle(idToken, buildOnboardingAnswers());
      if (isNew) {
        router.replace('/(onboarding)/ascension');
      } else {
        router.replace('/(tabs)');
        setTimeout(() => {
          showGlobalToast('User Account is already exist', 'info');
        }, 350);
      }
    } catch (err) {
      if (!isGoogleSignInCancelled(err)) {
        const errMsg = err instanceof Error ? err.message : 'Google sign-in failed';
        if (errMsg.toLowerCase().includes('already exist') || errMsg.toLowerCase().includes('already registered')) {
          router.replace('/(tabs)');
          setTimeout(() => {
            showGlobalToast('User Account is already exist', 'info');
          }, 350);
        } else {
          setError(errMsg);
        }
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Screen style={styles.container}>
      <Animated.View style={createAnimatedStyle(titleAnim)}>
        <Text style={styles.title}>THE SYSTEM AWAITS</Text>
        <Text style={styles.subtitle}>Create your account and take your first step as a Hunter</Text>
      </Animated.View>

      <Animated.View style={[styles.form, createAnimatedStyle(formAnim)]}>

        <View
          style={[
            styles.inputWrapper,
            focusedInput === 'email' && styles.inputWrapperFocused,
          ]}
        >
          <Feather
            name="mail"
            size={18}
            color={focusedInput === 'email' ? colors.accentGold : '#71717A'}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Hunters ID (Email)"
            placeholderTextColor="#52525B"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(txt) => {
              setEmail(txt);
              if (verifiedEmail && txt.trim() !== verifiedEmail) {
                setVerifiedEmail(null);
              }
            }}
            onFocus={() => setFocusedInput('email')}
            onBlur={() => setFocusedInput(null)}
          />

          {isEmailVerified ? (
            <Feather name="check-circle" size={20} color="#71717A" />
          ) : (
            <Pressable
              onPress={handleSendEmailOtp}
              disabled={!isValidEmail(email) || sendingOtp}
              style={[
                styles.verifyPill,
                isValidEmail(email) && styles.verifyPillActive,
              ]}
              hitSlop={8}
            >
              <Text
                style={[
                  styles.verifyPillText,
                  isValidEmail(email) && styles.verifyPillTextActive,
                ]}
              >
                {sendingOtp ? 'SENDING...' : 'VERIFY'}
              </Text>
            </Pressable>
          )}
        </View>

        <View
          style={[
            styles.inputWrapper,
            focusedInput === 'password' && styles.inputWrapperFocused,
          ]}
        >
          <Feather
            name="lock"
            size={18}
            color={focusedInput === 'password' ? colors.accentGold : '#71717A'}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Secret Key (Password)"
            placeholderTextColor="#52525B"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedInput('password')}
            onBlur={() => setFocusedInput(null)}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
            <Feather
              name={showPassword ? 'eye' : 'eye-off'}
              size={18}
              color={focusedInput === 'password' ? colors.accentGold : '#71717A'}
            />
          </Pressable>
        </View>

        <View
          style={[
            styles.inputWrapper,
            focusedInput === 'confirmPassword' && styles.inputWrapperFocused,
          ]}
        >
          <Feather
            name="lock"
            size={18}
            color={focusedInput === 'confirmPassword' ? colors.accentGold : '#71717A'}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Secret Key"
            placeholderTextColor="#52525B"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onFocus={() => setFocusedInput('confirmPassword')}
            onBlur={() => setFocusedInput(null)}
          />
          <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={10}>
            <Feather
              name={showConfirmPassword ? 'eye' : 'eye-off'}
              size={18}
              color={focusedInput === 'confirmPassword' ? colors.accentGold : '#71717A'}
            />
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label="CREATE ACCOUNT"
          onPress={handleSignup}
          loading={isAuthenticating}
          disabled={!isFormValid || isGoogleLoading}
          variant="primary"
          style={[styles.signupButton, !isFormValid && styles.signupButtonDisabled]}
          labelStyle={[styles.signupButtonLabel, !isFormValid && styles.signupButtonLabelDisabled]}
        />

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Sign Up Buttons */}
        <Button
          label="Continue with Google"
          onPress={handleGoogleSignup}
          loading={isGoogleLoading}
          disabled={isAuthenticating}
          variant="outline"
          icon={<GoogleIcon size={18} />}
          style={styles.socialButton}
          labelStyle={styles.socialButtonLabel}
        />

        <Button
          label="Continue with Apple"
          onPress={() => {}}
          variant="outline"
          icon={<Ionicons name="logo-apple" size={18} color="#FFFFFF" />}
          style={[styles.socialButton, { marginTop: 10 }]}
          labelStyle={styles.socialButtonLabel}
        />

        <View style={styles.loginLinkContainer}>
          <Text style={styles.loginPrefix}>Already a Hunter? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.loginLink}>Log in</Text>
            </Pressable>
          </Link>
        </View>
      </Animated.View>

      {/* ── OTP Verification Modal Popup ── */}
      <Modal
        visible={isOtpModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOtpModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsOtpModalOpen(false)} />

          <View style={styles.modalCard}>
            {/* Close Button */}
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setIsOtpModalOpen(false)}
              hitSlop={12}
            >
              <Feather name="x" size={18} color="#9CA3AF" />
            </Pressable>

            {/* Header Icon & Title */}
            <View style={styles.modalIconCircle}>
              <Feather name="mail" size={22} color={colors.accentGold} />
            </View>

            <Text style={styles.modalSectionLabel}>EMAIL VERIFICATION</Text>
            <Text style={styles.modalTitle}>Confirm your email</Text>
            <Text style={styles.modalDescription}>
              We sent a 6-digit access code to{' '}
              <Text style={styles.modalEmailHighlight}>{email}</Text>. Enter it below to verify.
            </Text>

            {/* Overlay Input Container */}
            <View style={styles.modalOtpInputContainer}>
              {/* OTP Slots Row */}
              <View style={styles.modalSlotsRow}>{renderOtpSlots()}</View>

              {/* Stretched Input field covering the slots */}
              <TextInput
                ref={otpInputRef}
                style={styles.modalOverlayInput}
                value={otpCode}
                onChangeText={(txt) => {
                  const clean = txt.replace(/[^0-9]/g, '');
                  setOtpCode(clean);
                  if (clean.length === 6) {
                    Keyboard.dismiss();
                  }
                }}
                onFocus={() => setIsOtpSlotFocused(true)}
                onBlur={() => setIsOtpSlotFocused(false)}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                selectionColor="transparent"
              />
            </View>



            {/* Error Message */}
            {otpError ? (
              <View style={styles.modalErrorBox}>
                <Feather name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.modalErrorText}>{otpError}</Text>
              </View>
            ) : null}

            {/* Resend Code */}
            <View style={styles.modalResendContainer}>
              {otpTimer > 0 ? (
                <Text style={styles.modalTimerText}>
                  Resend code in <Text style={styles.modalTimerBold}>{otpTimer}s</Text>
                </Text>
              ) : (
                <View style={styles.modalResendRow}>
                  <Text style={styles.modalResendPrefix}>Didn't receive code? </Text>
                  <Pressable onPress={handleResendOtpInModal}>
                    <Text style={styles.modalResendLink}>Resend Code</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Submit Verification Button */}
            <Button
              label="VERIFY CODE"
              onPress={handleVerifyOtpCode}
              loading={otpLoading}
              disabled={otpCode.length < 6}
              variant="primary"
              style={styles.modalCtaButton}
              labelStyle={styles.modalCtaLabel}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#000000',
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    letterSpacing: 4,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  form: {
    gap: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C0C0E',
    borderWidth: 1,
    borderColor: '#26262B',
    borderRadius: 8,
    height: 52,
    paddingHorizontal: 16,
  },
  inputWrapperFocused: {
    borderColor: colors.accentGold,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  errorText: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
  },
  signupButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  signupButtonDisabled: {
    backgroundColor: '#1E1E22',
    borderColor: '#26262B',
    borderWidth: 1,
    opacity: 0.6,
  },
  signupButtonLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    letterSpacing: 2,
    color: '#000000',
  },
  signupButtonLabelDisabled: {
    color: '#52525B',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginPrefix: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: '#71717A',
  },
  loginLink: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedBadgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: '#10B981',
  },
  verifyPill: {
    backgroundColor: '#1E1E22',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    opacity: 0.5,
  },
  verifyPillActive: {
    backgroundColor: 'rgba(229, 169, 60, 0.15)',
    borderWidth: 1,
    borderColor: colors.accentGold,
    opacity: 1,
  },
  verifyPillText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: '#71717A',
  },
  verifyPillTextActive: {
    color: colors.accentGold,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E1E22',
  },
  dividerText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: '#52525B',
    marginHorizontal: 14,
    letterSpacing: 1,
  },
  socialButton: {
    height: 50,
    borderRadius: 8,
    backgroundColor: '#0C0C0E',
    borderColor: '#222226',
  },
  socialButtonLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    color: '#F4F4F6',
    letterSpacing: 0,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  modalOtpInputContainer: {
    position: 'relative',
    width: '100%',
  },
  modalOverlayInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    width: '100%',
    height: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: '#26262B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#1E1E22',
  },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(229, 169, 60, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229, 169, 60, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  modalSectionLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.accentGold,
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalEmailHighlight: {
    fontFamily: fontFamilies.medium,
    color: '#FFFFFF',
  },
  modalSlotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  modalSlotBox: {
    width: 44,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#1C1C20',
    borderWidth: 1,
    borderColor: '#2D2D33',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  modalSlotBoxFilled: {
    borderColor: '#4B5563',
  },
  modalSlotBoxFocused: {
    borderColor: colors.accentGold,
    backgroundColor: '#24242A',
  },
  modalSlotText: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: '#F3F4F6',
  },
  modalSlotTextFocused: {
    color: colors.accentGold,
  },
  modalFocusCursor: {
    position: 'absolute',
    width: 2,
    height: 18,
    backgroundColor: colors.accentGold,
    borderRadius: 1,
  },
  modalSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    width: '100%',
  },
  modalSuccessText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#10B981',
    textAlign: 'center',
    flex: 1,
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    width: '100%',
  },
  modalErrorText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#EF4444',
  },
  modalResendContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTimerText: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: '#71717A',
  },
  modalTimerBold: {
    fontFamily: fontFamilies.medium,
    color: colors.accentGold,
  },
  modalResendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalResendPrefix: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: '#71717A',
  },
  modalResendLink: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  modalCtaButton: {
    width: '100%',
    height: 48,
    borderRadius: 10,
  },
  modalCtaLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    letterSpacing: 2,
  },
});
