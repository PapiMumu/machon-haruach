import axios from "axios";
import type {
  AddSubscriberOptions,
  ITextingProvider,
  ListsResult,
  ProviderCapabilities,
  SubscriberResult,
  TextingProviderConfig,
  TextingSendResult
} from "@machonharuach/texting";

const TWILIO_API = "https://api.twilio.com/2010-04-01";

/** Normalize to E.164 when possible (expects +countryCode…). */
export function normalizePhoneNumber(phone: string): string {
  const trimmed = (phone || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return "+" + trimmed.slice(1).replace(/\D/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  // Zimbabwe local: 077… / 071… → +263…
  if (digits.startsWith("0") && digits.length >= 9 && digits.length <= 10) {
    return "+263" + digits.slice(1);
  }
  return "+" + digits;
}

export class TwilioProvider implements ITextingProvider {
  readonly name = "Twilio";
  readonly capabilities: ProviderCapabilities = { addSubscriber: false, getLists: false };

  private getAuth(config: TextingProviderConfig) {
    const accountSid = config.apiKey?.trim();
    const authToken = config.apiSecret?.trim();
    if (!accountSid || !authToken) {
      throw new Error("Twilio Account SID and Auth Token are required");
    }
    return {
      accountSid,
      authToken,
      header: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64")
    };
  }

  private getFrom(config: TextingProviderConfig): string {
    const from = config.fromNumber?.trim();
    if (!from) throw new Error("Twilio From number or sender ID is required");
    return from;
  }

  private async createMessage(
    config: TextingProviderConfig,
    to: string,
    message: string
  ): Promise<TextingSendResult> {
    const { accountSid, header } = this.getAuth(config);
    const normalizedTo = normalizePhoneNumber(to);
    if (!normalizedTo) {
      return { success: false, error: "Invalid phone number" };
    }

    try {
      const params = new URLSearchParams();
      params.append("To", normalizedTo);
      params.append("From", this.getFrom(config));
      params.append("Body", message);

      const response = await axios.post(
        `${TWILIO_API}/Accounts/${accountSid}/Messages.json`,
        params,
        { headers: { Authorization: header, "Content-Type": "application/x-www-form-urlencoded" } }
      );

      return {
        success: true,
        providerMessageId: response.data?.sid
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return {
        success: false,
        error: err.response?.data?.message || err.message || "Twilio send failed"
      };
    }
  }

  async sendMessage(config: TextingProviderConfig, to: string, message: string): Promise<TextingSendResult> {
    return this.createMessage(config, to, message);
  }

  async sendBulk(config: TextingProviderConfig, recipients: string[], message: string): Promise<TextingSendResult[]> {
    const results: TextingSendResult[] = [];
    const batchSize = 5;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((to) => this.createMessage(config, to, message)));
      results.push(...batchResults);
    }
    return results;
  }

  async validateCredentials(config: TextingProviderConfig): Promise<boolean> {
    try {
      const { accountSid, header } = this.getAuth(config);
      const response = await axios.get(`${TWILIO_API}/Accounts/${accountSid}.json`, {
        headers: { Authorization: header }
      });
      return response.status === 200 && response.data?.status !== "closed";
    } catch {
      return false;
    }
  }

  async addSubscriber(
    _config: TextingProviderConfig,
    _mobileNumber: string,
    _options?: AddSubscriberOptions
  ): Promise<SubscriberResult> {
    return { success: false, error: "Twilio does not support adding subscribers via API in this integration" };
  }

  async getLists(_config: TextingProviderConfig): Promise<ListsResult> {
    return { success: false, error: "Twilio does not support listing via API in this integration" };
  }
}
