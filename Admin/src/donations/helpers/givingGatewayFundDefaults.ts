import type { FundInterface } from "@machonharuach/helpers";

/** Row from DB/API — editable in admin. */
export type GivingFundCatalogRow = FundInterface & { isGatewayCatalog?: boolean };

/**
 * Default fund ids/names used by mobile giving and gateways (EcoCash, Donorbox, etc.)
 * when no rows exist in the `funds` table. Matches Mobile `fundDefaults`.
 */
export const GIVING_GATEWAY_FUND_DEFAULTS: GivingFundCatalogRow[] = [
  { id: "tithe", name: "Tithe", taxDeductible: true, isGatewayCatalog: true },
  { id: "seed", name: "Seed", taxDeductible: true, isGatewayCatalog: true },
  { id: "offering", name: "Offering", taxDeductible: true, isGatewayCatalog: true },
  { id: "new-locations", name: "New Locations", taxDeductible: true, isGatewayCatalog: true },
  { id: "local-global-missions", name: "Local & Global Missions", taxDeductible: true, isGatewayCatalog: true },
  { id: "nextgen", name: "NextGen", taxDeductible: true, isGatewayCatalog: true },
  { id: "free-resources", name: "Free Resources", taxDeductible: true, isGatewayCatalog: true }
];

export function isGatewayCatalogFund(f: FundInterface): boolean {
  return (f as GivingFundCatalogRow).isGatewayCatalog === true;
}

export function copyGatewayFundCatalogFallback(): GivingFundCatalogRow[] {
  return GIVING_GATEWAY_FUND_DEFAULTS.map((row) => ({ ...row }));
}
