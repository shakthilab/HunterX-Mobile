import { Image as ExpoImage } from 'expo-image';
import { Image as RNImage } from 'react-native';
import { CLOUDINARY_ASSETS } from '@/constants/cloudinaryAssets';
import { optimizeCloudinaryUrl } from '@/services/media/cloudinary';
import { preloadTaskDoneSound } from '@/services/audio/taskDoneSound';

// login.tsx and ascension.tsx render these two at a width-capped Cloudinary
// variant (see their HERO_IMAGE_URI), not the raw asset URL below — so they
// need their own prefetch call for that exact derived URL, or the generic
// pass over CLOUDINARY_ASSETS never actually warms the cache they read from.
// They're also the very first screen a logged-out or freshly-onboarded user
// sees, often before the rest of this preload has had time to finish, so
// they go first and get a head start on network priority instead of
// competing equally with ~20 other images most screens don't need yet.
const PRIORITY_IMAGE_URLS = [
  optimizeCloudinaryUrl(CLOUDINARY_ASSETS.login_bg.uri, 1200),
  optimizeCloudinaryUrl(CLOUDINARY_ASSETS.screen.uri, 1200),
];

async function prefetchUrl(url: string): Promise<void> {
  try {
    await Promise.all([
      ExpoImage.prefetch(url, 'memory-disk'),
      RNImage.prefetch(url),
    ]);
  } catch (e) {
    // Non-blocking: individual prefetch failure will gracefully fallback to on-demand load
  }
}

/**
 * Preloads and warms the memory and disk caches for all remote Cloudinary assets
 * and local sound assets so they render/play instantly with zero delay.
 */
export async function preloadAppAssets(): Promise<void> {
  // Pre-warm done.wav audio buffer for ultra-snappy feedback
  preloadTaskDoneSound().catch(() => { });

  // Give the login/ascension hero images a head start before the rest of the
  // catalog starts competing for bandwidth.
  await Promise.allSettled(PRIORITY_IMAGE_URLS.map(prefetchUrl));

  const imageUrls = Object.values(CLOUDINARY_ASSETS)
    .map((asset) => asset.uri)
    .filter((uri) => !uri.includes('/video/upload/') && !uri.endsWith('.mp3'))
    // login_bg/screen are covered above at their actual display size —
    // prefetching their raw, uncapped originals too would be pure waste.
    .filter((uri) => uri !== CLOUDINARY_ASSETS.login_bg.uri && uri !== CLOUDINARY_ASSETS.screen.uri);

  // Pre-cache the remaining images in parallel across expo-image and React Native image caches
  await Promise.allSettled(imageUrls.map(prefetchUrl));
}
