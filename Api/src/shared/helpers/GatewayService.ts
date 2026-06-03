import { GatewayFactory, IGatewayProvider, GatewayConfig } from "./gateways/index.js";
import { validateGatewaySettings } from "./gateways/GatewaySettings.js";
import { GatewayRepo } from "../../modules/giving/repositories/GatewayRepo.js";
import { Gateway } from "../../modules/giving/models/index.js";
import { EncryptionHelper } from "@machonharuach/apihelper";

export interface ProviderCapabilities {
  supportsOneTimePayments: boolean;
  supportsSubscriptions: boolean;
  supportsVault: boolean;
  supportsACH: boolean;
  supportsRefunds: boolean;
  supportsPartialRefunds: boolean;
  supportsWebhooks: boolean;
  supportsOrders: boolean;
  supportsInstantCapture: boolean;
  supportsManualCapture: boolean;
  supportsSCA: boolean;
  requiresPlansForSubscriptions: boolean;
  requiresCustomerForSubscription: boolean;
  supportedPaymentMethods: string[];
  supportedCurrencies: string[];
  maxRefundWindow?: number; // in days
  minTransactionAmount?: number; // in cents
  maxTransactionAmount?: number; // in cents
  notes?: string[];
}

export interface GetGatewayOptions {
  provider?: string;
  gatewayId?: string;
  environmentPreference?: string[];
}

type GatewayResolutionReason = "not-found" | "ambiguous" | null;

export class GatewayService {
  static getGatewayConfig(gateway: any): GatewayConfig {
    const decryptIfPresent = (value: string | null | undefined) => {
      if (!value) return "";
      try {
        return EncryptionHelper.decrypt(value);
      } catch (err) {
        console.error("Failed to decrypt gateway secret", { provider: gateway?.provider, gatewayId: gateway?.id, err });
        return "";
      }
    };

    const privateKey = decryptIfPresent(gateway.privateKey);

    return {
      gatewayId: gateway.id,
      churchId: gateway.churchId,
      publicKey: gateway.publicKey,
      privateKey,
      webhookKey: decryptIfPresent(gateway.webhookKey),
      productId: gateway.productId,
      settings: gateway.settings ?? null,
      environment: gateway.environment ?? null
    };
  }

  static getProviderFromGateway(gateway: any): IGatewayProvider {
    return GatewayFactory.getProvider(gateway.provider);
  }

  static async createWebhook(gateway: any, webhookUrl: string): Promise<{ id: string; secret?: string }> {
    const provider = this.getProviderFromGateway(gateway);
    const config = this.getGatewayConfig(gateway);
    return await provider.createWebhookEndpoint(config, webhookUrl);
  }

  static async deleteWebhooks(gateway: any, churchId: string): Promise<void> {
    const provider = this.getProviderFromGateway(gateway);
    const config = this.getGatewayConfig(gateway);
    await provider.deleteWebhooksByChurchId(config, churchId);
  }

  static async verifyWebhook(gateway: any, headers: any, body: any) {
    const provider = this.getProviderFromGateway(gateway);
    const config = this.getGatewayConfig(gateway);
    return await provider.verifyWebhookSignature(config, headers, body);
  }

  static async processCharge(gateway: any, donationData: any) {
    const provider = this.getProviderFromGateway(gateway);
    const config = this.getGatewayConfig(gateway);
    return await provider.processCharge(config, donationData);
  }

  static async createSubscription(gateway: any, subscriptionData: any) {
    const provider = this.getProviderFromGateway(gateway);
    const config = this.getGatewayConfig(gateway);
    return await provider.createSubscription(config, subscriptionData);
  }

  static async updateSubscription(gateway: any, subscriptionData: any) {
    const provider = this.getProviderFromGateway(gateway);
    const config = this.getGatewayConfig(gateway);
    return await provider.updateSubscription(config, subscriptionData);
  }

  static async cancelSubscription(gateway: any, subscriptionId: string, reason?: string): Promise<void> {
    const provider = this.getProviderFromGateway(gateway);
    const config = this.getGatewayConfig(gateway);
    await provider.cancelSubscription(config, subscriptionId, reason);
  }

  static async calculateFees(gateway: any, amount: number, churchId: string, currency?: string): Promise<number> {
    const provider = this.getProviderFromGateway(gateway);
    const currencyToUse = currency || gateway.currency || "USD";
    return await provider.calculateFees(amount, churchId, currencyToUse);
  }

  static async createProduct(gateway: any, churchId: string): Promise<string | undefined> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.createProduct) {
      const config = this.getGatewayConfig(gateway);
      return await provider.createProduct(config, churchId);
    }
    return undefined;
  }

  static async logEvent(gateway: any, churchId: string, event: any, eventData: any, repos: any): Promise<void> {
    const provider = this.getProviderFromGateway(gateway);
    await provider.logEvent(churchId, event, eventData, repos);
  }

  static async logDonation(gateway: any, churchId: string, eventData: any, repos: any, status: "pending" | "complete" = "complete"): Promise<any> {
    const provider = this.getProviderFromGateway(gateway);
    const config = this.getGatewayConfig(gateway);
    return await provider.logDonation(config, churchId, eventData, repos, status);
  }

  static async updateDonationStatus(gateway: any, churchId: string, transactionId: string, status: "pending" | "complete" | "failed", repos: any): Promise<void> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.updateDonationStatus) {
      await provider.updateDonationStatus(churchId, transactionId, status, repos);
    }
  }

  // Customer management
  static async createCustomer(gateway: any, email: string, name: string): Promise<string | undefined> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.createCustomer) {
      const config = this.getGatewayConfig(gateway);
      return await provider.createCustomer(config, email, name);
    }
    return undefined;
  }

  static async getCustomerSubscriptions(gateway: any, customerId: string): Promise<any> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.getCustomerSubscriptions) {
      const config = this.getGatewayConfig(gateway);
      return await provider.getCustomerSubscriptions(config, customerId);
    }
    return [];
  }

  static async getCustomerPaymentMethods(gateway: any, customer: any): Promise<any> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.getCustomerPaymentMethods) {
      const config = this.getGatewayConfig(gateway);
      return await provider.getCustomerPaymentMethods(config, customer);
    }
    return [];
  }

  // Payment method management
  static async attachPaymentMethod(gateway: any, paymentMethodId: string, options: any): Promise<any> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.attachPaymentMethod) {
      const config = this.getGatewayConfig(gateway);
      return await provider.attachPaymentMethod(config, paymentMethodId, options);
    }
    throw new Error(`${gateway.provider} does not support payment method attachment`);
  }

  static async detachPaymentMethod(gateway: any, paymentMethodId: string): Promise<any> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.detachPaymentMethod) {
      const config = this.getGatewayConfig(gateway);
      return await provider.detachPaymentMethod(config, paymentMethodId);
    }
    throw new Error(`${gateway.provider} does not support payment method detachment`);
  }

  static async updateCard(gateway: any, paymentMethodId: string, cardData: any): Promise<any> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.updateCard) {
      const config = this.getGatewayConfig(gateway);
      return await provider.updateCard(config, paymentMethodId, cardData);
    }
    throw new Error(`${gateway.provider} does not support card updates`);
  }

  static async createBankAccount(gateway: any, customerId: string, options: any): Promise<any> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.createBankAccount) {
      const config = this.getGatewayConfig(gateway);
      return await provider.createBankAccount(config, customerId, options);
    }
    throw new Error(`${gateway.provider} does not support bank account creation`);
  }

  static async updateBank(gateway: any, paymentMethodId: string, bankData: any, customerId: string): Promise<any> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.updateBank) {
      const config = this.getGatewayConfig(gateway);
      return await provider.updateBank(config, paymentMethodId, bankData, customerId);
    }
    throw new Error(`${gateway.provider} does not support bank account updates`);
  }

  static async verifyBank(gateway: any, paymentMethodId: string, amountData: any, customerId: string): Promise<any> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.verifyBank) {
      const config = this.getGatewayConfig(gateway);
      return await provider.verifyBank(config, paymentMethodId, amountData, customerId);
    }
    throw new Error(`${gateway.provider} does not support bank account verification`);
  }

  static async deleteBankAccount(gateway: any, customerId: string, bankAccountId: string): Promise<any> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.deleteBankAccount) {
      const config = this.getGatewayConfig(gateway);
      return await provider.deleteBankAccount(config, customerId, bankAccountId);
    }
    throw new Error(`${gateway.provider} does not support bank account deletion`);
  }

  // ACH SetupIntent for providers that support bank-linking setup intents
  static async createACHSetupIntent(gateway: any, customerId: string): Promise<any> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.createACHSetupIntent) {
      const config = this.getGatewayConfig(gateway);
      return await provider.createACHSetupIntent(config, customerId);
    }
    throw new Error(`${gateway.provider} does not support ACH SetupIntent`);
  }

  // Provider-specific functionality
  static async generateClientToken(gateway: any): Promise<string | undefined> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.generateClientToken) {
      const config = this.getGatewayConfig(gateway);
      return await provider.generateClientToken(config);
    }
    return undefined;
  }

  static async createOrder(gateway: any, orderData: any): Promise<any> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.createOrder) {
      const config = this.getGatewayConfig(gateway);
      return await provider.createOrder(config, orderData);
    }
    throw new Error(`${gateway.provider} does not support order creation`);
  }

  // Subscription plan management
  static async createSubscriptionPlan(gateway: any, planData: any): Promise<string | undefined> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.createSubscriptionPlan) {
      const config = this.getGatewayConfig(gateway);
      return await provider.createSubscriptionPlan(config, planData);
    }
    throw new Error(`${gateway.provider} does not support subscription plan creation`);
  }

  static async createSubscriptionWithPlan(gateway: any, subscriptionData: any): Promise<any> {
    const provider = this.getProviderFromGateway(gateway);
    if (provider.createSubscriptionWithPlan) {
      const config = this.getGatewayConfig(gateway);
      return await provider.createSubscriptionWithPlan(config, subscriptionData);
    }
    throw new Error(`${gateway.provider} does not support plan-based subscription creation`);
  }

  /**
   * Load and resolve the most appropriate gateway for the provided church.
   * Throws descriptive errors when the gateway cannot be resolved.
   */
  static async getGatewayForChurch(
    churchId: string,
    options: GetGatewayOptions = {},
    repo?: Pick<GatewayRepo, "loadAll">
  ): Promise<Gateway> {
    if (!churchId) throw new Error("churchId is required to resolve a payment gateway");

    const gatewayRepo = repo ?? new GatewayRepo();
    // Load raw gateways - do NOT use convertAllToModel as it strips privateKey/webhookKey
    // which are needed for internal gateway operations
    const gateways = (await gatewayRepo.loadAll(churchId)) as Gateway[];

    if (!gateways || gateways.length === 0) {
      throw new Error(`No payment gateway configured for church ${churchId}.`);
    }

    const effectiveOptions = this.applyVaultPreferenceAmongMixedGateways(gateways, options);
    const resolution = this.resolveGatewayFromList(gateways, effectiveOptions);
    const selected = resolution.gateway;

    if (!selected) {
      if (effectiveOptions.gatewayId) {
        throw new Error(`Gateway ${effectiveOptions.gatewayId} is not configured for church ${churchId}.`);
      }

      if (resolution.reason === "ambiguous") {
        const qualifier = effectiveOptions.provider ? `${effectiveOptions.provider} ` : "";
        throw new Error(
          `Multiple ${qualifier}payment gateways are configured for church ${churchId}. Provide a gatewayId or environment preference to disambiguate.`
        );
      }

      if (effectiveOptions.provider) {
        throw new Error(`No ${effectiveOptions.provider} gateway configured for church ${churchId}.`);
      }

      throw new Error(`No payment gateway configured for church ${churchId}.`);
    }

    return {
      ...selected,
      settings: this.validateSettings(selected)
    } as Gateway;
  }

  /**
   * When a church has both vault-capable gateways (e.g. Stripe) and non-vault gateways (EcoCash, Paynow)
   * but the caller did not specify provider/gatewayId, default to a vault gateway so card/PM APIs do not
   * bind to EcoCash. When every gateway supports vault (e.g. two PayPal rows), leave resolution unchanged.
   */
  private static applyVaultPreferenceAmongMixedGateways(gateways: Gateway[], options: GetGatewayOptions): GetGatewayOptions {
    if (options.gatewayId || (options.provider && String(options.provider).trim())) {
      return { ...options };
    }
    if (!gateways || gateways.length <= 1) {
      return { ...options };
    }
    const hasNonVaultGateway = gateways.some((g) => !this.getProviderCapabilities(g)?.supportsVault);
    if (!hasNonVaultGateway) {
      return { ...options };
    }
    const vaultGateways = gateways.filter((g) => this.getProviderCapabilities(g)?.supportsVault);
    if (vaultGateways.length === 0) {
      return { ...options };
    }
    if (vaultGateways.length === 1 && vaultGateways[0].id) {
      return { ...options, gatewayId: vaultGateways[0].id };
    }
    const stripe = vaultGateways.find((g) => g.provider?.toLowerCase() === "stripe");
    const paypal = vaultGateways.find((g) => g.provider?.toLowerCase() === "paypal");
    const picked = stripe || paypal || vaultGateways[0];
    return picked?.id ? { ...options, gatewayId: picked.id } : { ...options };
  }

  private static resolveGatewayFromList(
    gateways: Gateway[],
    options: GetGatewayOptions
  ): { gateway: Gateway | null; reason: GatewayResolutionReason } {
    const normalizedProvider = options.provider?.toLowerCase();
    const environmentOrder = options.environmentPreference || ["production", "live", "sandbox", "test"]; // fallback order

    const matches = gateways.filter((gateway) => {
      if (options.gatewayId && gateway.id === options.gatewayId) return true;
      if (normalizedProvider) {
        return gateway.provider?.toLowerCase() === normalizedProvider;
      }
      return !options.gatewayId;
    });

    if (options.gatewayId) {
      return { gateway: matches[0] || null, reason: matches[0] ? null : "not-found" };
    }

    if (normalizedProvider) {
      if (!matches.length) {
        return { gateway: null, reason: "not-found" };
      }

      const selected = this.pickByEnvironment(matches, environmentOrder);
      return { gateway: selected, reason: selected ? null : "ambiguous" };
    }

    if (gateways.length === 1) {
      return { gateway: gateways[0], reason: null };
    }

    const selected = this.pickByEnvironment(gateways, environmentOrder);
    return { gateway: selected, reason: selected ? null : "ambiguous" };
  }

  private static pickByEnvironment(gateways: Gateway[], environmentOrder: string[]): Gateway | null {
    if (!gateways.length) return null;

    const priorityLookup = environmentOrder.map((env, index) => ({ env, weight: index }));
    const weights = new Map(priorityLookup.map(({ env, weight }) => [env?.toLowerCase(), weight] as const));

    let selected: Gateway | null = null;
    let bestWeight = Number.MAX_SAFE_INTEGER;
    let ambiguous = false;

    gateways.forEach((gateway) => {
      const envKey = (gateway.environment || "").toLowerCase();
      const weight = weights.get(envKey) ?? environmentOrder.length;

      if (weight < bestWeight) {
        selected = gateway;
        bestWeight = weight;
        ambiguous = false;
        return;
      }

      if (weight === bestWeight) {
        ambiguous = true;
      }
    });

    return ambiguous ? null : selected;
  }

  /**
   * Get the capabilities of a specific payment provider
   * @param gatewayOrProvider Provider name (paypal, square, epaymints, donorbox) or gateway object
   * @returns Provider capabilities or null if provider not found
   */
  static getProviderCapabilities(gatewayOrProvider: string | { provider?: string }): ProviderCapabilities | null {
    const provider = typeof gatewayOrProvider === "string" ? gatewayOrProvider : gatewayOrProvider?.provider;
    if (!provider) return null;

    const capabilities: Record<string, ProviderCapabilities> = {
      stripe: {
        supportsOneTimePayments: true,
        supportsSubscriptions: true,
        supportsVault: true,
        supportsACH: true,
        supportsRefunds: true,
        supportsPartialRefunds: true,
        supportsWebhooks: false,
        supportsOrders: false,
        supportedPaymentMethods: ["card", "ach_debit", "apple_pay", "google_pay", "link"],
        supportedCurrencies: [
          "usd", "eur", "gbp", "cad", "aud", "inr", "jpy", "sgd", "hkd",
          "sek", "nok", "dkk", "chf", "mxn", "brl"
        ],
        requiresPlansForSubscriptions: false,
        requiresCustomerForSubscription: true,
        supportsInstantCapture: true,
        supportsManualCapture: true,
        supportsSCA: true,
        maxRefundWindow: 365,
        minTransactionAmount: 50,  // $0.50
        maxTransactionAmount: 99999999, // $999,999.99
        notes: ["ACH via Plaid bank linking or manual entry", "Subscriptions use Stripe Billing / PaymentIntents"]
      },
      paypal: {
        supportsOneTimePayments: true,
        supportsSubscriptions: true,
        supportsVault: true,
        supportsACH: false,
        supportsRefunds: true,
        supportsPartialRefunds: true,
        supportsWebhooks: true,
        supportsOrders: true,
        supportedPaymentMethods: ["paypal", "card", "venmo", "pay_later"],
        supportedCurrencies: [
          "usd", "eur", "gbp", "cad", "aud", "jpy", "mxn", "nzd", "sgd"
        ],
        requiresPlansForSubscriptions: true,
        requiresCustomerForSubscription: false,
        supportsInstantCapture: true,
        supportsManualCapture: true,
        supportsSCA: true,
        maxRefundWindow: 180,
        minTransactionAmount: 100, // $1.00
        maxTransactionAmount: 1000000, // $10,000.00
        notes: ["Subscriptions require Billing Plans", "Order APIs power PayPal smart buttons"]
      },
      square: {
        supportsOneTimePayments: true,
        supportsSubscriptions: true,
        supportsVault: true,
        supportsACH: true,
        supportsRefunds: true,
        supportsPartialRefunds: true,
        supportsWebhooks: true,
        supportsOrders: false,
        supportedPaymentMethods: ["card", "apple_pay", "google_pay", "ach_debit", "gift_card"],
        supportedCurrencies: ["usd", "cad", "gbp", "aud", "jpy", "eur"],
        requiresPlansForSubscriptions: false,
        requiresCustomerForSubscription: true,
        supportsInstantCapture: true,
        supportsManualCapture: true,
        supportsSCA: true,
        maxRefundWindow: 120,
        minTransactionAmount: 100, // $1.00
        maxTransactionAmount: 5000000, // $50,000.00
        notes: ["ACH support requires Square bank on file", "Subscriptions available with catalog plans"]
      },
      epaymints: {
        supportsOneTimePayments: true,
        supportsSubscriptions: false,
        supportsVault: false,
        supportsACH: true,
        supportsRefunds: true,
        supportsPartialRefunds: false,
        supportsWebhooks: false,
        supportsOrders: false,
        supportedPaymentMethods: ["card", "ach"],
        supportedCurrencies: ["usd"],
        requiresPlansForSubscriptions: false,
        requiresCustomerForSubscription: false,
        supportsInstantCapture: true,
        supportsManualCapture: false,
        supportsSCA: false,
        maxRefundWindow: 90,
        minTransactionAmount: 100, // $1.00
        maxTransactionAmount: 10000000, // $100,000.00
        notes: ["Webhooks limited; polling recommended", "ACH available via tokenised transactions"]
      },
      ecocash: {
        supportsOneTimePayments: true,
        supportsSubscriptions: false,
        supportsVault: false,
        supportsACH: false,
        supportsRefunds: false,
        supportsPartialRefunds: false,
        supportsWebhooks: false,
        supportsOrders: false,
        supportedPaymentMethods: ["mobile_money"],
        supportedCurrencies: ["usd", "zwl", "zig"],
        requiresPlansForSubscriptions: false,
        requiresCustomerForSubscription: false,
        supportsInstantCapture: false,
        supportsManualCapture: false,
        supportsSCA: false,
        notes: ["C2B Instant payments via EcoCash", "Use polling to confirm payment status (webhooks not enabled yet)"]
      },
      paynow: {
        supportsOneTimePayments: true,
        supportsSubscriptions: false,
        supportsVault: false,
        supportsACH: false,
        supportsRefunds: false,
        supportsPartialRefunds: false,
        supportsWebhooks: false,
        supportsOrders: false,
        supportedPaymentMethods: ["mobile_money", "bank_transfer", "card"],
        supportedCurrencies: ["usd", "zwl", "zig"],
        requiresPlansForSubscriptions: false,
        requiresCustomerForSubscription: false,
        supportsInstantCapture: false,
        supportsManualCapture: false,
        supportsSCA: false,
        notes: ["Zimbabwe local payments via Paynow", "Implementation pending: choose redirect or polling flow"]
      },
      donorbox: {
        supportsOneTimePayments: true,
        supportsSubscriptions: true,
        supportsVault: false,
        supportsACH: false,
        supportsRefunds: true,
        supportsPartialRefunds: false,
        supportsWebhooks: false,
        supportsOrders: false,
        supportedPaymentMethods: ["donorbox_checkout"],
        supportedCurrencies: [
          "usd", "eur", "gbp", "cad", "aud", "jpy", "mxn", "nzd", "sgd"
        ],
        requiresPlansForSubscriptions: false,
        requiresCustomerForSubscription: false,
        supportsInstantCapture: false,
        supportsManualCapture: false,
        supportsSCA: true,
        notes: ["Checkout is hosted/embedded by Donorbox", "Use webhook/API sync for donation records"]
      }
    };

    return capabilities[provider.toLowerCase()] || null;
  }

  /**
   * Validate gateway settings based on provider type
   * @param gateway Gateway object with provider and settings
   * @returns Validated settings or null if invalid
   */
  static validateSettings(gateway: any): any {
    if (!gateway.settings) return null;
    return validateGatewaySettings(gateway.provider, gateway.settings);
  }
}
