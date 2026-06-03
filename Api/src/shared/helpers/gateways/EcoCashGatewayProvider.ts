import express from "express";
import { randomUUID } from "crypto";
import { EcoCashHelper, type EcoCashMode } from "../EcoCashHelper.js";
import { IGatewayProvider, WebhookResult, ChargeResult, SubscriptionResult, GatewayConfig } from "./IGatewayProvider.js";

function toEcoCashMode(config: GatewayConfig): EcoCashMode {
  const env = (config.environment || "").toLowerCase().trim();
  if (env === "sandbox" || env === "test" || env === "dev") return "sandbox";
  return "live";
}

function normalizeMsisdn(input: string): string {
  // EcoCash examples use 2637XXXXXXXX; accept common user input shapes.
  const s = (input || "").trim().replace(/\s+/g, "");
  const noPrefix = s.startsWith("+") ? s.substring(1) : s.startsWith("00") ? s.substring(2) : s;
  const digits = noPrefix.replace(/\D/g, "");
  if (digits.startsWith("2637") && digits.length >= 12) return digits.slice(0, 12);
  if (digits.startsWith("07") && digits.length >= 10) return `263${digits.slice(1, 10)}`;
  if (digits.startsWith("7") && digits.length >= 9) return `263${digits.slice(0, 9)}`;
  return digits;
}

export class EcoCashGatewayProvider implements IGatewayProvider {
  readonly name = "ecocash";

  async createWebhookEndpoint(_config: GatewayConfig, _webhookUrl: string): Promise<{ id: string; secret?: string }> {
    throw new Error("EcoCash webhooks are not implemented yet");
  }

  async deleteWebhooksByChurchId(_config: GatewayConfig, _churchId: string): Promise<void> {
    // no-op until webhooks are implemented
    return;
  }

  async verifyWebhookSignature(_config: GatewayConfig, _headers: express.Request["headers"], _body: any): Promise<WebhookResult> {
    return { success: false, shouldProcess: false };
  }

  async processCharge(config: GatewayConfig, donationData: any): Promise<ChargeResult> {
    const apiKey = (config.privateKey || "").trim();
    if (!apiKey) {
      return { success: false, transactionId: "", data: null, error: "EcoCash API key is missing" };
    }

    const currency = (donationData?.currency || "USD").toString().toUpperCase();
    const amount = Number(donationData?.amount || 0);
    const msisdn = normalizeMsisdn(donationData?.mobileNumber || donationData?.msisdn || "");

    if (!msisdn) return { success: false, transactionId: "", data: null, error: "EcoCash mobile number is required" };
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, transactionId: "", data: null, error: "Invalid amount" };

    const reason =
      (typeof donationData?.reason === "string" && donationData.reason.trim()) ||
      (typeof donationData?.notes === "string" && donationData.notes.trim()) ||
      "Church donation";

    const isUuid = (value: string): boolean =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test((value || "").trim());

    const requestedReference =
      (typeof donationData?.reference === "string" && donationData.reference.trim()) ||
      (typeof donationData?.id === "string" && donationData.id.trim()) ||
      "";

    // EcoCash requires UUID format for sourceReference.
    const sourceReference = isUuid(requestedReference) ? requestedReference : randomUUID();

    const mode = toEcoCashMode(config);

    try {
      // EcoCash API returns 200 with no body on success in the Dart SDK.
      const apiData = await EcoCashHelper.makePayment(apiKey, mode, {
        customerMsisdn: msisdn,
        amount,
        reason,
        currency,
        sourceReference
      });

      return {
        success: true,
        transactionId: sourceReference,
        data: {
          status: "pending",
          reference: sourceReference,
          mobileNumber: msisdn,
          currency,
          raw: apiData ?? null
        }
      };
    } catch (err: any) {
      const apiError = err?.response?.data;
      const msg =
        apiError?.message ||
        apiError?.error ||
        (Array.isArray(apiError?.errors) ? apiError.errors.find((x: any) => typeof x === "string" && x.trim().length > 0) : null) ||
        err?.message ||
        "EcoCash payment failed";
      return { success: false, transactionId: sourceReference, data: err?.response?.data ?? null, error: msg };
    }
  }

  async createSubscription(): Promise<SubscriptionResult> {
    throw new Error("EcoCash does not support subscriptions in this implementation");
  }

  async updateSubscription(): Promise<SubscriptionResult> {
    throw new Error("EcoCash does not support subscriptions in this implementation");
  }

  async cancelSubscription(): Promise<void> {
    throw new Error("EcoCash does not support subscriptions in this implementation");
  }

  async calculateFees(_amount: number): Promise<number> {
    // Unknown/variable fee schedules; keep 0 and rely on church-side settings if desired.
    return 0;
  }

  async logEvent(_churchId: string, _event: any, _eventData: any, _repos: any): Promise<void> {
    // EcoCash is currently polled; we don't receive webhooks to log.
    return;
  }

  async logDonation(_config: GatewayConfig, _churchId: string, _eventData: any, _repos: any, _status?: "pending" | "complete"): Promise<any> {
    // Donation logging is handled by the controller after status confirmation.
    return null;
  }

  // Transaction lookup used by our polling endpoint
  async getCharge(config: GatewayConfig, chargeId: string): Promise<any> {
    const apiKey = (config.privateKey || "").trim();
    if (!apiKey) throw new Error("EcoCash API key is missing");
    const mode = toEcoCashMode(config);

    // For EcoCash, chargeId is our sourceReference; mobile number is required too.
    throw new Error("EcoCash lookup requires mobileNumber; use /giving/donate/ecocash/status endpoint.");
  }
}

