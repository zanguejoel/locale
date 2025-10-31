/**
 * Mock IAP Service for Simulator Testing
 * 
 * Use this for testing UI and flows on iOS Simulator
 * Real IAP requires physical device
 */

import { IAPProduct, PurchaseResult, RestoreResult } from './IAPService';
import { ALL_PRODUCT_IDS, CREDIT_PRODUCT_METADATA, SUBSCRIPTION_PRODUCT_METADATA } from '@/constants/IAPProducts';

class IAPServiceMock {
  private isConnected = false;
  private products: IAPProduct[] = [];

  /**
   * Mock initialize - creates fake products
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('[IAPServiceMock] Initializing mock IAP...');
      
      this.isConnected = true;
      
      // Create mock products
      await this.fetchProducts();

      console.log('[IAPServiceMock] Mock initialization complete');
      return true;
    } catch (error) {
      console.error('[IAPServiceMock] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Mock disconnect
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('[IAPServiceMock] Disconnected');
  }

  /**
   * Mock fetch products - creates fake products for testing
   */
  async fetchProducts(): Promise<IAPProduct[]> {
    console.log('[IAPServiceMock] Fetching mock products...');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    this.products = ALL_PRODUCT_IDS.map((productId) => {
      const creditMeta = CREDIT_PRODUCT_METADATA[productId];
      const subMeta = SUBSCRIPTION_PRODUCT_METADATA[productId];
      const meta = creditMeta || subMeta;

      // Mock prices based on credit amounts
      let price = '$9.99';
      let priceAmount = 9.99;

      if (productId.includes('1500')) { price = '$24.99'; priceAmount = 24.99; }
      else if (productId.includes('2500')) { price = '$49.99'; priceAmount = 49.99; }
      else if (productId.includes('5000')) { price = '$99.99'; priceAmount = 99.99; }
      else if (productId.includes('10000')) { price = '$199.99'; priceAmount = 199.99; }
      else if (productId.includes('15000')) { price = '$299.99'; priceAmount = 299.99; }
      else if (productId.includes('pro_monthly')) { price = '$19.99'; priceAmount = 19.99; }
      else if (productId.includes('business_monthly')) { price = '$39.99'; priceAmount = 39.99; }
      else if (productId.includes('pro_yearly')) { price = '$199.99'; priceAmount = 199.99; }
      else if (productId.includes('business_yearly')) { price = '$399.99'; priceAmount = 399.99; }

      return {
        productId,
        title: meta?.displayName || productId,
        description: meta?.description || 'Mock product for testing',
        price,
        priceAmount,
        currency: 'USD',
        type: productId.includes('credits_') ? 'consumable' : 'subscription',
      };
    });

    console.log('[IAPServiceMock] Mock products fetched:', this.products.length);
    return this.products;
  }

  /**
   * Mock get products
   */
  getProducts(): IAPProduct[] {
    return this.products;
  }

  /**
   * Mock get product by ID
   */
  getProduct(productId: string): IAPProduct | undefined {
    return this.products.find((p) => p.productId === productId);
  }

  /**
   * Mock get subscription products
   */
  getSubscriptionProducts(): IAPProduct[] {
    return this.products.filter((p) => p.type === 'subscription');
  }

  /**
   * Mock get credit products
   */
  getCreditProducts(): IAPProduct[] {
    return this.products.filter((p) => p.type === 'consumable');
  }

  /**
   * Mock purchase - simulates successful purchase
   */
  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    console.log('[IAPServiceMock] Mock purchasing:', productId);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate successful purchase with mock receipt
    const mockReceipt = btoa(JSON.stringify({
      productId,
      transactionId: `MOCK_${Date.now()}`,
      timestamp: Date.now(),
    }));

    console.log('[IAPServiceMock] Mock purchase successful');

    return {
      success: true,
      productId,
      transactionReceipt: mockReceipt,
    };
  }

  /**
   * Mock finish transaction
   */
  async finishTransaction(purchase: any): Promise<void> {
    console.log('[IAPServiceMock] Mock finishing transaction');
  }

  /**
   * Mock restore purchases
   */
  async restorePurchases(): Promise<RestoreResult> {
    console.log('[IAPServiceMock] Mock restoring purchases...');

    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      purchases: [],
    };
  }

  /**
   * Mock get purchase history
   */
  async getPurchaseHistory(): Promise<any[]> {
    return [];
  }

  /**
   * Mock check product availability
   */
  isProductAvailable(productId: string): boolean {
    return this.products.some((p) => p.productId === productId);
  }

  /**
   * Mock connection status
   */
  isIAPConnected(): boolean {
    return this.isConnected;
  }
}

// Export mock instance
export const iapServiceMock = new IAPServiceMock();
export default iapServiceMock;

