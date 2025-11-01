/**
 * In-App Purchase Service
 * 
 * Handles all IAP operations using react-native-iap
 * Supports both iOS and Android
 * Automatically falls back to mock on simulator
 */

import { Platform } from 'react-native';
import {
  ALL_PRODUCT_IDS,
  isSubscriptionProduct,
  isCreditProduct,
  getCreditsFromProductId,
} from '@/constants/IAPProducts';
import { isRunningOnSimulator, getEnvironmentDescription } from './deviceDetection';
import * as RNIap from 'react-native-iap';
import type { Product, Purchase, PurchaseError } from 'react-native-iap';

// Log module load
console.log('[IAPService] react-native-iap module loaded successfully');

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
  type: 'subscription' | 'consumable';
}

export interface PurchaseResult {
  success: boolean;
  productId?: string;
  transactionReceipt?: string;
  purchaseToken?: string;
  error?: string;
  cancelled?: boolean;
}

export interface RestoreResult {
  success: boolean;
  purchases?: any[];
  error?: string;
}

class IAPService {
  private isConnected = false;
  private products: IAPProduct[] = [];
  private purchaseUpdateSubscription: any = null;

  /**
   * Initialize IAP connection
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('[IAPService] ========================================');
      console.log('[IAPService] Starting IAP Initialization...');
      console.log('[IAPService] Environment:', getEnvironmentDescription());
      console.log('[IAPService] Platform:', Platform.OS);
      console.log('[IAPService] __DEV__:', __DEV__);
      
      console.log('[IAPService] ✓ react-native-iap module loaded successfully');

      // Check if running on simulator - CRITICAL CHECK
      if (isRunningOnSimulator()) {
        const errorMsg = 'Running on simulator - IAP requires physical device';
        console.log('[IAPService] ERROR:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[IAPService] ✓ Running on physical device');
      
      // Initialize connection with additional safety checks
      console.log('[IAPService] Connecting to App Store...');
      try {
        // Add timeout to prevent hanging
        const connectionPromise = RNIap.initConnection();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 30s')), 30000)
        );
        
        await Promise.race([connectionPromise, timeoutPromise]);
        this.isConnected = true;
        console.log('[IAPService] ✓ Connected to App Store');
      } catch (connectError: any) {
        // Check for specific StoreKit errors
        const errorCode = connectError.code || connectError.userInfo?.code;
        const errorDomain = connectError.domain || '';
        
        console.error('[IAPService] Connection Error Details:');
        console.error('  - Message:', connectError.message);
        console.error('  - Code:', errorCode);
        console.error('  - Domain:', errorDomain);
        console.error('  - Full Error:', JSON.stringify(connectError, null, 2));
        
        // Handle specific error codes
        if (errorCode === 7 || errorDomain.includes('StoreKitInternalError')) {
          throw new Error('StoreKit Error 7: Cannot connect to App Store. Please ensure you are:\n1. On a physical device (not simulator)\n2. Signed in with an Apple ID\n3. Have proper network connection');
        }
        
        const errorMsg = `Failed to connect to App Store: ${connectError.message || errorCode || 'Unknown error'}`;
        throw new Error(errorMsg);
      }

      // Set up purchase listener with error handling
      console.log('[IAPService] Setting up purchase listener...');
      try {
        this.setupPurchaseListener();
        console.log('[IAPService] ✓ Purchase listener ready');
      } catch (listenerError: any) {
        console.error('[IAPService] Warning: Could not setup purchase listener:', listenerError);
        // Don't fail initialization if listener setup fails
      }

      // Fetch products
      console.log('[IAPService] Fetching products...');
      try {
        await this.fetchProducts();
        console.log('[IAPService] ✓ Products fetched:', this.products.length);
      } catch (fetchError: any) {
        const errorMsg = `Failed to fetch products: ${fetchError.message || 'Products not available'}`;
        console.error('[IAPService] ERROR:', errorMsg);
        console.error('[IAPService] Fetch error details:', fetchError);
        throw new Error(errorMsg);
      }

      console.log('[IAPService] ✓ Initialization complete');
      console.log('[IAPService] ========================================');
      return true;
    } catch (error: any) {
      console.error('[IAPService] ========================================');
      console.error('[IAPService] INITIALIZATION FAILED');
      console.error('[IAPService] Error:', error.message || error);
      console.error('[IAPService] Error code:', error.code);
      console.error('[IAPService] Error details:', error);
      console.error('[IAPService] ========================================');
      this.isConnected = false;
      
      // Re-throw with preserved message
      throw error;
    }
  }

  /**
   * Disconnect from IAP
   */
  async disconnect(): Promise<void> {
    try {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }

      if (this.isConnected) {
        await RNIap.endConnection();
        this.isConnected = false;
      }
      
      console.log('[IAPService] Disconnected');
    } catch (error) {
      console.error('[IAPService] Error disconnecting:', error);
    }
  }

  /**
   * Set up purchase update listener
   */
  private setupPurchaseListener(): void {
    // Listen to purchase updates using v12 API
    this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener((purchase: Purchase) => {
      console.log('[IAPService] Purchase updated:', purchase);
      
      // Handle purchase updates
      // This is mainly for deferred purchases and subscription renewals
      this.finishTransaction(purchase);
    });

    // Listen to purchase errors
    RNIap.purchaseErrorListener((error: PurchaseError) => {
      console.warn('[IAPService] Purchase error:', error);
    });
  }

  /**
   * Fetch available products from store
   */
  async fetchProducts(): Promise<IAPProduct[]> {
    try {
      if (!this.isConnected) {
        throw new Error('IAP not connected');
      }

      console.log('[IAPService] Fetching products:', ALL_PRODUCT_IDS);

      // Separate subscription and consumable product IDs
      const subscriptionIds = ALL_PRODUCT_IDS.filter(id => isSubscriptionProduct(id));
      const consumableIds = ALL_PRODUCT_IDS.filter(id => !isSubscriptionProduct(id));

      // Fetch products based on platform using v12 API
      // v12 requires { skus: string[] } format, not just string[]
      let items: any[] = [];
      
      if (Platform.OS === 'ios') {
        // iOS: Fetch subscriptions and consumables separately
        const [subscriptions, products] = await Promise.all([
          subscriptionIds.length > 0 ? (RNIap.getSubscriptions as any)({ skus: subscriptionIds }) : Promise.resolve([]),
          consumableIds.length > 0 ? (RNIap.getProducts as any)({ skus: consumableIds }) : Promise.resolve([]),
        ]);
        items = [...subscriptions, ...products];
      } else {
        // Android: Fetch subscriptions and consumables separately
        const [subscriptions, products] = await Promise.all([
          subscriptionIds.length > 0 ? (RNIap.getSubscriptions as any)({ skus: subscriptionIds }) : Promise.resolve([]),
          consumableIds.length > 0 ? (RNIap.getProducts as any)({ skus: consumableIds }) : Promise.resolve([]),
        ]);
        items = [...subscriptions, ...products];
      }
      
      this.products = items.map((item: any) => ({
        productId: item.productId,
        title: item.title || '',
        description: item.description || '',
        price: item.localizedPrice || '0',
        priceAmount: this.getPriceAmount(item),
        currency: this.getCurrency(item),
        type: isSubscriptionProduct(item.productId) ? 'subscription' : 'consumable',
      }));

      console.log('[IAPService] Fetched products:', this.products.length);
      return this.products;
    } catch (error) {
      console.error('[IAPService] Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Get cached products
   */
  getProducts(): IAPProduct[] {
    return this.products;
  }

  /**
   * Get product by ID
   */
  getProduct(productId: string): IAPProduct | undefined {
    return this.products.find((p) => p.productId === productId);
  }

  /**
   * Get subscription products
   */
  getSubscriptionProducts(): IAPProduct[] {
    return this.products.filter((p) => p.type === 'subscription');
  }

  /**
   * Get consumable (credit) products
   */
  getCreditProducts(): IAPProduct[] {
    return this.products.filter((p) => p.type === 'consumable');
  }

  /**
   * Purchase a product
   */
  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    try {
      if (!this.isConnected) {
        throw new Error('IAP not connected');
      }

      console.log('[IAPService] Purchasing product:', productId);

      // Determine if subscription or consumable and use appropriate v12 API
      let purchase: any;
      
      if (isSubscriptionProduct(productId)) {
        // Purchase subscription using v12 API
        purchase = await (RNIap.requestSubscription as any)({ sku: productId });
      } else {
        // Purchase consumable using v12 API (iOS also uses singular "sku")
        purchase = await (RNIap.requestPurchase as any)({ sku: productId });
      }
      
      console.log('[IAPService] Purchase successful:', purchase);

      return {
        success: true,
        productId,
        transactionReceipt: Platform.OS === 'ios' ? purchase.transactionReceipt : undefined,
        purchaseToken: Platform.OS === 'android' ? purchase.purchaseToken : undefined,
      };
    } catch (error: any) {
      console.error('[IAPService] Purchase error:', error);

      // Check if user cancelled
      if (error.code === 'E_USER_CANCELLED' || error.message?.includes('cancel')) {
        return {
          success: false,
          cancelled: true,
          error: 'Purchase cancelled',
        };
      }

      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    }
  }

  /**
   * Finish a transaction (acknowledge/consume)
   */
  async finishTransaction(purchase: Purchase | any): Promise<void> {
    try {
      console.log('[IAPService] Finishing transaction:', purchase.productId);

      if (Platform.OS === 'android') {
        // Android - consume for consumables, acknowledge for subscriptions
        if (isCreditProduct(purchase.productId)) {
          await (RNIap as any).consumePurchaseAndroid(purchase.purchaseToken);
        } else {
          await (RNIap as any).acknowledgePurchaseAndroid(purchase.purchaseToken);
        }
      } else {
        // iOS - finish transaction using v12 API with object format
        await (RNIap.finishTransaction as any)({ 
          purchase, 
          isConsumable: isCreditProduct(purchase.productId) 
        });
      }

      console.log('[IAPService] Transaction finished');
    } catch (error) {
      console.error('[IAPService] Error finishing transaction:', error);
    }
  }

  /**
   * Restore purchases (mainly for subscriptions)
   */
  async restorePurchases(): Promise<RestoreResult> {
    try {
      if (!this.isConnected) {
        throw new Error('IAP not connected');
      }

      console.log('[IAPService] Restoring purchases...');

      // Use v12 API to get available purchases
      const purchases = await RNIap.getAvailablePurchases();
      
      console.log('[IAPService] Restored purchases:', purchases.length);

      return {
        success: true,
        purchases: purchases,
      };
    } catch (error: any) {
      console.error('[IAPService] Error restoring purchases:', error);
      return {
        success: false,
        error: error.message || 'Failed to restore purchases',
      };
    }
  }

  /**
   * Get purchase history
   */
  async getPurchaseHistory(): Promise<any[]> {
    try {
      if (!this.isConnected) {
        throw new Error('IAP not connected');
      }

      // Use v12 API to get available purchases
      return await RNIap.getAvailablePurchases();
    } catch (error) {
      console.error('[IAPService] Error getting purchase history:', error);
      return [];
    }
  }

  /**
   * Check if product is available
   */
  isProductAvailable(productId: string): boolean {
    return this.products.some((p) => p.productId === productId);
  }

  /**
   * Get IAP connection status
   */
  isIAPConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Helper to extract price amount from IAP item
   */
  private getPriceAmount(item: any): number {
    try {
      // react-native-iap v12 provides price in various formats
      // Try price field first (may be string or number)
      if (item.price !== undefined && item.price !== null) {
        const priceValue = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
        if (!isNaN(priceValue)) {
          return priceValue;
        }
      }
      
      // Fallback: parse from localizedPrice string
      if (item.localizedPrice) {
        const match = item.localizedPrice.match(/[\d,.]+/);
        if (match) {
          return parseFloat(match[0].replace(',', ''));
        }
      }
      
      return 0;
    } catch (error) {
      console.error('[IAPService] Error parsing price amount:', error);
      return 0;
    }
  }

  /**
   * Helper to extract currency from IAP item
   */
  private getCurrency(item: any): string {
    return item.currency || item.currencyCode || 'USD';
  }
}

// Export singleton instance
export const iapService = new IAPService();
export default iapService;

