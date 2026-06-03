import express from "express";
import Stripe from "stripe";
import Axios from "axios";
import { IGatewayProvider, WebhookResult, ChargeResult, SubscriptionResult, GatewayConfig } from "./IGatewayProvider.js";
import { Environment } from "../Environment.js";
import { Donation, DonationBatch, EventLog, FundDonation } from "../../../modules/giving/models/index.js";
import { extractGivingCampusFromNotes } from "../../../modules/giving/helpers/givingCampusFromNotes.js";
import { formatStripeCardBrand, stripeCardFromPaymentIntentLike } from "../stripeCardDisplay.js";

export class StripeGatewayProvider implements IGatewayProvider {
  readonly name = "stripe";

  private getClient(secretKey: string): Stripe {
    return new Stripe(secretKey, { apiVersion: "2026-04-22.dahlia" });
  }

  // ---------------------------------------------------------------------------
  // Webhooks
  // ---------------------------------------------------------------------------

  async createWebhookEndpoint(config: GatewayConfig, webhookUrl: string): Promise<{ id: string; secret?: string }> {
    const stripe = this.getClient(config.privateKey);
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        "payment_intent.succeeded",
        "payment_intent.payment_failed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "invoice.paid",
        "invoice.payment_failed"
      ]
    });
    return { id: webhook.id, secret: webhook.secret };
  }

  async deleteWebhooksByChurchId(config: GatewayConfig, _churchId: string): Promise<void> {
    const stripe = this.getClient(config.privateKey);
    const webhooks = await stripe.webhookEndpoints.list({ limit: 100 });
    const deletePromises = webhooks.data.map((wh) => stripe.webhookEndpoints.del(wh.id).catch(() => null));
    await Promise.all(deletePromises);
  }

  async verifyWebhookSignature(config: GatewayConfig, headers: express.Request["headers"], body: any): Promise<WebhookResult> {
    try {
      const stripe = this.getClient(config.privateKey);
      const sig = headers["stripe-signature"] as string;
      const event = stripe.webhooks.constructEvent(
        typeof body === "string" ? body : JSON.stringify(body),
        sig,
        config.webhookKey
      );
      return {
        success: true,
        shouldProcess: true,
        eventType: event.type,
        eventData: event.data.object,
        eventId: event.id
      };
    } catch {
      return { success: false, shouldProcess: false };
    }
  }

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------

  async processCharge(config: GatewayConfig, donationData: any): Promise<ChargeResult> {
    try {
      const stripe = this.getClient(config.privateKey);
      const amountInCents = Math.round((donationData.amount ?? 0) * 100);
      const currency = (donationData.currency || "usd").toLowerCase();

      const paymentMethodId = donationData.paymentMethodId || donationData.id;
      const isStripePaymentMethodId =
        typeof paymentMethodId === "string" && /^pm_|^pi_/.test(paymentMethodId.trim());

      const createParams: Stripe.PaymentIntentCreateParams = {
        amount: amountInCents,
        currency,
        customer: donationData.customerId || undefined,
        payment_method: isStripePaymentMethodId ? paymentMethodId.trim() : undefined,
        confirm: isStripePaymentMethodId,
        off_session: !!donationData.offSession,
        description: donationData.description || "Donation",
        expand: ["payment_method"],
        metadata: {
          churchId: donationData.churchId || "",
          fundId: donationData.fundId || "",
          personId: donationData.personId || donationData?.person?.id || "",
          funds: JSON.stringify(donationData.funds || [])
        }
      };

      // Saved PM + confirm on server: avoid dashboard redirect-based methods (Link, etc.) that require return_url.
      if (isStripePaymentMethodId) {
        createParams.automatic_payment_methods = { enabled: true, allow_redirects: "never" };
      }

      const paymentIntent = await stripe.paymentIntents.create(createParams);

      return {
        success: paymentIntent.status === "succeeded" || paymentIntent.status === "requires_capture",
        transactionId: paymentIntent.id,
        data: paymentIntent
      };
    } catch (error: any) {
      return { success: false, transactionId: "", data: null, error: error?.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------------

  async createSubscription(config: GatewayConfig, subscriptionData: any): Promise<SubscriptionResult> {
    try {
      const stripe = this.getClient(config.privateKey);
      const rawAmount = Number(subscriptionData.amount ?? 0);
      const amountInCents = Math.round(Number.isFinite(rawAmount) ? rawAmount * 100 : 0);
      const currency = (subscriptionData.currency || "usd").toLowerCase();

      // Mobile sends `interval` as either a string ("month") or `{ interval, interval_count }` from recurring donations.
      const rawInterval = subscriptionData.interval;
      let recurringInterval: Stripe.PriceCreateParams.Recurring.Interval = "month";
      let intervalCount = 1;

      const allowed: Stripe.PriceCreateParams.Recurring.Interval[] = ["day", "week", "month", "year"];

      if (typeof rawInterval === "string" && allowed.includes(rawInterval as Stripe.PriceCreateParams.Recurring.Interval)) {
        recurringInterval = rawInterval as Stripe.PriceCreateParams.Recurring.Interval;
      } else if (rawInterval && typeof rawInterval === "object") {
        const iv = typeof rawInterval.interval === "string" ? rawInterval.interval : "";
        if (allowed.includes(iv as Stripe.PriceCreateParams.Recurring.Interval)) {
          recurringInterval = iv as Stripe.PriceCreateParams.Recurring.Interval;
        }
        const ic = rawInterval.interval_count ?? rawInterval.intervalCount ?? subscriptionData.intervalCount;
        if (ic != null && ic !== "") {
          const parsed = Number.parseInt(String(ic), 10);
          if (Number.isFinite(parsed) && parsed > 0) intervalCount = parsed;
        }
      } else if (subscriptionData.intervalCount != null && subscriptionData.intervalCount !== "") {
        const parsed = Number.parseInt(String(subscriptionData.intervalCount), 10);
        if (Number.isFinite(parsed) && parsed > 0) intervalCount = parsed;
      }

      const paymentMethodId = subscriptionData.paymentMethodId ?? subscriptionData.id;

      // Create an inline price on the fly
      const price = await stripe.prices.create({
        currency,
        unit_amount: amountInCents,
        recurring: { interval: recurringInterval, interval_count: intervalCount },
        product_data: { name: subscriptionData.description || "Church Subscription" }
      });

      const subscription = await stripe.subscriptions.create({
        customer: subscriptionData.customerId,
        items: [{ price: price.id }],
        default_payment_method: paymentMethodId || undefined,
        metadata: {
          churchId: subscriptionData.churchId || "",
          personId: subscriptionData.personId || ""
        }
      });

      return { success: true, subscriptionId: subscription.id, data: subscription };
    } catch (error: any) {
      return { success: false, subscriptionId: "", data: { error: error?.message } };
    }
  }

  async updateSubscription(config: GatewayConfig, subscriptionData: any): Promise<SubscriptionResult> {
    try {
      const stripe = this.getClient(config.privateKey);
      const updated = await stripe.subscriptions.update(subscriptionData.id, {
        default_payment_method: subscriptionData.paymentMethodId || undefined,
        metadata: subscriptionData.metadata || {}
      });
      return { success: true, subscriptionId: updated.id, data: updated };
    } catch (error: any) {
      return { success: false, subscriptionId: "", data: { error: error?.message } };
    }
  }

  async cancelSubscription(config: GatewayConfig, subscriptionId: string, _reason?: string): Promise<void> {
    const stripe = this.getClient(config.privateKey);
    await stripe.subscriptions.cancel(subscriptionId);
  }

  // ---------------------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------------------

  async createCustomer(config: GatewayConfig, email: string, name: string): Promise<string> {
    const stripe = this.getClient(config.privateKey);
    const customer = await stripe.customers.create({ email, name });
    return customer.id;
  }

  async getCustomerSubscriptions(config: GatewayConfig, customerId: string): Promise<any> {
    const stripe = this.getClient(config.privateKey);
    const subs = await stripe.subscriptions.list({ customer: customerId, limit: 100 });
    return subs.data;
  }

  async getCustomerPaymentMethods(config: GatewayConfig, customer: any): Promise<any> {
    const stripe = this.getClient(config.privateKey);
    const customerId = typeof customer === "string" ? customer : customer?.stripeCustomerId || customer?.id;
    if (!customerId) throw new Error("Stripe customer id is required");
    const methods = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 100 });
    return methods.data;
  }

  // ---------------------------------------------------------------------------
  // Payment methods
  // ---------------------------------------------------------------------------

  async attachPaymentMethod(config: GatewayConfig, paymentMethodId: string, options: any): Promise<any> {
    const stripe = this.getClient(config.privateKey);
    const customerId = typeof options?.customer === "string" ? options.customer : options?.customer?.stripeCustomerId || options?.customer?.id;
    if (!customerId) throw new Error("Stripe customer id is required to attach a payment method");
    return await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  }

  async detachPaymentMethod(config: GatewayConfig, paymentMethodId: string): Promise<any> {
    const stripe = this.getClient(config.privateKey);
    return await stripe.paymentMethods.detach(paymentMethodId);
  }

  async updateCard(config: GatewayConfig, paymentMethodId: string, cardData: any): Promise<any> {
    const stripe = this.getClient(config.privateKey);
    return await stripe.paymentMethods.update(paymentMethodId, {
      billing_details: {
        name: cardData.name || undefined,
        address: cardData.address || undefined
      }
    });
  }

  // ---------------------------------------------------------------------------
  // ACH / Bank accounts
  // ---------------------------------------------------------------------------

  async createACHSetupIntent(config: GatewayConfig, customerId: string): Promise<any> {
    const stripe = this.getClient(config.privateKey);
    return await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["us_bank_account"],
      payment_method_options: {
        us_bank_account: { financial_connections: { permissions: ["payment_method"] } }
      }
    });
  }

  async createBankAccount(config: GatewayConfig, customerId: string, options: any): Promise<any> {
    const stripe = this.getClient(config.privateKey);
    // Create a payment method from bank account token (from Plaid or manual entry)
    const pm = await stripe.paymentMethods.create({
      type: "us_bank_account",
      us_bank_account: {
        routing_number: options.routingNumber,
        account_number: options.accountNumber,
        account_holder_type: options.accountHolderType || "individual",
        account_type: options.accountType || "checking"
      },
      billing_details: { name: options.accountHolderName || "", email: options.email || "" }
    });
    await stripe.paymentMethods.attach(pm.id, { customer: customerId });
    return pm;
  }

  async updateBank(config: GatewayConfig, paymentMethodId: string, bankData: any, _customerId: string): Promise<any> {
    const stripe = this.getClient(config.privateKey);
    return await stripe.paymentMethods.update(paymentMethodId, {
      billing_details: { name: bankData.accountHolderName || undefined }
    });
  }

  async verifyBank(config: GatewayConfig, paymentMethodId: string, amountData: any, customerId: string): Promise<any> {
    // Stripe micro-deposit verification uses SetupIntents or PaymentIntents
    const stripe = this.getClient(config.privateKey);
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method: paymentMethodId,
      payment_method_types: ["us_bank_account"]
    });
    // Verify the micro-deposits
    return await stripe.setupIntents.verifyMicrodeposits(intent.id, {
      amounts: [amountData.amount1, amountData.amount2]
    });
  }

  async deleteBankAccount(config: GatewayConfig, _customerId: string, bankAccountId: string): Promise<any> {
    const stripe = this.getClient(config.privateKey);
    return await stripe.paymentMethods.detach(bankAccountId);
  }

  // ---------------------------------------------------------------------------
  // SetupIntent (card vaulting)
  // ---------------------------------------------------------------------------

  async createSetupIntent(config: GatewayConfig, customerId?: string): Promise<any> {
    const stripe = this.getClient(config.privateKey);
    return await stripe.setupIntents.create({
      customer: customerId || undefined,
      payment_method_types: ["card"]
    });
  }

  async confirmSetupIntent(config: GatewayConfig, setupIntentId: string, paymentMethodId: string): Promise<any> {
    const stripe = this.getClient(config.privateKey);
    return await stripe.setupIntents.confirm(setupIntentId, { payment_method: paymentMethodId });
  }

  // ---------------------------------------------------------------------------
  // Fees
  // ---------------------------------------------------------------------------

  async calculateFees(amount: number, churchId: string, _currency?: string): Promise<number> {
    let fixedFee = 0.30;
    let percentFee = 0.029;

    if (churchId) {
      try {
        const response = await Axios.get(Environment.membershipApi + "/settings/public/" + churchId);
        const data = response.data;
        if (data?.flatRateCC != null && data.flatRateCC !== "") fixedFee = +data.flatRateCC;
        if (data?.transFeeCC != null && data.transFeeCC !== "") percentFee = +data.transFeeCC / 100;
      } catch {
        // fall back to Stripe defaults
      }
    }

    return Math.round(((amount + fixedFee) / (1 - percentFee) - amount) * 100) / 100;
  }

  // ---------------------------------------------------------------------------
  // Event & donation logging
  // ---------------------------------------------------------------------------

  async logEvent(churchId: string, event: any, eventData: any, givingRepos: any): Promise<void> {
    const eventLog: EventLog = {
      id: event?.id || `stripe_${Date.now()}`,
      churchId,
      customerId: eventData?.customer || "",
      provider: "Stripe",
      eventType: event?.type || "payment",
      status: eventData?.status || "completed",
      message: eventData?.description || "",
      created: new Date((event?.created ?? 0) * 1000 || Date.now())
    };
    await givingRepos.eventLog.create(eventLog);
  }

  async logDonation(config: GatewayConfig, churchId: string, eventData: any, givingRepos: any, _status?: "pending" | "complete"): Promise<any> {
    const amount = (eventData?.amount ?? 0) / 100; // Stripe uses cents
    const customerId = eventData?.customer || "";
    const customerRecord = customerId ? await givingRepos.customer.load(churchId, customerId) : null;
    const personId = customerRecord?.personId || eventData?.metadata?.personId || null;
    const donationDate = new Date((eventData?.created ?? 0) * 1000 || Date.now());
    const branch = extractGivingCampusFromNotes(eventData?.description || "");

    const cardInfo = stripeCardFromPaymentIntentLike(eventData);
    const methodLabel = formatStripeCardBrand(cardInfo?.brand);
    const methodDetails = (cardInfo?.last4 || "").toString().trim() || (eventData?.id || "").toString();

    const batch: DonationBatch = await givingRepos.donationBatch.getOrCreateForOnlineGift(churchId, donationDate, methodLabel, branch);

    const donationData: Donation = {
      batchId: batch.id,
      amount,
      churchId,
      personId,
      method: methodLabel,
      methodDetails,
      donationDate,
      notes: eventData?.description || ""
    };

    const donation = await givingRepos.donation.save(donationData);

    // Fund allocations from metadata
    const funds: FundDonation[] = [];
    try {
      const fundData = eventData?.metadata?.funds ? JSON.parse(eventData.metadata.funds) : [];
      if (Array.isArray(fundData)) {
        fundData.forEach((f: any) => {
          funds.push({ churchId, donationId: donation.id, fundId: f.id, amount: f.amount });
        });
      }
    } catch {
      // ignore
    }

    const promises: Promise<FundDonation>[] = [];
    funds.forEach((fd) => promises.push(givingRepos.fundDonation.save(fd)));
    return Promise.all(promises);
  }
}
