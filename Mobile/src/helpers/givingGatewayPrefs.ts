import AsyncStorage from "@react-native-async-storage/async-storage";

function ecoCashPhoneKey(churchId: string, personId: string) {
  return `giving:ecocashPhone:${churchId}:${personId}`;
}

function paynowPreferredKey(churchId: string, personId: string) {
  return `giving:preferPaynow:${churchId}:${personId}`;
}

function paynowSetupKey(churchId: string, personId: string) {
  return `giving:paynowSetup:${churchId}:${personId}`;
}

function savedMethodChoiceKey(churchId: string, personId: string) {
  return `giving:savedMethodChoice:${churchId}:${personId}`;
}

/** Prefix for Stripe payment method id, e.g. `stripe:pm_abc`. */
export const SAVED_METHOD_STRIPE_PREFIX = "stripe:" as const;

export interface PaynowSetupData {
  preferredMethod?: "card" | "bank";
  cardNetwork?: "vmc" | "zimswitch";
  cardName?: string;
  cardEmail?: string;
  cardPhone?: string;
  bankName?: string;
  bankAccountName?: string;
  bankEmail?: string;
  bankPhone?: string;
}

export async function loadEcoCashPhone(churchId: string, personId: string): Promise<string> {
  if (!churchId || !personId) return "";
  try {
    return (await AsyncStorage.getItem(ecoCashPhoneKey(churchId, personId))) || "";
  } catch {
    return "";
  }
}

export async function saveEcoCashPhone(churchId: string, personId: string, phone: string): Promise<void> {
  if (!churchId || !personId) return;
  await AsyncStorage.setItem(ecoCashPhoneKey(churchId, personId), phone.trim());
}

export async function clearEcoCashPhone(churchId: string, personId: string): Promise<void> {
  if (!churchId || !personId) return;
  await AsyncStorage.removeItem(ecoCashPhoneKey(churchId, personId));
}

export async function loadPaynowPreferred(churchId: string, personId: string): Promise<boolean> {
  if (!churchId || !personId) return false;
  try {
    return (await AsyncStorage.getItem(paynowPreferredKey(churchId, personId))) === "1";
  } catch {
    return false;
  }
}

export async function savePaynowPreferred(churchId: string, personId: string, preferred: boolean): Promise<void> {
  if (!churchId || !personId) return;
  await AsyncStorage.setItem(paynowPreferredKey(churchId, personId), preferred ? "1" : "0");
}

export async function loadPaynowSetup(churchId: string, personId: string): Promise<PaynowSetupData> {
  if (!churchId || !personId) return {};
  try {
    const raw = await AsyncStorage.getItem(paynowSetupKey(churchId, personId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object") ? parsed as PaynowSetupData : {};
  } catch {
    return {};
  }
}

export async function savePaynowSetup(churchId: string, personId: string, data: PaynowSetupData): Promise<void> {
  if (!churchId || !personId) return;
  await AsyncStorage.setItem(paynowSetupKey(churchId, personId), JSON.stringify(data || {}));
}

export async function clearPaynowSetup(churchId: string, personId: string): Promise<void> {
  if (!churchId || !personId) return;
  await AsyncStorage.removeItem(paynowSetupKey(churchId, personId));
}

export async function loadSavedMethodChoice(churchId: string, personId: string): Promise<string> {
  if (!churchId || !personId) return "";
  try {
    return (await AsyncStorage.getItem(savedMethodChoiceKey(churchId, personId))) || "";
  } catch {
    return "";
  }
}

export async function saveSavedMethodChoice(churchId: string, personId: string, key: string): Promise<void> {
  if (!churchId || !personId || !key) return;
  await AsyncStorage.setItem(savedMethodChoiceKey(churchId, personId), key);
}
