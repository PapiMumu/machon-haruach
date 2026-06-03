import express from "express";
import { createHmac, timingSafeEqual, createHash } from "crypto";
import { Donation, EventLog, FundDonation } from "../../../modules/giving/models/index.js";
import { extractGivingCampusFromNotes } from "../../../modules/giving/helpers/givingCampusFromNotes.js";
import { IGatewayProvider, WebhookResult, ChargeResult, SubscriptionResult, GatewayConfig } from "./IGatewayProvider.js";

export class DonorboxGatewayProvider implements IGatewayProvider {
  readonly name = "donorbox";

  async createWebhookEndpoint(_config: GatewayConfig, _webhookUrl: string): Promise<{ id: string; secret?: string }> {
    // Donorbox webhooks are configured manually in the Donorbox dashboard.
    return { id: "manual-donorbox-webhook" };
  }

  async deleteWebhooksByChurchId(_config: GatewayConfig, _churchId: string): Promise<void> {
    // Donorbox webhook lifecycle is managed outside this API.
  }

  async verifyWebhookSignature(config: GatewayConfig, headers: express.Request["headers"], body: any): Promise<WebhookResult> {
    try {
      const signatureHeader = headers["donorbox-signature"]?.toString();
      if (!signatureHeader || !config.webhookKey) {
        return { success: false, shouldProcess: false };
      }

      const [timestampRaw, providedSignatureRaw] = signatureHeader.split(",").map((s) => (s || "").trim());
      const timestamp = timestampRaw || "";
      const providedSignature = providedSignatureRaw || "";
      if (!timestamp || !providedSignature) {
        return { success: false, shouldProcess: false };
      }

      const rawBody = this.getRawBody(body);
      const signedPayload = `${timestamp}.${rawBody}`;
      const expectedSignature = createHmac("sha256", config.webhookKey).update(signedPayload).digest("hex");

      const providedBuffer = Buffer.from(providedSignature, "utf8");
      const expectedBuffer = Buffer.from(expectedSignature, "utf8");
      if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
        return { success: false, shouldProcess: false };
      }

      const parsedBody = this.parsePayload(body);
      const eventType = this.getEventType(parsedBody);
      const eventData = this.getEventData(parsedBody);
      const eventId = this.getEventId(parsedBody, eventType);

      return {
        success: true,
        shouldProcess: true,
        eventType,
        eventData,
        eventId
      };
    } catch {
      return { success: false, shouldProcess: false };
    }
  }

  async processCharge(_config: GatewayConfig, _donationData: any): Promise<ChargeResult> {
    throw new Error("Donorbox direct charge processing is not implemented yet.");
  }

  async createSubscription(_config: GatewayConfig, _subscriptionData: any): Promise<SubscriptionResult> {
    throw new Error("Donorbox direct subscription creation is not implemented yet.");
  }

  async updateSubscription(_config: GatewayConfig, _subscriptionData: any): Promise<SubscriptionResult> {
    throw new Error("Donorbox subscription updates are not implemented yet.");
  }

  async cancelSubscription(_config: GatewayConfig, _subscriptionId: string, _reason?: string): Promise<void> {
    throw new Error("Donorbox subscription cancellation is not implemented yet.");
  }

  async calculateFees(_amount: number, _churchId: string, _currency?: string): Promise<number> {
    // Donorbox fee calculation will be implemented in a later phase.
    return 0;
  }

  async logEvent(churchId: string, event: any, eventData: any, repos: any): Promise<void> {
    const parsedEvent = this.parsePayload(event);
    const eventType = this.getEventType(parsedEvent);
    const providerId = this.getEventId(parsedEvent, eventType);
    const customerId = eventData?.donor?.id?.toString() || eventData?.donor_id?.toString() || "";
    const message = JSON.stringify({
      eventType,
      donationId: eventData?.id || null,
      status: eventData?.status || null
    });

    const eventLog: EventLog = {
      id: "",
      churchId,
      customerId,
      provider: "Donorbox",
      providerId,
      eventType,
      status: "pending",
      message,
      created: new Date()
    };

    await repos.eventLog.save(eventLog);
  }

  async logDonation(_config: GatewayConfig, churchId: string, eventData: any, repos: any, fallbackStatus: "pending" | "complete" = "complete"): Promise<any> {
    const donationData = this.normalizeDonationData(eventData);
    const transactionId = donationData.transactionId;
    if (!transactionId) {
      throw new Error("Donorbox donation payload missing transaction identifier.");
    }

    const mappedStatus = donationData.status || fallbackStatus;
    const existing = await repos.donation.loadByTransactionId(churchId, transactionId);
    if (existing) {
      if (existing.status !== mappedStatus) {
        await repos.donation.updateStatus(churchId, transactionId, mappedStatus);
      }
      return existing;
    }

    const branch = extractGivingCampusFromNotes(donationData.notes);
    const batch = await repos.donationBatch.getOrCreateForOnlineGift(churchId, donationData.donationDate, "Donorbox", branch);
    const donation: Donation = {
      churchId,
      batchId: batch.id,
      personId: null,
      donationDate: donationData.donationDate,
      amount: donationData.amount,
      currency: donationData.currency,
      method: "Donorbox",
      methodDetails: donationData.methodDetails,
      notes: donationData.notes,
      status: mappedStatus,
      transactionId
    };

    const savedDonation = await repos.donation.save(donation);
    const fundId = await this.resolveFundId(churchId, donationData.fundName, repos);
    const fundDonation: FundDonation = {
      churchId,
      donationId: savedDonation.id,
      fundId,
      amount: donationData.amount
    };
    await repos.fundDonation.save(fundDonation);
    return savedDonation;
  }

  private getRawBody(body: any): string {
    if (Buffer.isBuffer(body)) return body.toString("utf8");
    if (typeof body === "string") return body;
    if (body && body.type === "Buffer" && Array.isArray(body.data)) return Buffer.from(body.data).toString("utf8");
    return JSON.stringify(body || {});
  }

  private parsePayload(body: any): any {
    if (Buffer.isBuffer(body)) {
      const text = body.toString("utf8");
      return text ? JSON.parse(text) : {};
    }
    if (typeof body === "string") {
      return body ? JSON.parse(body) : {};
    }
    if (body && body.type === "Buffer" && Array.isArray(body.data)) {
      const text = Buffer.from(body.data).toString("utf8");
      return text ? JSON.parse(text) : {};
    }
    return body || {};
  }

  private getEventType(payload: any): string {
    return payload?.event_type || payload?.eventType || payload?.type || "unknown";
  }

  private getEventData(payload: any): any {
    return payload?.data?.donation || payload?.data || payload?.donation || payload;
  }

  private getEventId(payload: any, eventType: string): string {
    const explicitId = payload?.id || payload?.event_id || payload?.eventId;
    if (explicitId) return explicitId.toString();

    const data = this.getEventData(payload);
    const donationId = data?.id || data?.donation_id || data?.transaction_id;
    if (donationId) return `${eventType}:${donationId}`;

    const contentHash = createHash("sha256").update(JSON.stringify(payload || {})).digest("hex");
    return `${eventType}:${contentHash}`;
  }

  private normalizeDonationData(eventData: any): {
    transactionId: string;
    amount: number;
    currency: string;
    donationDate: Date;
    methodDetails: string;
    notes: string;
    fundName: string;
    status: "pending" | "complete";
  } {
    const amount = Number(eventData?.amount ?? eventData?.converted_amount ?? 0);
    const currency = (eventData?.currency || eventData?.converted_currency || "USD").toString().toLowerCase();
    const donationDate = eventData?.donation_date || eventData?.created_at || eventData?.created || new Date().toISOString();
    const status = this.mapStatus(eventData?.status);
    const transactionId = (
      eventData?.id ||
      eventData?.transaction_id ||
      eventData?.paypal_transaction_id ||
      eventData?.processor_transaction_id ||
      eventData?.charge_id
    )?.toString();
    const donationType = (eventData?.donation_type || eventData?.payment_method || "donorbox").toString();
    const fundName = (eventData?.designation || eventData?.campaign?.name || "(General Fund)").toString();

    return {
      transactionId: transactionId || "",
      amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
      currency,
      donationDate: new Date(donationDate),
      methodDetails: donationType,
      notes: (eventData?.comment || "").toString(),
      fundName,
      status
    };
  }

  private mapStatus(status: any): "pending" | "complete" {
    const normalized = (status || "").toString().toLowerCase();
    if (["paid", "succeeded", "complete", "completed", "active"].includes(normalized)) return "complete";
    return "pending";
  }

  private async resolveFundId(churchId: string, fundName: string, repos: any): Promise<string> {
    const allFunds = (await repos.fund.loadAll(churchId)) as Array<{ id: string; name: string }>;
    const exact = allFunds.find((f) => (f.name || "").trim().toLowerCase() === fundName.trim().toLowerCase());
    if (exact?.id) return exact.id;

    const generalFund = await repos.fund.getOrCreateGeneral(churchId);
    return generalFund.id as string;
  }
}
