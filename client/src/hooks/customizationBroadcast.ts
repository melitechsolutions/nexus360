/**
 * Customization Broadcast Utilities
 * 
 * Provides BroadcastChannel API functions for cross-tab customization synchronization.
 * Separated from useCustomizationListener to avoid circular dependencies with stores.
 */

const CHANNEL_NAME = "melitech_crm_customization";

/**
 * Get or create a BroadcastChannel for customization updates
 * Gracefully handles environments where BroadcastChannel is not available
 */
function getBroadcastChannel(): BroadcastChannel | null {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      return new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (error) {
    // Silently fail - BroadcastChannel not available
  }
  return null;
}

/**
 * Broadcast brand customization updates to other tabs
 */
export function broadcastBrandUpdate(brandConfig: any, companyBrand?: any) {
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage({
        type: "brand",
        payload: { brandConfig, companyBrand }
      });
      channel.close();
    } catch (error) {
      // Silently fail - broadcast not critical
    }
  }
}

/**
 * Broadcast theme customization updates to other tabs
 */
export function broadcastThemeUpdate(config: any) {
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage({
        type: "theme",
        payload: { config }
      });
      channel.close();
    } catch (error) {
      // Silently fail - broadcast not critical
    }
  }
}

/**
 * Broadcast homepage builder updates to other tabs
 */
export function broadcastHomepageUpdate(widgets?: any, widgetOrder?: string[]) {
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage({
        type: "homepage",
        payload: { widgets, widgetOrder }
      });
      channel.close();
    } catch (error) {
      // Silently fail - broadcast not critical
    }
  }
}

/**
 * Broadcast system settings updates to other tabs
 */
export function broadcastSystemUpdate(settings: any) {
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage({
        type: "system",
        payload: { settings }
      });
      channel.close();
    } catch (error) {
      // Silently fail - broadcast not critical
    }
  }
}
