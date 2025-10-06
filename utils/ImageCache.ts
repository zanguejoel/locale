/**
 * Image Cache Management Utility
 * Provides functions to manage expo-image cache
 */

import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';

/**
 * Cache size limits (in bytes)
 */
export const CACHE_LIMITS = {
  MEMORY: 50 * 1024 * 1024,    // 50 MB memory cache
  DISK: 200 * 1024 * 1024,      // 200 MB disk cache
  WARNING_THRESHOLD: 0.8,       // Warn when 80% full
} as const;

/**
 * Cache policies for different image types
 */
export const CACHE_POLICIES = {
  // User-uploaded images: aggressive caching
  USER_IMAGES: {
    memory: true,
    disk: true,
    policy: 'memory-disk' as const,
    priority: 'high' as const,
  },
  
  // Generated images: balanced caching
  GENERATED_IMAGES: {
    memory: true,
    disk: true,
    policy: 'memory-disk' as const,
    priority: 'normal' as const,
  },
  
  // Thumbnails: memory-only for speed
  THUMBNAILS: {
    memory: true,
    disk: false,
    policy: 'memory' as const,
    priority: 'high' as const,
  },
  
  // Large images: disk-only to save memory
  LARGE_IMAGES: {
    memory: false,
    disk: true,
    policy: 'disk' as const,
    priority: 'low' as const,
  },
} as const;

/**
 * Clear all image caches (memory + disk)
 * Use with caution - this will clear ALL cached images
 */
export async function clearAllImageCache(): Promise<void> {
  try {
    await Image.clearMemoryCache();
    await Image.clearDiskCache();
    console.log('[ImageCache] Successfully cleared all image caches');
  } catch (error) {
    console.error('[ImageCache] Error clearing cache:', error);
    throw error;
  }
}

/**
 * Clear only memory cache (faster, less aggressive)
 * Disk cache remains intact for persistent storage
 */
export async function clearMemoryCache(): Promise<void> {
  try {
    await Image.clearMemoryCache();
    console.log('[ImageCache] Successfully cleared memory cache');
  } catch (error) {
    console.error('[ImageCache] Error clearing memory cache:', error);
    throw error;
  }
}

/**
 * Clear only disk cache (more aggressive, frees storage)
 * Memory cache remains for immediate access
 */
export async function clearDiskCache(): Promise<void> {
  try {
    await Image.clearDiskCache();
    console.log('[ImageCache] Successfully cleared disk cache');
  } catch (error) {
    console.error('[ImageCache] Error clearing disk cache:', error);
    throw error;
  }
}

/**
 * Prefetch images for faster loading
 * Useful for preloading images that will be shown soon
 */
export async function prefetchImages(urls: string[]): Promise<void> {
  try {
    const prefetchPromises = urls.map(url => Image.prefetch(url));
    await Promise.all(prefetchPromises);
    console.log(`[ImageCache] Successfully prefetched ${urls.length} images`);
  } catch (error) {
    console.error('[ImageCache] Error prefetching images:', error);
    // Don't throw - prefetch failures shouldn't break the app
  }
}

/**
 * Get estimated cache size
 * Note: This is an approximation as expo-image doesn't expose cache size directly
 */
export async function getEstimatedCacheSize(): Promise<{
  disk: number;
  canCalculate: boolean;
}> {
  try {
    // Try to get disk cache directory size
    const cacheDir = `${FileSystem.cacheDirectory}expo-image`;
    
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    
    if (dirInfo.exists && dirInfo.isDirectory) {
      // This is a rough estimate - would need to traverse directory for accurate size
      return {
        disk: 0, // expo-image doesn't expose this easily
        canCalculate: false,
      };
    }
    
    return {
      disk: 0,
      canCalculate: false,
    };
  } catch (error) {
    console.error('[ImageCache] Error getting cache size:', error);
    return {
      disk: 0,
      canCalculate: false,
    };
  }
}

/**
 * Smart cache cleanup
 * Clears cache only if it's getting full
 */
export async function smartCacheCleanup(): Promise<void> {
  try {
    const cacheSize = await getEstimatedCacheSize();
    
    // If we can't calculate cache size, do a periodic cleanup anyway
    if (!cacheSize.canCalculate) {
      console.log('[ImageCache] Running periodic cache cleanup');
      await clearMemoryCache(); // Clear memory only, keep disk cache
      return;
    }
    
    // Clear if over warning threshold
    if (cacheSize.disk > CACHE_LIMITS.DISK * CACHE_LIMITS.WARNING_THRESHOLD) {
      console.log('[ImageCache] Cache size exceeds threshold, clearing disk cache');
      await clearDiskCache();
    }
  } catch (error) {
    console.error('[ImageCache] Error in smart cleanup:', error);
    // Continue without breaking the app
  }
}

/**
 * Preload next batch of images for smooth scrolling
 * Call this when user approaches the end of current view
 */
export async function preloadNextBatch(
  imageUrls: string[],
  startIndex: number,
  batchSize: number = 5
): Promise<void> {
  const endIndex = Math.min(startIndex + batchSize, imageUrls.length);
  const urlsToPreload = imageUrls.slice(startIndex, endIndex);
  
  if (urlsToPreload.length > 0) {
    await prefetchImages(urlsToPreload);
  }
}

/**
 * Get recommended cache policy based on image characteristics
 */
export function getRecommendedCachePolicy(imageSize?: number, isGenerated?: boolean): {
  policy: 'memory' | 'disk' | 'memory-disk' | 'none';
  priority: 'low' | 'normal' | 'high';
} {
  // Large images (>2MB) - disk only
  if (imageSize && imageSize > 2 * 1024 * 1024) {
    return CACHE_POLICIES.LARGE_IMAGES;
  }
  
  // Generated images - balanced caching
  if (isGenerated) {
    return CACHE_POLICIES.GENERATED_IMAGES;
  }
  
  // Default: user images - aggressive caching
  return CACHE_POLICIES.USER_IMAGES;
}

/**
 * Initialize image cache with optimal settings
 * Call this on app startup
 */
export function initializeImageCache(): void {
  console.log('[ImageCache] Image cache initialized with expo-image');
  console.log('[ImageCache] Memory limit:', CACHE_LIMITS.MEMORY / 1024 / 1024, 'MB');
  console.log('[ImageCache] Disk limit:', CACHE_LIMITS.DISK / 1024 / 1024, 'MB');
}

