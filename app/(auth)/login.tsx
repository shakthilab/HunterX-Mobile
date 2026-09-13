import { useEffect, useRef, useState } from 'react';
import { Link, router } from 'expo-router';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/common/Button';
import { DustParticles } from '@/components/common/DustParticles';
import { GoogleIcon } from '@/components/common/GoogleIcon';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { isGoogleSignInCancelled, signInWithGoogle } from '@/services/auth/googleAuth';
import { colors } from '@/theme/colors';
import { fontFamilies } from '@/theme/typography';
import { CLOUDINARY_ASSETS } from '@/constants/cloudinaryAssets';
import { optimizeCloudinaryUrl, DEFAULT_BLURHASH } from '@/services/media/cloudinary';

// This hero image is the very first thing a logged-out user ever sees, often
// before app-wide prefetching (see preloadAppAssets) has had a chance to
// finish — so it can't rely on that alone. Width-capping the Cloudinary
// delivery cuts it to a fraction of the original's bytes, and expo-image's
// blurhash placeholder + disk cache mean it's never a blank flash again
// after the first load.
const HERO_IMAGE_URI = optimizeCloudinaryUrl(CLOUDINARY_ASSETS.login_bg.uri, 1200);

export default function LoginScreen() {
  const { login, loginWithGoogle, isAuthenticating } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);

  // Staggered slide-up entrance animation values
  const heroAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const socialAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    Animated.stagger(140, [
      Animated.timing(heroAnim, {
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
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(socialAnim, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroAnim, formAnim, buttonAnim, socialAnim]);

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

  const handleLogin = async () => {
    setError(null);
    try {
      await login(email, password);
      const isOnboarded = useAuthStore.getState().isOnboarded;
      if (isOnboarded) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)/name');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      // Login screen never has onboarding answers to attach — the account
      // gets created with placeholders, then a brand new user is sent
      // through the full wizard, which attaches their real answers to this
      // same account at the end (see oath.tsx's isAuthenticated branch).
      const { isNew } = await loginWithGoogle(idToken);
      router.replace(isNew ? '/(onboarding)/name' : '/(tabs)');
    } catch (err) {
      if (!isGoogleSignInCancelled(err)) {
        setError(err instanceof Error ? err.message : 'Google sign-in failed');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleLogin = () => {
    // Placeholder for Apple OAuth
  };

  const handleLostAccess = () => {
    router.push('/(auth)/forgot-password');
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Hero Banner Header */}
          <View style={styles.heroBackground}>
            <ExpoImage
              source={{ uri: HERO_IMAGE_URI }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              cachePolicy="memory-disk"
              placeholder={{ blurhash: DEFAULT_BLURHASH }}
              transition={200}
            />

            <DustParticles count={25} />

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)', '#000000']}
              locations={[0, 0.45, 0.8, 1.0]}
              style={StyleSheet.absoluteFill}
            />

            <Animated.View style={[styles.heroTextContainer, createAnimatedStyle(heroAnim)]}>
              <Text style={styles.title}>HUNTERX</Text>
              <Text style={styles.subtitle}>T H E   S Y S T E M   H A S   C H O S E N   Y O U</Text>
            </Animated.View>
          </View>

          {/* Form Content */}
          <View style={styles.formContainer}>
            <Animated.View style={createAnimatedStyle(formAnim)}>
              {/* Hunters ID Input */}
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
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {/* Secret Key Input */}
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
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={10}
                  style={styles.eyeIconContainer}
                >
                  <Feather
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={18}
                    color={focusedInput === 'password' ? colors.accentGold : '#71717A'}
                  />
                </Pressable>
              </View>

              {/* Lost Access Link */}
              <Pressable onPress={handleLostAccess} style={styles.lostAccessLink}>
                {({ pressed, hovered }: any) => (
                  <Text
                    style={[
                      styles.lostAccessText,
                      (pressed || hovered) && styles.lostAccessTextHovered,
                    ]}
                  >
                    LOST ACCESS?
                  </Text>
                )}
              </Pressable>
            </Animated.View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Main Action Button */}
            <Animated.View style={createAnimatedStyle(buttonAnim)}>
              <Button
                label="CONTINUE"
                onPress={handleLogin}
                loading={isAuthenticating}
                disabled={isGoogleLoading}
                variant="primary"
                style={styles.continueButton}
                labelStyle={styles.continueButtonLabel}
              />
            </Animated.View>

            {/* Social Logins & Sign Up Link */}
            <Animated.View style={createAnimatedStyle(socialAnim)}>
              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                label="Continue with Google"
                onPress={handleGoogleLogin}
                loading={isGoogleLoading}
                disabled={isAuthenticating}
                variant="outline"
                icon={<GoogleIcon size={18} />}
                style={styles.socialButton}
                labelStyle={styles.socialButtonLabel}
              />

              <Button
                label="Continue with Apple"
                onPress={handleAppleLogin}
                variant="outline"
                icon={<Ionicons name="logo-apple" size={18} color="#FFFFFF" />}
                style={[styles.socialButton, { marginTop: 10 }]}
                labelStyle={styles.socialButtonLabel}
              />

              {/* Bottom Link */}
              <View style={styles.signupContainer}>
                <Text style={styles.signupPrefix}>New here? </Text>
                <Link href="/(onboarding)/name" asChild>
                  <Pressable>
                    <Text style={styles.signupLink}>Create account</Text>
                  </Pressable>
                </Link>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#000000',
  },
  heroBackground: {
    width: '100%',
    height: 330,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  heroTextContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 36,
    letterSpacing: 8,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    letterSpacing: 2.8,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
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
    marginBottom: 12,
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
  eyeIconContainer: {
    marginLeft: 12,
  },
  lostAccessLink: {
    alignSelf: 'flex-end',
    marginTop: 6,
    marginBottom: 20,
  },
  lostAccessText: {
    fontFamily: fontFamilies.semiBoldItalic,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.8,
    fontStyle: 'italic',
  },
  lostAccessTextHovered: {
    color: colors.accentGold,
  },
  errorText: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.danger,
    marginBottom: 14,
    textAlign: 'center',
  },
  continueButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  continueButtonLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    letterSpacing: 2,
    color: '#000000',
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
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  signupPrefix: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: '#71717A',
  },
  signupLink: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});

