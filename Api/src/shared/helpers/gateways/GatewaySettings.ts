/**
 * Type-safe gateway settings with provider-specific configurations
 */

// Base settings shared across all providers
interface BaseGatewaySettings {
  webhookEnabled?: boolean;
  testMode?: boolean;
  customFeesEnabled?: boolean;
  autoCapture?: boolean;
}

// PayPal-specific settings
export namespace PayPalSettings {
  export interface Settings extends BaseGatewaySettings {
    brandName?: string;
    landingPage?: "LOGIN" | "BILLING" | "NO_PREFERENCE";
    userAction?: "CONTINUE" | "PAY_NOW";
    shippingPreference?: "GET_FROM_FILE" | "NO_SHIPPING" | "SET_PROVIDED_ADDRESS";
    returnUrl?: string;
    cancelUrl?: string;
    experienceProfileId?: string;
  }
}

// Square-specific settings (future implementation)
export namespace SquareSettings {
  export interface Settings extends BaseGatewaySettings {
    locationId?: string;
    applicationId?: string;
    customerId?: string;
    referenceId?: string;
    note?: string;
    tipMoney?: number;
  }
}

// ePayMints-specific settings (future implementation)
export namespace ePayMintsSettings {
  export interface Settings extends BaseGatewaySettings {
    merchantId?: string;
    terminalId?: string;
    processorId?: string;
    industryType?: string;
    mcc?: string;
    posEntryMode?: string;
  }
}

// EcoCash-specific settings
export namespace EcoCashSettings {
  export interface Settings extends BaseGatewaySettings {
    // If true, use EcoCash sandbox endpoints. Otherwise live.
    sandboxMode?: boolean;
  }
}

// Paynow-specific settings
export namespace PaynowSettings {
  export interface Settings extends BaseGatewaySettings {
    integrationId?: string;
    // If true, use Paynow test/sandbox endpoints. Otherwise live.
    sandboxMode?: boolean;
    // Optional: return/callback URLs if using redirect-based checkout.
    returnUrl?: string;
    cancelUrl?: string;
  }
}

// Donorbox-specific settings
export namespace DonorboxSettings {
  export interface Settings extends BaseGatewaySettings {
    embedMode?: "inline" | "hosted";
    campaignId?: string;
  }
}

// Union type for all gateway settings
export type GatewaySettings =
  | { provider: "paypal"; settings: PayPalSettings.Settings }
  | { provider: "square"; settings: SquareSettings.Settings }
  | { provider: "epaymints"; settings: ePayMintsSettings.Settings }
  | { provider: "ecocash"; settings: EcoCashSettings.Settings }
  | { provider: "paynow"; settings: PaynowSettings.Settings }
  | { provider: "donorbox"; settings: DonorboxSettings.Settings };

// Type guard functions
export function isPayPalSettings(settings: any): settings is PayPalSettings.Settings {
  return settings && typeof settings === "object";
}

export function isSquareSettings(settings: any): settings is SquareSettings.Settings {
  return settings && typeof settings === "object";
}

export function isEPayMintsSettings(settings: any): settings is ePayMintsSettings.Settings {
  return settings && typeof settings === "object";
}

export function isEcoCashSettings(settings: any): settings is EcoCashSettings.Settings {
  return settings && typeof settings === "object";
}

export function isPaynowSettings(settings: any): settings is PaynowSettings.Settings {
  return settings && typeof settings === "object";
}

export function isDonorboxSettings(settings: any): settings is DonorboxSettings.Settings {
  return settings && typeof settings === "object";
}

// Helper to validate and cast settings based on provider
export function validateGatewaySettings(provider: string, settings: Record<string, unknown> | null): BaseGatewaySettings | null {
  if (!settings) return null;

  switch (provider.toLowerCase()) {
    case "paypal": return isPayPalSettings(settings) ? settings : null;
    case "square": return isSquareSettings(settings) ? settings : null;
    case "epaymints": return isEPayMintsSettings(settings) ? settings : null;
    case "ecocash": return isEcoCashSettings(settings) ? settings : null;
    case "paynow": return isPaynowSettings(settings) ? settings : null;
    case "donorbox": return isDonorboxSettings(settings) ? settings : null;
    default: return null;
  }
}
