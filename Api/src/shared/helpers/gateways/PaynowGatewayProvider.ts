import express from "express";
import { IGatewayProvider, WebhookResult, ChargeResult, SubscriptionResult, GatewayConfig } from "./IGatewayProvider.js";
import { PaynowHelper } from "../PaynowHelper.js";

/**
 * Paynow integration placeholder.
 *
 * This provider is intentionally conservative: it is registered so the backend can be configured
 * in Admin, but it will return a clear error until Paynow API integration details (mode + credentials)
 * are implemented.
 */
export class PaynowGatewayProvider implements IGatewayProvider {
  readonly name = "paynow";

  async createWebhookEndpoint(): Promise<{ id: string; secret?: string }> {
    throw new Error("Paynow webhooks are not implemented");
  }

  async deleteWebhooksByChurchId(): Promise<void> {
    return;
  }

  async verifyWebhookSignature(_config: GatewayConfig, _headers: express.Request["headers"], _body: any): Promise<WebhookResult> {
    return { success: false, shouldProcess: false };
  }

  async processCharge(config: GatewayConfig, donationData: any): Promise<ChargeResult> {
    const integrationKey = (config.privateKey || "").trim();
    // Backward-compatible: Integration ID may be stored in settings.integrationId or publicKey.
    const integrationId = String((config.settings as any)?.integrationId || config.publicKey || "").trim();

    if (!integrationKey || !integrationId) {
      return { success: false, transactionId: "", data: null, error: "Paynow gateway is not configured" };
    }

    const amount = Number(donationData?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, transactionId: "", data: null, error: "Invalid amount" };
    }

    const reference =
      (typeof donationData?.reference === "string" && donationData.reference.trim()) ||
      (typeof donationData?.id === "string" && donationData.id.trim()) ||
      `PN-${Date.now()}`;

    const churchUrl = (donationData?.church?.churchURL || donationData?.return_url || "").toString();
    const returnUrl = (donationData?.returnurl || donationData?.returnUrl || churchUrl || "").toString().trim();
    const resultUrl = (donationData?.resulturl || donationData?.resultUrl || "").toString().trim() || returnUrl;

    if (!returnUrl) {
      return { success: false, transactionId: reference, data: null, error: "Paynow returnurl is required" };
    }

    const additionalInfo =
      (typeof donationData?.notes === "string" && donationData.notes.trim()) ||
      "Church donation";

    const person = donationData?.person || {};
    const authEmail = (person.email || donationData?.email || "").toString().trim() || undefined;
    const authPhone = (donationData?.mobileNumber || donationData?.msisdn || "").toString().trim() || undefined;
    const authName = (person.name || donationData?.name || "").toString().trim() || undefined;

    const init = await PaynowHelper.initiateTransaction({
      integrationId,
      integrationKey,
      reference,
      amount,
      additionalInfo,
      returnUrl,
      resultUrl,
      authEmail,
      authPhone,
      authName,
      tokenize: false,
      merchantTrace: reference.slice(0, 32)
    });

    if (init.ok === false) {
      return { success: false, transactionId: reference, data: init.raw ?? null, error: init.error };
    }

    return {
      success: true,
      transactionId: reference,
      data: {
        status: "pending",
        reference,
        browserUrl: init.browserUrl,
        pollUrl: init.pollUrl
      }
    };
  }

  async createSubscription(): Promise<SubscriptionResult> {
    return { success: false, subscriptionId: "", data: { error: "Paynow subscriptions are not supported" } };
  }

  async updateSubscription(): Promise<SubscriptionResult> {
    return { success: false, subscriptionId: "", data: { error: "Paynow subscriptions are not supported" } };
  }

  async cancelSubscription(): Promise<void> {
    throw new Error("Paynow subscriptions are not supported");
  }

  async calculateFees(): Promise<number> {
    // Fees vary per Paynow merchant configuration. Return 0 for now.
    return 0;
  }

  async logEvent(): Promise<void> {
    return;
  }

  async logDonation(): Promise<any> {
    return null;
  }
}

