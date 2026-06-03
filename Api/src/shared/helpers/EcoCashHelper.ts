import Axios from "axios";

export type EcoCashMode = "sandbox" | "live";

export interface EcoCashPaymentRequest {
  customerMsisdn: string;
  amount: number;
  reason: string;
  currency: string;
  sourceReference: string;
}

export interface EcoCashLookupRequest {
  sourceMobileNumber: string;
  sourceReference: string;
}

export class EcoCashHelper {
  static readonly baseUrl = "https://developers.ecocash.co.zw/api/ecocash_pay";

  private static getPaymentUrl(mode: EcoCashMode): string {
    return `${this.baseUrl}/api/v2/payment/instant/c2b/${mode}`;
  }

  private static getLookupUrl(mode: EcoCashMode): string {
    return `${this.baseUrl}/api/v1/transaction/c2b/status/${mode}`;
  }

  static async makePayment(apiKey: string, mode: EcoCashMode, request: EcoCashPaymentRequest): Promise<any> {
    const response = await Axios.post(this.getPaymentUrl(mode), request, {
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey
      }
    });
    return response.data;
  }

  static async lookupTransaction(apiKey: string, mode: EcoCashMode, request: EcoCashLookupRequest): Promise<any> {
    const response = await Axios.post(this.getLookupUrl(mode), request, {
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey
      }
    });
    return response.data;
  }
}

