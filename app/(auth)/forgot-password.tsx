import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
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
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/common/Button';
import { DustParticles } from '@/components/common/DustParticles';
import { colors } from '@/theme/colors';
import { fontFamilies } from '@/theme/typography';
import { forgotPassword } from '@/services/api/auth.service';
import { CLOUDINARY_ASSETS } from '@/constants/cloudinaryAssets';
import { optimizeCloudinaryUrl, DEFAULT_BLURHASH } from '@/services/media/cloudinary';

const HERO_ASPECT_RATIO = 1264 / 848; // image height / image width
const HERO_TOP_OFFSET = 55;
// The content starts at ~58% down the hero image (just below the character's body)
const HERO_CONTENT_RATIO = 0.58;

export default function ForgotPasswordScreen() {
  const { width: screenWidth } = useWindowDimensions();
  // Calculate where the form should start based on the actual rendered hero height
  const heroHeight = screenWidth * HERO_ASPECT_RATIO;
  const formStartY = HERO_TOP_OFFSET + heroHeight * HERO_CONTENT_RATIO;
  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Staggered slide-up entrance animation
  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.stagger(140, [
      Animated.timing(headerAnim, {
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
  }, [headerAnim, formAnim]);

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

  const handleSendRecovery = async () => {
    if (!email.trim()) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const msg = await forgotPassword(email.trim());
      setSuccess(msg);
      setTimeout(() => {
        router.push({
          pathname: '/(auth)/recovery-sent',
          params: { email: email.trim() },
        });
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Image Container */}
      <View style={styles.heroBackground}>
        <Image
          source={{ uri: optimizeCloudinaryUrl(CLOUDINARY_ASSETS.lost_access_bg.uri, 1200) }}
          style={styles.heroImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={{ blurhash: DEFAULT_BLURHASH }}
          transition={200}
        />

        {/* Flat dark overlay for text readability */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.45)' }]} />

        {/* Gradient transition to solid black at the bottom to hide lower body/ledge */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', '#000000', '#000000']}
          locations={[0, 0.35, 0.65, 1.0]}
          style={StyleSheet.absoluteFill}
        />

        {/* Solid black mask at the bottom to hide sketchy ledge lines */}
        <View style={styles.bottomMask} />

        {/* Ambient Floating Dust Animation */}
        <DustParticles count={25} />
      </View>

      {/* Back Button positioned on top of the background */}
      <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
        <Feather name="arrow-left" size={24} color="#FFFFFF" />
      </Pressable>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Spacer to push form content down below the character — height is dynamic */}
          <View style={{ height: formStartY }} />

          {/* Form & Content */}
          <View style={styles.contentContainer}>
            <Animated.View style={createAnimatedStyle(headerAnim)}>
              <Text style={styles.tagText}>LOST ACCESS</Text>
              <Text style={styles.titleText}>Recover your account</Text>
              <Text style={styles.subtitleText}>
                Enter the email linked to your HunterX account and we will send you a recovery link
              </Text>
            </Animated.View>

            <Animated.View style={createAnimatedStyle(formAnim)}>
              {/* Email Input */}
              <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
                <Feather
                  name="mail"
                  size={18}
                  color={isFocused ? colors.accentGold : '#71717A'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="#52525B"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
              </View>

              {/* Subtext */}
              <Text style={styles.helpText}>
                Check your spam folder if you don't receive it within 2 minutes.
              </Text>

              {/* Error Banner */}
              {error ? (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Send Recovery Button */}
              <Button
                label="SEND RECOVERY LINK"
                onPress={handleSendRecovery}
                loading={loading}
                variant="primary"
                style={styles.submitButton}
                labelStyle={styles.submitButtonLabel}
              />

              {/* Back to Login Footer */}
              <View style={styles.footerContainer}>
                <Text style={styles.footerPrefix}>Remember your password?</Text>
                <Link href="/(auth)/login" asChild replace>
                  <Pressable style={styles.backToLoginPressable}>
                    <Text style={styles.backToLoginLink}>BACK TO LOGIN</Text>
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
    backgroundColor: 'transparent',
  },
  heroBackground: {
    position: 'absolute',
    top: 55, // space over head
    left: 0,
    right: 0,
    aspectRatio: 848 / 1264, // Exact aspect ratio of the image
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  // headerSpacer removed — height is now dynamic (inline style)
  backButton: {
    position: 'absolute',
    top: 54,
    left: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomMask: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 240,
    backgroundColor: '#000000',
    zIndex: 2,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  tagText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    letterSpacing: 2.2,
    color: colors.accentGold,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  titleText: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  subtitleText: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
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
  helpText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#66666E',
    marginTop: 10,
    marginBottom: 24,
  },
  submitButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  submitButtonLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    letterSpacing: 1.8,
    color: '#000000',
  },
  dividerContainer: {
    marginVertical: 28,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#1E1E22',
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 36,
  },
  footerPrefix: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: '#71717A',
    marginBottom: 8,
  },
  backToLoginPressable: {
    paddingVertical: 4,
  },
  backToLoginLink: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    letterSpacing: 1.8,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },
});
