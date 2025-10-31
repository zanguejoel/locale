/**
 * In-App Purchase Service
 * 
 * Handles all IAP operations using expo-iap
 * Supports both iOS and Android
 */

import * as IAP from 'expo-iap';
import { Platform } from 'react-native';
import {
  ALL_PRODUCT_IDS,
  isSubscriptionProduct,
  isCreditProduct,
  getCreditsFromProductId,
} from '@/constants/IAPProducts';

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
  purchases?: IAP.InAppPurchase[];
  error?: string;
}

class IAPService {
  private isConnected = false;
  private products: IAPProduct[] = [];
  private purchaseUpdateSubscription: IAP.Subscription | null = null;

  /**
   * Initialize IAP connection
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('[IAPService] Initializing...');
      
      // Connect to store
      await IAP.connectAsync();
      this.isConnected = true;
      
      console.log('[IAPService] Connected to store');

      // Set up purchase listener
      this.setupPurchaseListener();

      // Fetch products
      await this.fetchProducts();

      console.log('[IAPService] Initialization complete');
      return true;
    } catch (error) {
      console.error('[IAPService] Initialization failed:', error);
      this.isConnected = false;
      return false;
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
        await IAP.disconnectAsync();
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
    this.purchaseUpdateSubscription = IAP.purchaseUpdatedListener((event) => {
      console.log('[IAPService] Purchase updated:', event);
      
      // Handle purchase updates
      // This is mainly for deferred purchases and subscription renewals
      if (event.results && event.results.length > 0) {
        event.results.forEach((purchase) => {
          // Finish transaction
          this.finishTransaction(purchase);
        });
      }
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

      const items = await IAP.getProductsAsync(ALL_PRODUCT_IDS);
      
      this.products = items.map((item) => ({
        productId: item.productId,
        title: item.title,
        description: item.description,
        price: item.price || '0',
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

      const results = await IAP.purchaseItemAsync(productId);
      
      if (results && results.results && results.results.length > 0) {
        const purchase = results.results[0];
        
        console.log('[IAPService] Purchase successful:', purchase);

        // Get receipt/token based on platform
        const receipt = Platform.OS === 'ios' 
          ? results.results[0].transactionReceipt 
          : results.results[0].purchaseToken;

        return {
          success: true,
          productId,
          transactionReceipt: Platform.OS === 'ios' ? results.results[0].transactionReceipt : undefined,
          purchaseToken: Platform.OS === 'android' ? results.results[0].purchaseToken : undefined,
        };
      }

      throw new Error('Purchase failed - no results');
    } catch (error: any) {
      console.error('[IAPService] Purchase error:', error);

      // Check if user cancelled
      if (error.code === 'USER_CANCELLED' || error.message?.includes('cancel')) {
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
  async finishTransaction(purchase: IAP.InAppPurchase): Promise<void> {
    try {
      console.log('[IAPService] Finishing transaction:', purchase.productId);

      if (Platform.OS === 'android') {
        // Android - consume for consumables, acknowledge for subscriptions
        if (isCreditProduct(purchase.productId)) {
          await IAP.finishTransactionAsync(purchase, true); // true = consume
        } else {
          await IAP.finishTransactionAsync(purchase, false); // false = acknowledge
        }
      } else {
        // iOS - just finish
        await IAP.finishTransactionAsync(purchase, false);
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

      const history = await IAP.getPurchaseHistoryAsync();
      
      console.log('[IAPService] Restored purchases:', history.length);

      return {
        success: true,
        purchases: history,
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
  async getPurchaseHistory(): Promise<IAP.InAppPurchase[]> {
    try {
      if (!this.isConnected) {
        throw new Error('IAP not connected');
      }

      return await IAP.getPurchaseHistoryAsync();
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
      if (Platform.OS === 'ios' && item.priceAmountMicros) {
        return item.priceAmountMicros / 1000000;
      }
      if (Platform.OS === 'android' && item.price_amount_micros) {
        return parseFloat(item.price_amount_micros) / 1000000;
      }
      // Fallback: parse from price string
      if (item.price) {
        const match = item.price.match(/[\d,.]+/);
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

