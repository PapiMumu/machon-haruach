import { injectable } from "inversify";
import { TypedDB } from "../../../shared/infrastructure/TypedDB.js";
import { Gateway } from "../models/index.js";

import { ConfiguredRepo, RepoConfig } from "../../../shared/infrastructure/ConfiguredRepo.js";

@injectable()
export class GatewayRepo extends ConfiguredRepo<Gateway> {
  protected get repoConfig(): RepoConfig<Gateway> {
    return {
      tableName: "gateways",
      hasSoftDelete: false,
      columns: [
        "provider", "publicKey", "privateKey", "webhookKey", "productId", "payFees", "currency", "settings", "environment"
      ]
    };
  }

  // Override create to assign an id before insert. Multiple gateways per church are supported
  // (Stripe + EcoCash + Paynow, etc.); do not delete sibling rows — that removed other providers
  // whenever a new gateway was saved without an id (e.g. adding EcoCash wiped Stripe).
  protected async create(gateway: Gateway): Promise<Gateway> {
    gateway.id = this.createId();
    const sql = "INSERT INTO gateways (id, churchId, provider, publicKey, privateKey, webhookKey, productId, payFees, currency, settings, environment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
    const settings = gateway.settings ? JSON.stringify(gateway.settings) : null;
    const params = [
      gateway.id, gateway.churchId, gateway.provider, gateway.publicKey, gateway.privateKey, gateway.webhookKey, gateway.productId, gateway.payFees, gateway.currency, settings, gateway.environment
    ];
    await TypedDB.query(sql, params);
    return gateway;
  }

  protected async update(gateway: Gateway): Promise<Gateway> {
    const sql =
      "UPDATE gateways SET provider=?, publicKey=?, privateKey=?, webhookKey=?, productId=?, payFees=?, currency=?, settings=?, environment=? WHERE id=? AND churchId=?";
    const settings = gateway.settings ? JSON.stringify(gateway.settings) : null;
    const params = [
      gateway.provider,
      gateway.publicKey,
      gateway.privateKey,
      gateway.webhookKey,
      gateway.productId,
      gateway.payFees,
      gateway.currency,
      settings,
      gateway.environment,
      gateway.id,
      gateway.churchId
    ];
    await TypedDB.query(sql, params);
    return gateway;
  }

  protected rowToModel(data: any): Gateway {
    return {
      id: data.id,
      churchId: data.churchId,
      provider: data.provider,
      publicKey: data.publicKey,
      privateKey: data.privateKey,
      webhookKey: data.webhookKey,
      productId: data.productId,
      payFees: data.payFees,
      currency: data.currency,
      settings: this.parseJson(data.settings),
      environment: data.environment,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  public convertToModel(_churchId: string, data: any) {
    const model = this.rowToModel(data);
    // Strip sensitive fields - privateKey/webhookKey should never be returned to clients
    const { privateKey: _privateKey, webhookKey: _webhookKey, ...safeModel } = model;
    return safeModel;
  }

  public convertAllToModel(churchId: string, data: any) {
    return data.map((row: any) => this.convertToModel(churchId, row));
  }

  public async loadByProvider(provider: string): Promise<Gateway[]> {
    const sql = "SELECT * FROM gateways WHERE LOWER(provider) = LOWER(?);";
    return this.mapToModels(await TypedDB.query(sql, [provider]));
  }

  private parseJson(value: unknown) {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value as Record<string, unknown>;
  }
}
