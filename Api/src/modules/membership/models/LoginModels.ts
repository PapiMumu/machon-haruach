// Login-related models
import { Church } from "./Church.js";

export interface LoginRequest {
  email: string;
  password: string;
  appName?: string;
  authGuid?: string;
  jwt?: string;
}

export interface LoginResponse {
  user: any;
  userChurches: LoginUserChurch[];
  token?: string;
  errors?: string[];
  accessStatus?: "active" | "trialing" | "inactive";
  trialEndsAt?: Date | null;
  subscriptionEndsAt?: Date | null;
  subscriptionStatus?: string;
}

export interface LoginUserChurch {
  church: {
    id: string;
    name: string;
    subDomain?: string;
    archivedDate?: Date;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    settings?: any[];
  };
  person?: {
    id: string;
    membershipStatus?: string;
    name?: {
      first: string;
      last: string;
    };
  };
  groups?: Array<{ id: string; [key: string]: any }>;
  apis?: any[];
  jwt?: string;
}

export interface EmailPassword {
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  userEmail: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  appName?: string;
  appUrl?: string;
  /** e.g. output of `Linking.createURL("/auth/set-password")` — used with public admin host to build an Android intent URL */
  mobilePasswordResetBase?: string;
  /** Android applicationId (e.g. church.b1.mobile) for intent:// reset links in email */
  mobileAndroidPackage?: string;
  /** Same base as the mobile app’s Membership API (…/membership) — builds a clickable https handoff URL */
  resetHandoffApiBase?: string;
}

export interface NewPasswordRequest {
  authGuid: string;
  email: string;
  newPassword: string;
}

export interface LoadCreateUserRequest {
  userEmail: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  appName?: string;
  appUrl?: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
}

export interface RegisterUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  churchId?: string;
  appName?: string;
  appUrl?: string;
  mobilePasswordResetBase?: string;
  mobileAndroidPackage?: string;
  resetHandoffApiBase?: string;
}

export interface ActivateSubscriptionRequest {
  email: string;
  password: string;
}

export interface RegistrationRequest {
  churchName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  subDomain?: string;
}

export interface RegisterChurchRequest extends Church {
  appName?: string;
  appUrl?: string;
}
