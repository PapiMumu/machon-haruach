import { controller, httpPost, httpGet } from "inversify-express-utils";
import express from "express";
import { GivingCrudController } from "./GivingCrudController.js";
import { Permissions } from "../../../shared/helpers/Permissions.js";
import { GatewayService } from "../../../shared/helpers/GatewayService.js";
import { EmailHelper, CurrencyHelper } from "@machonharuach/apihelper";
import { Donation, FundDonation, DonationBatch, Subscription, SubscriptionFund, GatewayPaymentMethod } from "../models/index.js";
import { Environment } from "../../../shared/helpers/Environment.js";
import Axios from "axios";
import dayjs from "dayjs";
import { EcoCashHelper } from "../../../shared/helpers/EcoCashHelper.js";
import { normalizeEcoCashLookupPayload } from "../../../shared/helpers/EcoCashStatusNormalizer.js";
import { PaynowHelper } from "../../../shared/helpers/PaynowHelper.js";
import { extractGivingCampusFromNotes } from "../helpers/givingCampusFromNotes.js";
import { formatStripeCardBrand, stripeCardFromPaymentIntentLike } from "../../../shared/helpers/stripeCardDisplay.js";
import { TypedDB } from "../../../shared/infrastructure/TypedDB.js";

@controller("/giving/donate")
export class DonateController extends GivingCrudController {
  protected crudSettings = {
    repoKey: "donation", // not used by base here
    permissions: { view: Permissions.donations.view, edit: Permissions.donations.edit },
    routes: [] as const // all CRUD endpoints disabled; custom routes only
  };

  private async setMembershipAccessBySubscription(churchId: string, personId: string, mode: "activate" | "deactivate"): Promise<void> {
    if (!churchId || !personId) return;
    const links = await TypedDB.queryModule<any[]>(
      "membership",
      "SELECT userId FROM userChurches WHERE churchId=? AND personId=?",
      [churchId, personId]
    );
    const userIds = Array.isArray(links)
      ? links.map((r: any) => String(r.userId || "")).filter((id: string) => id.length > 0)
      : [];
    if (userIds.length === 0) return;

    if (mode === "activate") {
      await TypedDB.queryModule(
        "membership",
        "UPDATE users SET subscriptionStatus='active', subscriptionEndsAt=DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id IN (?)",
        [userIds]
      );
      return;
    }

    await TypedDB.queryModule(
      "membership",
      "UPDATE users SET subscriptionStatus='inactive', subscriptionEndsAt=NOW() WHERE id IN (?)",
      [userIds]
    );
  }

  /**
   * Get available payment gateways for a church
   */
  @httpGet("/gateways/:churchId")
  public async getGateways(req: express.Request<{ churchId: string }>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const churchId = req.params.churchId;
      if (!churchId) return this.json({ error: "Missing churchId" }, 400);

      const gateways = (await this.repos.gateway.loadAll(churchId)) as any[];

      // Return gateway info without sensitive data
      const publicGateways = gateways.map(gateway => ({
        id: gateway.id,
        provider: gateway.provider,
        publicKey: gateway.publicKey,
        productId: gateway.productId,
        payFees: gateway.payFees,
        currency: gateway.currency
      }));

      return { gateways: publicGateways };
    });
  }

  @httpPost("/client-token")
  public async clientToken(req: express.Request<{}, {}, { churchId?: string; provider?: string; gatewayId?: string }>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      try {
        const churchId = req.body.churchId || au.churchId;
        if (!churchId) return this.json({ error: "Missing churchId" }, 400);
        if (au.churchId && au.churchId !== churchId) return this.json({ error: "Forbidden" }, 403);

        const gateway = await this.getGateway(churchId, req.body.provider, req.body.gatewayId);
        if (!gateway) return this.json({ error: "Gateway not found" }, 404);

        try {
          const clientToken = await GatewayService.generateClientToken(gateway);
          return { clientToken, provider: gateway.provider };
        } catch (e) {
          console.error("Client token error", e);
          return this.json({ error: "Failed to generate client token" }, 502);
        }
      } catch (e) {
        console.error(e);
        return this.json({ error: "Unexpected error" }, 500);
      }
    });
  }

  @httpPost("/create-order")
  public async createOrder(
    req: express.Request<{}, {}, {
      churchId?: string;
      provider?: string;
      gatewayId?: string;
      amount?: number;
      currency?: string;
      funds?: any[];
      notes?: string;
      description?: string
    }>,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      try {
        const churchId = req.body.churchId || au.churchId;
        const amount = Number(req.body.amount);
        const currency = (req.body.currency || "USD").toUpperCase();
        if (!churchId) return this.json({ error: "Missing churchId" }, 400);
        if (au.churchId && au.churchId !== churchId) return this.json({ error: "Forbidden" }, 403);
        if (!amount || amount <= 0 || !/^[A-Z]{3}$/.test(currency)) return this.json({ error: "Invalid amount or currency" }, 400);

        const gateway = await this.getGateway(churchId, req.body.provider, req.body.gatewayId);
        if (!gateway) return this.json({ error: "Gateway not found" }, 404);

        // Check if provider supports orders (required for PayPal-style checkout)
        const capabilities = GatewayService.getProviderCapabilities(gateway);
        if (!capabilities?.supportsOrders) {
          return this.json({ error: `${gateway.provider} does not support order-based checkout` }, 400);
        }

        const funds = Array.isArray(req.body.funds) ? req.body.funds : [];
        // Warning: PayPal custom_id is limited (~127 chars). Keep it compact.
        let customId = "";
        try {
          const minimalFunds = funds.map((f: any) => ({ id: f.id, amount: f.amount }));
          const encoded = JSON.stringify(minimalFunds);
          customId = encoded.length <= 120 ? encoded : ""; // avoid exceeding limit
        } catch {
          customId = "";
        }

        try {
          const order = await GatewayService.createOrder(gateway, {
            amount,
            currency,
            description: req.body.description || "Donation",
            customId: customId || undefined
          });
          return { id: order.id, status: order.status, provider: gateway.provider };
        } catch (e) {
          console.error("Create order error", e);
          return this.json({ error: "Failed to create order" }, 502);
        }
      } catch (e) {
        console.error(e);
        return this.json({ error: "Unexpected error" }, 500);
      }
    });
  }
  @httpPost("/log")
  public async log(req: express.Request<{}, {}, { donation: Donation; fundData: { id: string; amount: number } }>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const gateways = (await this.repos.gateway.loadAll(req.body.donation.churchId as string)) as any[];
      const { donation, fundData } = req.body;
      if (gateways.length === 0) return this.json({}, 401);
      return this.logDonation(donation, [fundData]);
    });
  }

  @httpPost("/webhook/:provider")
  public async webhook(req: express.Request<{ provider: string }, {}, any>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const churchId = req.query.churchId?.toString();
      if (!churchId) return this.json({ error: "Missing churchId parameter" }, 400);

      const gateways = (await this.repos.gateway.loadAll(churchId)) as any[];
      if (!gateways.length) return this.json({ error: "No gateway configured" }, 401);

      const provider = req.params.provider?.toLowerCase();
      const gateway = gateways.find(g => g.provider.toLowerCase() === provider);

      if (!gateway) {
        return this.json({ error: `No ${provider} gateway configured` }, 404);
      }

      try {
        const webhookResult = await GatewayService.verifyWebhook(gateway, req.headers, req.body);

        if (!webhookResult.success) {
          console.error(`${provider} webhook verification failed`);
          return this.json({ error: `Invalid ${provider} webhook signature` }, 401);
        }

        if (!webhookResult.shouldProcess) {
          return this.json({}, 200);
        }

        const existingEvent = await this.repos.eventLog.loadByProviderId(churchId, webhookResult.eventId!);

        if (!existingEvent) {
          await GatewayService.logEvent(gateway, churchId, req.body, webhookResult.eventData, this.repos);

          if (this.shouldProcessDonation(provider, webhookResult.eventType!)) {
            const isPending = this.isPendingPayment(provider, webhookResult.eventType!);
            const isCompleted = this.isCompletedPayment(provider, webhookResult.eventType!);
            const transactionId = webhookResult.eventData?.id;

            if (isCompleted && transactionId) {
              // Check if a pending donation already exists for this transaction
              const existingDonation = await this.repos.donation.loadByTransactionId(churchId, transactionId);
              if (existingDonation) {
                // Update existing pending donation to complete
                await GatewayService.updateDonationStatus(gateway, churchId, transactionId, "complete", this.repos);
              } else {
                // No pending donation found, create a new complete donation
                await GatewayService.logDonation(gateway, churchId, webhookResult.eventData, this.repos, "complete");
              }
            } else if (isPending) {
              // Create a new pending donation for ACH payments
              await GatewayService.logDonation(gateway, churchId, webhookResult.eventData, this.repos, "pending");
            } else {
              // Regular completed donation (card payments, etc.)
              await GatewayService.logDonation(gateway, churchId, webhookResult.eventData, this.repos, "complete");
            }
          } else if (this.shouldCancelSubscription(provider, webhookResult.eventType!)) {
            const existingSubscription = await this.repos.subscription.load(churchId, webhookResult.eventData.id);
            if (existingSubscription?.personId) {
              await this.setMembershipAccessBySubscription(churchId, existingSubscription.personId, "deactivate");
            }
            await this.repos.subscription.delete(churchId, webhookResult.eventData.id);
          }
        }
      } catch (error) {
        console.error(`Webhook processing failed for ${provider}:`, error);
        return this.json({ error: "Webhook processing failed" }, 500);
      }

      return this.json({}, 200);
    });
  }

  private shouldProcessDonation(provider: string, eventType: string): boolean {
    const donationEvents: Record<string, string[]> = {
      paypal: ["PAYMENT.CAPTURE.COMPLETED"],
      donorbox: ["donation.created", "donation.updated"],
      stripe: ["payment_intent.succeeded", "charge.succeeded", "invoice.paid"]
    };
    return donationEvents[provider.toLowerCase()]?.includes(eventType) || false;
  }

  private isPendingPayment(provider: string, eventType: string): boolean {
    const pendingEvents: Record<string, string[]> = {
      stripe: ["payment_intent.processing"]
    };
    return pendingEvents[provider.toLowerCase()]?.includes(eventType) || false;
  }

  private isCompletedPayment(provider: string, eventType: string): boolean {
    const completedEvents: Record<string, string[]> = {
      stripe: ["payment_intent.succeeded", "charge.succeeded", "invoice.paid"]
    };
    return completedEvents[provider.toLowerCase()]?.includes(eventType) || false;
  }

  private shouldCancelSubscription(provider: string, eventType: string): boolean {
    const cancellationEvents = { paypal: ["BILLING.SUBSCRIPTION.CANCELLED"], donorbox: [] };
    return cancellationEvents[provider as keyof typeof cancellationEvents]?.includes(eventType) || false;
  }

  @httpPost("/charge")
  public async charge(req: express.Request<any>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const donationData = req.body;
      const churchId = au.churchId || donationData.churchId;
      const resolvedPersonId = donationData?.person?.id || au.personId || null;

      // Validate required parameters
      if (!donationData.provider && !donationData.gatewayId) {
        return this.json({ error: "Either provider or gatewayId is required" }, 400);
      }

      let gateway = await this.getGateway(churchId, donationData.provider, donationData.gatewayId);
      if (!gateway) return this.json({ error: "Gateway not found" }, 404);

      // EcoCash must never run on the Stripe gateway (wrong gatewayId from client or legacy fallback).
      const donationType = String(donationData?.type || "").toLowerCase();
      if (donationType === "ecocash" && String(gateway.provider || "").toLowerCase() !== "ecocash") {
        const ecoGateway = await this.getGateway(churchId, "ecocash", undefined);
        if (!ecoGateway) {
          return this.json({ error: "EcoCash gateway is not configured for this church" }, 404);
        }
        gateway = ecoGateway;
        donationData.gatewayId = ecoGateway.id;
      }

      const rawCurrency: string = donationData?.currency || gateway?.currency || "USD";
      const normalizedCurrency = rawCurrency.toLowerCase();
      donationData.currency = normalizedCurrency;

      try {
        const chargeResult = await GatewayService.processCharge(gateway, donationData);

        if (!chargeResult.success) {
          return this.json({ error: chargeResult.error || "Charge processing failed" }, 400);
        }

        // EcoCash is confirmed via polling. Log as pending now.
        if ((gateway.provider || "").toLowerCase() === "ecocash") {
          try {
            const msisdn = (donationData?.mobileNumber || donationData?.msisdn || "").toString();
            console.info("[Giving][EcoCash][charge] logging pending donation", {
              churchId,
              resolvedPersonId,
              transactionId: chargeResult.transactionId,
              amount: donationData?.amount,
              mobileNumber: msisdn
            });
            await this.logDonation(
              {
                churchId,
                personId: resolvedPersonId,
                donationDate: new Date(),
                amount: donationData?.amount,
                currency: donationData?.currency || gateway?.currency || "usd",
                method: "EcoCash",
                methodDetails: msisdn,
                notes: donationData?.notes || "",
                status: "pending",
                transactionId: chargeResult.transactionId
              } as any,
              donationData?.funds || []
            );
            console.info("[Giving][EcoCash][charge] pending donation logged", {
              churchId,
              resolvedPersonId,
              transactionId: chargeResult.transactionId
            });
          } catch (err) {
            console.error("Failed to log pending EcoCash donation:", err);
          }

          // Don't send receipt email until the status is confirmed
          return { ...chargeResult.data, provider: gateway.provider };
        }

        // Paynow is confirmed via polling (after redirect). Log as pending now.
        if ((gateway.provider || "").toLowerCase() === "paynow") {
          try {
            await this.logDonation(
              {
                churchId,
                personId: resolvedPersonId,
                donationDate: new Date(),
                amount: donationData?.amount,
                currency: donationData?.currency || gateway?.currency || "usd",
                method: "Paynow",
                methodDetails: (chargeResult.transactionId || donationData?.reference || donationData?.id || "").toString(),
                notes: donationData?.notes || "",
                status: "pending",
                transactionId: chargeResult.transactionId
              } as any,
              donationData?.funds || []
            );
          } catch (err) {
            console.error("Failed to log pending Paynow donation:", err);
          }

          // Don't send receipt email until the status is confirmed
          return { ...chargeResult.data, provider: gateway.provider };
        }

        // Stripe completes immediately on /charge — persist to giving ledger (EcoCash/Paynow log explicitly too).
        if ((gateway.provider || "").toLowerCase() === "stripe") {
          try {
            const transactionId = (chargeResult.transactionId || "").toString();
            if (transactionId) {
              const existing = await this.repos.donation.loadByTransactionId(churchId, transactionId);
              if (!existing) {
                const cardInfo = stripeCardFromPaymentIntentLike(chargeResult.data);
                const methodLabel = formatStripeCardBrand(cardInfo?.brand);
                const methodDetails = (cardInfo?.last4 || "").toString().trim() || transactionId;
                await this.logDonation(
                  {
                    churchId,
                    personId: resolvedPersonId,
                    donationDate: new Date(),
                    amount: donationData?.amount,
                    currency: donationData?.currency || gateway?.currency || "usd",
                    method: methodLabel,
                    methodDetails,
                    notes: donationData?.notes || "",
                    status: "complete",
                    transactionId
                  } as any,
                  donationData?.funds || []
                );
              }
            }
          } catch (err) {
            console.error("Failed to log Stripe donation:", err);
          }
        }

        // For PayPal, we need to log the events since it's captured immediately
        if (gateway.provider === "paypal") {
          await GatewayService.logEvent(gateway, churchId, chargeResult.data, chargeResult.data, this.repos);
          await GatewayService.logDonation(gateway, churchId, chargeResult.data, this.repos);
        }

        await this.sendEmails(donationData.person.email, donationData?.church, donationData.funds, donationData?.amount, donationData?.interval, donationData?.billing_cycle_anchor, "one-time");

        return { ...chargeResult.data, provider: gateway.provider };
      } catch (error) {
        console.error("Charge processing failed:", error);
        return this.json({ error: "Charge processing failed" }, 500);
      }
    });
  }

  @httpPost("/subscribe")
  public async subscribe(req: express.Request<any>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const { id, amount, customerId, type, billing_cycle_anchor, proration_behavior, interval, funds, person, notes, churchId: CHURCH_ID, provider, gatewayId, currency } = req.body;
      const churchId = au.churchId || CHURCH_ID;

      // Validate required parameters
      if (!provider && !gatewayId) {
        return this.json({ error: "Either provider or gatewayId is required" }, 400);
      }

      const gateway = await this.getGateway(churchId, provider, gatewayId);
      if (!gateway) return this.json({ error: "Gateway not found" }, 404);

      // Check if provider supports subscriptions
      const capabilities = GatewayService.getProviderCapabilities(gateway);
      if (!capabilities?.supportsSubscriptions) {
        return this.json({ error: `${gateway.provider} does not support recurring subscriptions` }, 400);
      }

      const rawCurrency: string = currency || gateway?.currency || "USD";
      const normalizedCurrency = rawCurrency.toLowerCase();

      try {
        const subscriptionData = {
          id,
          amount,
          currency: normalizedCurrency,
          customerId,
          type,
          billing_cycle_anchor,
          proration_behavior,
          interval,
          notes
        };

        const subscriptionResult = await GatewayService.createSubscription(gateway, subscriptionData);

        if (!subscriptionResult.success) {
          const detail = (subscriptionResult as any)?.data?.error;
          const message =
            typeof detail === "string" && detail.trim()
              ? detail.trim()
              : "Subscription creation failed";
          return this.json({ error: message }, 400);
        }

        const subscription: Subscription = {
          id: subscriptionResult.subscriptionId,
          churchId,
          personId: person.id,
          customerId,
          gatewayId: gateway.id
        };

        await this.repos.subscription.save(subscription);

        const promises: Promise<SubscriptionFund>[] = [];
        funds.forEach((fund: FundDonation) => {
          const subscriptionFund: SubscriptionFund = {
            churchId,
            subscriptionId: subscription.id,
            fundId: fund.id,
            amount: fund.amount
          };
          promises.push(this.repos.subscriptionFunds.save(subscriptionFund));
        });

        await Promise.all(promises);
        await this.sendEmails(person.email, req.body?.church, funds, amount, interval, billing_cycle_anchor, "recurring");
        await this.setMembershipAccessBySubscription(churchId, person.id, "activate");

        return { ...subscriptionResult.data, provider: gateway.provider };
      } catch (error) {
        console.error("Subscription creation failed:", error);
        return this.json({ error: "Subscription creation failed" }, 500);
      }
    });
  }

  /**
   * EcoCash transaction status lookup (polling; no webhook yet)
   */
  @httpPost("/ecocash/status")
  public async ecoCashStatus(
    req: express.Request<{}, {}, { churchId?: string; provider?: string; gatewayId?: string; mobileNumber: string; reference: string }>,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const { provider, gatewayId, mobileNumber, reference } = req.body;
      const churchId = au.churchId || req.body.churchId;

      if (!churchId) return this.json({ error: "Missing churchId" }, 400);
      if (!mobileNumber) return this.json({ error: "Missing mobileNumber" }, 400);
      if (!reference) return this.json({ error: "Missing reference" }, 400);

      const gateway = await this.getGateway(churchId, provider, gatewayId);
      if (!gateway) return this.json({ error: "Gateway not found" }, 404);
      if ((gateway.provider || "").toLowerCase() !== "ecocash") return this.json({ error: "Gateway is not EcoCash" }, 400);

      const config = GatewayService.getGatewayConfig(gateway);
      const apiKey = (config.privateKey || "").trim();
      if (!apiKey) return this.json({ error: "EcoCash API key missing" }, 400);

      const env = (config.environment || "").toLowerCase().trim();
      const mode = env === "sandbox" || env === "test" || env === "dev" ? "sandbox" : "live";
      const normalizedMobile = (() => {
        const digits = String(mobileNumber || "").replace(/\D/g, "");
        if (digits.startsWith("2637") && digits.length >= 12) return digits.slice(0, 12);
        if (digits.startsWith("07") && digits.length >= 10) return `263${digits.slice(1, 10)}`;
        if (digits.startsWith("7") && digits.length >= 9) return `263${digits.slice(0, 9)}`;
        return digits;
      })();

      try {
        const data = await EcoCashHelper.lookupTransaction(apiKey, mode as any, {
          sourceMobileNumber: normalizedMobile || mobileNumber,
          sourceReference: reference
        });
        const ecoCashNormalizedStatus = normalizeEcoCashLookupPayload(data);
        if (ecoCashNormalizedStatus === "success") {
          try {
            await this.repos.donation.updateStatus(churchId, reference, "complete");
          } catch (err) {
            console.error("Failed to mark EcoCash donation complete", err);
          }
        }

        return { ...data, provider: gateway.provider, ecoCashNormalizedStatus };
      } catch (err: any) {
        const apiError = err?.response?.data;
        const msg =
          apiError?.message ||
          apiError?.error ||
          (Array.isArray(apiError?.errors) ? apiError.errors.find((x: any) => typeof x === "string" && x.trim().length > 0) : null) ||
          err?.message ||
          "EcoCash lookup failed";
        return this.json({ error: msg, raw: err?.response?.data ?? null }, 400);
      }
    });
  }

  /**
   * Paynow transaction status lookup (polling; after redirect)
   */
  @httpPost("/paynow/status")
  public async paynowStatus(
    req: express.Request<{}, {}, { churchId?: string; provider?: string; gatewayId?: string; pollUrl: string; reference?: string; personId?: string; method?: string }>,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const { provider, gatewayId, pollUrl, reference, personId, method } = req.body;
      const churchId = au.churchId || req.body.churchId;

      if (!churchId) return this.json({ error: "Missing churchId" }, 400);
      if (!pollUrl) return this.json({ error: "Missing pollUrl" }, 400);

      const gateway = await this.getGateway(churchId, provider, gatewayId);
      if (!gateway) return this.json({ error: "Gateway not found" }, 404);
      if ((gateway.provider || "").toLowerCase() !== "paynow") return this.json({ error: "Gateway is not Paynow" }, 400);

      const config = GatewayService.getGatewayConfig(gateway);
      const integrationKey = (config.privateKey || "").trim();
      if (!integrationKey) return this.json({ error: "Paynow integration key missing" }, 400);

      try {
        const statusResult = await PaynowHelper.pollStatus(pollUrl, integrationKey);
        if (statusResult.ok === false) return this.json({ error: statusResult.error, raw: statusResult.raw ?? null }, 400);

        const status = (statusResult.status || "").toString().toLowerCase();
        // Paynow uses statuses like Paid/Awaiting Delivery/Cancelled, etc.
        const isPaid = status.includes("paid") || status.includes("delivered") || status.includes("awaiting delivery");

        if (isPaid) {
          const txId = (reference || statusResult.reference || "").toString() || (statusResult.paynowReference || "").toString();
          if (txId) {
            try {
              await this.repos.donation.updateStatus(churchId, txId, "complete");
            } catch (err) {
              console.error("Failed to mark Paynow donation complete", err);
            }
          }

          const token = this.extractPaynowToken(statusResult.raw || {});
          if (token && personId) {
            try {
              const existing = await this.repos.gatewayPaymentMethod.loadByExternalId(churchId, gateway.id, token);
              const methodType = (method || "paynow_card").toString();
              const model: GatewayPaymentMethod = existing || {
                churchId,
                gatewayId: gateway.id,
                customerId: personId,
                externalId: token
              };
              model.methodType = methodType;
              model.displayName = methodType === "zimswitch" ? "Paynow Zimswitch" : "Paynow Visa/Mastercard";
              model.metadata = {
                ...(model.metadata || {}),
                provider: "paynow",
                tokenized: true,
                tokenCapturedAt: new Date().toISOString(),
                paynowReference: statusResult.paynowReference || null,
                reference: statusResult.reference || null,
                method: methodType
              };
              await this.repos.gatewayPaymentMethod.save(model);
            } catch (err) {
              console.error("Failed to persist Paynow tokenized method", err);
            }
          }
        }

        return {
          ...statusResult.raw,
          provider: gateway.provider,
          tokenized: !!this.extractPaynowToken(statusResult.raw || {}),
          token: this.extractPaynowToken(statusResult.raw || "")
        };
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || "Paynow lookup failed";
        return this.json({ error: msg, raw: err?.response?.data ?? null }, 400);
      }
    });
  }

  /**
   * Create a Paynow hosted payment link for mobile checkout.
   * Returns Paynow browserUrl + pollUrl so the app can open WebView and poll completion.
   */
  @httpPost("/paynow/link")
  public async paynowLink(
    req: express.Request<
      {},
      {},
      {
        churchId?: string;
        provider?: string;
        gatewayId?: string;
        amount: number;
        reference?: string;
        returnUrl?: string;
        resultUrl?: string;
        additionalInfo?: string;
        authEmail?: string;
        authPhone?: string;
        authName?: string;
        tokenize?: boolean;
        method?: string;
        notes?: string;
        currency?: string;
        person?: { id?: string | null };
        funds?: FundDonation[];
      }
    >,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const churchId = au.churchId || req.body.churchId;
      const {
        provider,
        gatewayId,
        reference,
        returnUrl,
        resultUrl,
        additionalInfo,
        authEmail,
        authPhone,
        authName,
        tokenize,
        method,
        notes,
        currency,
        person,
        funds
      } = req.body;
      const amount = Number(req.body.amount || 0);

      if (!churchId) return this.json({ error: "Missing churchId" }, 400);
      if (!Number.isFinite(amount) || amount <= 0) return this.json({ error: "Invalid amount" }, 400);

      const gateway = await this.getGateway(churchId, provider, gatewayId);
      if (!gateway) return this.json({ error: "Gateway not found" }, 404);
      if ((gateway.provider || "").toLowerCase() !== "paynow") return this.json({ error: "Gateway is not Paynow" }, 400);

      const config = GatewayService.getGatewayConfig(gateway);
      const integrationKey = (config.privateKey || "").trim();
      const integrationId = String((config.settings as any)?.integrationId || config.publicKey || "").trim();
      if (!integrationKey || !integrationId) return this.json({ error: "Paynow gateway is not configured" }, 400);

      const paymentReference =
        (typeof reference === "string" && reference.trim()) ||
        `PNL-${Date.now()}`;
      const fallbackReturnUrl = "https://www.paynow.co.zw";
      const safeReturnUrl = (returnUrl || "").trim() || fallbackReturnUrl;
      const safeResultUrl = (resultUrl || "").trim() || safeReturnUrl;

      const tokenizeRequested = typeof tokenize === "boolean" ? tokenize : false;
      let tokenizationPermitted = true;
      let init = await PaynowHelper.initiateTransaction({
        integrationId,
        integrationKey,
        reference: paymentReference,
        amount,
        additionalInfo: (additionalInfo || "Church donation").trim(),
        returnUrl: safeReturnUrl,
        resultUrl: safeResultUrl,
        authEmail: (authEmail || "").trim() || undefined,
        authPhone: (authPhone || "").trim() || undefined,
        authName: (authName || "").trim() || undefined,
        tokenize: tokenizeRequested,
        merchantTrace: paymentReference.slice(0, 32)
      });

      if (
        init.ok === false &&
        tokenizeRequested &&
        String(init.error || "").toLowerCase().includes("not permitted to tokenize")
      ) {
        tokenizationPermitted = false;
        init = await PaynowHelper.initiateTransaction({
          integrationId,
          integrationKey,
          reference: paymentReference,
          amount,
          additionalInfo: (additionalInfo || "Church donation").trim(),
          returnUrl: safeReturnUrl,
          resultUrl: safeResultUrl,
          authEmail: (authEmail || "").trim() || undefined,
          authPhone: (authPhone || "").trim() || undefined,
          authName: (authName || "").trim() || undefined,
          tokenize: false,
          merchantTrace: paymentReference.slice(0, 32)
        });
      }

      if (init.ok === false) return this.json({ error: init.error, raw: init.raw ?? null }, 400);

      try {
        await this.logDonation(
          {
            churchId,
            personId: person?.id || null,
            donationDate: new Date(),
            amount,
            currency: (currency || gateway?.currency || "usd").toString().toLowerCase(),
            method: "Paynow",
            methodDetails: paymentReference,
            notes: (notes || "").toString(),
            status: "pending",
            transactionId: paymentReference
          } as any,
          Array.isArray(funds) ? funds : []
        );
      } catch (err) {
        console.error("Failed to log pending Paynow payment-link donation:", err);
      }

      return {
        provider: gateway.provider,
        status: "pending",
        reference: paymentReference,
        method: (method || "").toString() || undefined,
        tokenizeRequested,
        tokenizationPermitted,
        tokenizationDowngraded: tokenizeRequested && !tokenizationPermitted,
        browserUrl: init.browserUrl,
        pollUrl: init.pollUrl
      };
    });
  }

  /**
   * Attempt token-based Paynow express charge (no browser redirect required when token is available).
   */
  @httpPost("/paynow/express/charge")
  public async paynowExpressCharge(
    req: express.Request<
      {},
      {},
      {
        churchId?: string;
        provider?: string;
        gatewayId?: string;
        amount: number;
        personId: string;
        method: "vmc" | "zimswitch";
        reference?: string;
        returnUrl?: string;
        resultUrl?: string;
        additionalInfo?: string;
        authEmail?: string;
        authPhone?: string;
        authName?: string;
        notes?: string;
        currency?: string;
        funds?: FundDonation[];
      }
    >,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const churchId = au.churchId || req.body.churchId;
      const {
        provider,
        gatewayId,
        personId,
        method,
        reference,
        returnUrl,
        resultUrl,
        additionalInfo,
        authEmail,
        authPhone,
        authName,
        notes,
        currency,
        funds
      } = req.body;
      const amount = Number(req.body.amount || 0);

      if (!churchId) return this.json({ error: "Missing churchId" }, 400);
      if (!personId) return this.json({ error: "Missing personId" }, 400);
      if (method !== "vmc" && method !== "zimswitch") return this.json({ error: "Invalid express method" }, 400);
      if (!Number.isFinite(amount) || amount <= 0) return this.json({ error: "Invalid amount" }, 400);

      const gateway = await this.getGateway(churchId, provider, gatewayId);
      if (!gateway) return this.json({ error: "Gateway not found" }, 404);
      if ((gateway.provider || "").toLowerCase() !== "paynow") return this.json({ error: "Gateway is not Paynow" }, 400);

      const savedMethod = await this.repos.gatewayPaymentMethod.loadLatestByCustomerAndMethod(churchId, gateway.id, personId, method);
      const token = (savedMethod?.externalId || "").toString().trim();
      if (!token) return this.json({ error: "No saved Paynow token for this method", code: "NO_SAVED_PAYNOW_TOKEN" }, 404);

      const config = GatewayService.getGatewayConfig(gateway);
      const integrationKey = (config.privateKey || "").trim();
      const integrationId = String((config.settings as any)?.integrationId || config.publicKey || "").trim();
      if (!integrationKey || !integrationId) return this.json({ error: "Paynow gateway is not configured" }, 400);

      const paymentReference =
        (typeof reference === "string" && reference.trim()) ||
        `PNE-${Date.now()}`;
      const fallbackReturnUrl = "https://www.paynow.co.zw";
      const safeReturnUrl = (returnUrl || "").trim() || fallbackReturnUrl;
      const safeResultUrl = (resultUrl || "").trim() || safeReturnUrl;

      const init = await PaynowHelper.initiateExpressTransaction({
        integrationId,
        integrationKey,
        reference: paymentReference,
        amount,
        additionalInfo: (additionalInfo || "Church donation").trim(),
        returnUrl: safeReturnUrl,
        resultUrl: safeResultUrl,
        authEmail: (authEmail || "").trim() || undefined,
        authPhone: (authPhone || "").trim() || undefined,
        authName: (authName || "").trim() || undefined,
        method,
        token,
        merchantTrace: paymentReference.slice(0, 32)
      });

      if (init.ok === false) return this.json({ error: init.error, raw: init.raw ?? null }, 400);

      try {
        await this.logDonation(
          {
            churchId,
            personId: personId || null,
            donationDate: new Date(),
            amount,
            currency: (currency || gateway?.currency || "usd").toString().toLowerCase(),
            method: method === "zimswitch" ? "Paynow Zimswitch" : "Paynow Visa/Mastercard",
            methodDetails: paymentReference,
            notes: (notes || "").toString(),
            status: "pending",
            transactionId: paymentReference
          } as any,
          Array.isArray(funds) ? funds : []
        );
      } catch (err) {
        console.error("Failed to log pending Paynow express donation:", err);
      }

      return {
        provider: gateway.provider,
        status: "pending",
        reference: paymentReference,
        method,
        tokenized: true,
        browserUrl: init.browserUrl || null,
        pollUrl: init.pollUrl
      };
    });
  }

  /**
   * Check Paynow account/integration capabilities.
   * Optionally probes tokenization permission with a non-finalized initiate call.
   */
  @httpPost("/paynow/capabilities")
  public async paynowCapabilities(
    req: express.Request<
      {},
      {},
      {
        churchId?: string;
        provider?: string;
        gatewayId?: string;
        probeTokenize?: boolean;
      }
    >,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const churchId = au.churchId || req.body.churchId;
      const { provider, gatewayId } = req.body;
      const probeTokenize = req.body.probeTokenize === true;
      if (!churchId) return this.json({ error: "Missing churchId" }, 400);

      const gateway = await this.getGateway(churchId, provider, gatewayId);
      if (!gateway) return this.json({ error: "Gateway not found" }, 404);
      if ((gateway.provider || "").toLowerCase() !== "paynow") return this.json({ error: "Gateway is not Paynow" }, 400);

      const config = GatewayService.getGatewayConfig(gateway);
      const integrationKey = (config.privateKey || "").trim();
      const integrationId = String((config.settings as any)?.integrationId || config.publicKey || "").trim();
      const configured = !!integrationKey && !!integrationId;
      const supportedMethods = {
        vmc: true,
        zimswitch: true,
        ecocash: true
      };

      if (!configured) {
        return {
          provider: gateway.provider,
          configured,
          integrationIdPresent: !!integrationId,
          integrationKeyPresent: !!integrationKey,
          supportedMethods,
          tokenization: {
            status: "unknown",
            permitted: false,
            probed: false,
            reason: "Paynow gateway configuration is incomplete"
          }
        };
      }

      let tokenization: {
        status: "unknown" | "enabled" | "disabled";
        permitted: boolean;
        probed: boolean;
        reason?: string;
        rawError?: string;
      } = {
        status: "unknown",
        permitted: false,
        probed: false,
        reason: "Set probeTokenize=true to actively verify permission"
      };

      if (probeTokenize) {
        const probeRef = `PN-CAP-${Date.now()}`;
        const probe = await PaynowHelper.initiateTransaction({
          integrationId,
          integrationKey,
          reference: probeRef,
          amount: 0.01,
          additionalInfo: "Capability probe only. Do not complete payment.",
          returnUrl: "https://www.paynow.co.zw",
          resultUrl: "https://www.paynow.co.zw",
          tokenize: true,
          merchantTrace: probeRef.slice(0, 32)
        });

        if (probe.ok) {
          tokenization = {
            status: "enabled",
            permitted: true,
            probed: true,
            reason: "Paynow accepted tokenize=true initiate request"
          };
        } else {
          const errText = (probe.ok === false ? probe.error : "").toString();
          const denied = errText.toLowerCase().includes("not permitted to tokenize");
          tokenization = {
            status: denied ? "disabled" : "unknown",
            permitted: false,
            probed: true,
            reason: denied
              ? "Paynow has not enabled tokenization for this integration"
              : "Unable to confirm tokenization permission from probe",
            rawError: errText
          };
        }
      }

      return {
        provider: gateway.provider,
        configured,
        integrationIdPresent: !!integrationId,
        integrationKeyPresent: !!integrationKey,
        supportedMethods,
        tokenization
      };
    });
  }

  @httpPost("/fee")
  public async calculateFee(req: express.Request<{}, {}, { type?: string; provider?: string; gatewayId?: string; amount: number; currency?: string }>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const { type, provider, gatewayId, amount, currency } = req.body;
      const churchId = req.query.churchId?.toString();

      if (!churchId) {
        return this.json({ error: "Missing churchId parameter" }, 400);
      }

      try {
        let calculatedFee = 0;
        let gatewayProvider = null;
        const currencyToUse = (currency || "USD").toUpperCase();

        if (provider || gatewayId) {
          // Use gateway-specific fee calculation
          const gateway = await this.getGateway(churchId, provider, gatewayId);

          if (!gateway) {
            return this.json({ error: "Gateway not found" }, 404);
          }

          calculatedFee = await GatewayService.calculateFees(gateway, amount, churchId, currencyToUse);
          gatewayProvider = gateway.provider;
        } else {
          // Legacy type-based calculation for backward compatibility
          if (type === "creditCard") {
            calculatedFee = await this.getCreditCardFees(amount, churchId, currencyToUse);
          } else if (type === "ach") {
            calculatedFee = await this.getACHFees(amount, churchId);
          }
        }

        return { calculatedFee, provider: gatewayProvider, currency: currencyToUse };
      } catch (error) {
        console.error("Fee calculation failed:", error);
        return { calculatedFee: 0 };
      }
    });
  }

  private sendEmails = async (
    to: string,
    church: { name?: string; subDomain?: string; churchURL?: string; logo?: string },
    funds: any[],
    amount?: number,
    interval?: { interval_count: number; interval: string },
    billingCycleAnchor?: number,
    donationType: "recurring" | "one-time" = "recurring"
  ) => {
    // Skip email if no recipient address
    if (!to) return;

    const contentRows: any[] = [];
    let totalFundAmount = 0;

    funds.forEach((fund, index) => {
      totalFundAmount += fund.amount;
      if (donationType === "recurring") {
        const startDate = dayjs(billingCycleAnchor).format("MMM D, YYYY");
        contentRows.push(
          `<tr>${index === 0 ? `<td style="font-size: 15px" rowspan="${funds.length}">${interval!.interval_count} ${interval!.interval}<BR><span style="font-size: 13px">(from ${startDate})</span></td>` : ""}<td style="font-size: 15px; text-overflow: ellipsis; overflow: hidden;">${fund.name}</td><td style="font-size: 15px">$${fund.amount}</td></tr>`
        );
      } else {
        contentRows.push(`<tr><td style="font-size: 15px; text-overflow: ellipsis; overflow: hidden;">${fund.name}</td><td style="font-size: 15px">$${fund.amount}</td></tr>`);
      }
    });

    const transactionFee = amount! - totalFundAmount;

    const domain =
      Environment.appEnv === "staging"
        ? `${church.subDomain}.staging.machonharuach.org`
        : `${church.subDomain}.machonharuach.org`;

    const title = `${church?.logo ? `<img src="${church.logo}" alt="Logo: " style="width: 100%" /> ` : ""}${church.name}`;

    const recurringDonationContent =
      `
      <h3 style="font-size: 20px;">Your recurring donation has been confirmed!</h3>
      <table role="presentation" style="text-align: center;" cellspacing="8" width="80%">
        <tablebody>
          <tr>
            <th style="font-size: 16px" width="30%">Interval</th>
            <th style="font-size: 16px" width="30%">Fund</th>
            <th style="font-size: 16px" width="30%">Amount</th>
          </tr>` +
      contentRows.join(" ") +
      `${
        transactionFee === 0
          ? ""
          : `
            <tr style="border-top: solid #dee2e6 1px">
              <td></td>
              <th style="font-size: 15px">Transaction Fee</th>
              <td>$${CurrencyHelper.formatCurrency(transactionFee)}</td>
            </tr>
            <tr style="border-top: solid #dee2e6 1px">
              <td></td>
              <th style="font-size: 15px">Total</th>
              <td>$${amount}</td>
            </tr>
          `
      }
        </tablebody>
      </table>
      <br />
      <h4 style="font-size: 14px;">
        <a href="https://${domain}/member/donate" target="_blank" rel="noreferrer noopener">Modify your subscription here!</a>
      </h4>
    `;
    const oneTimeDonationContent =
      `
      <h3 style="font-size: 20px;">Your donation has been confirmed!</h3>
      <table role="presentation" style="text-align: center;" cellspacing="8" width="80%">
        <tablebody>
          <tr>
            <th style="font-size: 16px" width="50%">Fund</th>
            <th style="font-size: 16px" width="50%">Amount</th>
          </tr>` +
      contentRows.join(" ") +
      `${
        transactionFee === 0
          ? ""
          : `
            <tr style="border-top: solid #dee2e6 1px">
              <th style="font-size: 15px">Transaction Fee</th>
              <td>$${CurrencyHelper.formatCurrency(transactionFee)}</td>
            </tr>
            <tr style="border-top: solid #dee2e6 1px">
              <th style="font-size: 15px">Total</th>
              <td>$${amount}</td>
            </tr>
          `
      }
        </tablebody>
      </table>
    `;

    const contents = donationType === "recurring" ? recurringDonationContent : oneTimeDonationContent;

    await EmailHelper.sendTemplatedEmail(Environment.supportEmail, to, title, church.churchURL as string, "Thank You For Donating", contents, "ChurchEmailTemplate.html");
  };

  private extractPaynowToken(raw: Record<string, any> | string | null | undefined): string | undefined {
    if (!raw) return undefined;
    const map = typeof raw === "string" ? {} : raw;
    const candidates = [
      map.token,
      map.Token,
      map.paymenttoken,
      map.paymentToken,
      map.paymentinstrumenttoken,
      map.paymentInstrumentToken,
      map.cardtoken,
      map.cardToken
    ];
    const token = candidates.find(v => typeof v === "string" && v.trim().length > 0);
    return token ? String(token).trim() : undefined;
  }

  private logDonation = async (donationData: Donation, fundData: FundDonation[]) => {
    const branch = extractGivingCampusFromNotes(donationData.notes);
    const batch: DonationBatch = await this.repos.donationBatch.getOrCreateForOnlineGift(
      donationData.churchId as string,
      donationData.donationDate,
      donationData.method,
      branch
    );
    donationData.batchId = batch.id;
    const donation = await this.repos.donation.save(donationData);
    const promises: Promise<FundDonation>[] = [];
    fundData.forEach((fund: FundDonation) => {
      const fundId = fund.id || (fund as any).fundId;
      if (!fundId) return;
      const fundDonation: FundDonation = {
        churchId: donation.churchId,
        amount: fund.amount,
        donationId: donation.id,
        fundId
      };
      promises.push(this.repos.fundDonation.save(fundDonation));
    });
    return await Promise.all(promises);
  };


  // Legacy fee calculation methods for backward compatibility
  private getCreditCardFees = async (amount: number, churchId: string, currency: string = "USD") => {
    const gateways = (await this.repos.gateway.loadAll(churchId)) as any[];
    const activeGateway = gateways.find((g) => !!g?.provider);
    if (activeGateway) {
      return await GatewayService.calculateFees(activeGateway, amount, churchId, currency);
    }

    // Fallback to hardcoded calculation if no gateway found
    let customFixedFee: number | null = null;
    let customPercentFee: number | null = null;
    if (churchId) {
      const response = await Axios.get(Environment.membershipApi + "/settings/public/" + churchId);
      const data = response.data;
      if (data?.flatRateCC && data.flatRateCC !== null && data.flatRateCC !== undefined && data.flatRateCC !== "") customFixedFee = +data.flatRateCC;
      if (data?.transFeeCC && data.transFeeCC !== null && data.transFeeCC !== undefined && data.transFeeCC !== "") customPercentFee = +data.transFeeCC / 100;
    }
    const fixedFee = customFixedFee ?? 0.3;
    const fixedPercent = customPercentFee ?? 0.029;
    return Math.round(((amount + fixedFee) / (1 - fixedPercent) - amount) * 100) / 100;
  };

  private getACHFees = async (amount: number, churchId: string) => {
    const gateways = (await this.repos.gateway.loadAll(churchId)) as any[];
    const activeGateway = gateways.find((g) => !!g?.provider);
    if (activeGateway) {
      return await GatewayService.calculateFees(activeGateway, amount, churchId);
    }

    // Fallback to hardcoded calculation if no gateway found
    let customPercentFee: number | null = null;
    let customMaxFee: number | null = null;
    if (churchId) {
      const response = await Axios.get(Environment.membershipApi + "/settings/public/" + churchId);
      const data = response.data;
      if (data?.flatRateACH && data.flatRateACH !== null && data.flatRateACH !== undefined && data.flatRateACH !== "") customPercentFee = +data.flatRateACH / 100;
      if (data?.hardLimitACH && data.hardLimitACH !== null && data.hardLimitACH !== undefined && data.hardLimitACH !== "") customMaxFee = +data.hardLimitACH;
    }
    const fixedPercent = customPercentFee ?? 0.008;
    const fixedMaxFee = customMaxFee ?? 5.0;
    const fee = Math.round((amount / (1 - fixedPercent) - amount) * 100) / 100;
    return Math.min(fee, fixedMaxFee);
  };

  @httpPost("/captcha-verify")
  public async captchaVerify(req: express.Request<{}, {}, { token: string }>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      try {
        // detecting if its a bot or a human
        const { token } = req.body;
        const response = await Axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${Environment.googleRecaptchaSecretKey}&response=${token}`);
        const data = response.data;

        if (!data.success) {
          return { response: "robot" };
        }

        // if google's response already includes b1.church in hostname property, no need to check in the DB then
        if (data.hostname.includes("machonharuach.org") || data.hostname.includes("b1.church")) {
          return { response: "human" };
        }

        // if its a custom domain, verify the domain exist in the DB
        const domainData = await Axios.get(`${Environment.membershipApi}/domains/public/lookup/${data.hostname.replace(".localhost", "")}`);
        const domain: any = await domainData.data;

        if (domain) {
          return { response: "human" };
        }

        // if calls is made from localhost
        if (data.hostname.includes(".localhost")) {
          return { response: "human" };
        }

        return { response: "" };
      } catch {
        return this.json({ message: "Error verifying reCAPTCHA" }, 400);
      }
    });
  }

  /**
   * Get gateway by provider name or ID using the centralized helper
   */
  private async getGateway(churchId: string, provider?: string, gatewayId?: string): Promise<any> {
    try {
      return await GatewayService.getGatewayForChurch(churchId, {
        provider,
        gatewayId
      }, this.repos.gateway);
    } catch {
      // Return null for backward compatibility when gateway not found
      return null;
    }
  }
}
