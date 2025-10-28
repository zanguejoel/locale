import { Platform } from 'react-native';
import * as Localization from 'expo-localization';

/**
 * Get the user's current timezone in IANA format
 * Falls back to UTC if unable to determine
 * 
 * @returns IANA timezone identifier (e.g., "America/New_York", "Europe/London")
 * 
 * @example
 * const timezone = getUserTimezone(); // "America/New_York"
 */
export function getUserTimezone(): string {
  try {
    // expo-localization provides the IANA timezone identifier
    const locales = Localization.getLocales();
    const timezone = locales[0]?.timeZone;
    
    if (timezone) {
      console.log(`[Timezone] Detected timezone: ${timezone}`);
      return timezone;
    }
    
    // Fallback: Try using Intl API
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const resolvedOptions = Intl.DateTimeFormat().resolvedOptions();
      if (resolvedOptions.timeZone) {
        console.log(`[Timezone] Using Intl fallback: ${resolvedOptions.timeZone}`);
        return resolvedOptions.timeZone;
      }
    }
    
    // Final fallback
    console.warn('[Timezone] Unable to detect timezone, using UTC');
    return 'UTC';
  } catch (error) {
    console.error('[Timezone] Error detecting timezone:', error);
    return 'UTC';
  }
}

/**
 * Get formatted timezone offset (e.g., "+05:30", "-08:00")
 * Useful for display purposes
 */
export function getTimezoneOffset(): string {
  try {
    const offset = new Date().getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset <= 0 ? '+' : '-';
    
    return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch (error) {
    console.error('[Timezone] Error getting timezone offset:', error);
    return '+00:00';
  }
}

/**
 * Get timezone name (e.g., "Pacific Standard Time")
 */
export function getTimezoneName(): string {
  try {
    const locales = Localization.getLocales();
    return locales[0]?.timeZone || 'UTC';
  } catch (error) {
    console.error('[Timezone] Error getting timezone name:', error);
    return 'UTC';
  }
}

