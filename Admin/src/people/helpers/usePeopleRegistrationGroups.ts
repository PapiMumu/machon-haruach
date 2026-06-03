import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiHelper } from "@machonharuach/apphelper";
import { type PersonInterface } from "@machonharuach/helpers";
import { getPersonRegistrationSource, type RegistrationSource } from "./registrationSource";

export interface PersonSubscriptionInfo {
  personId: string;
  email?: string;
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  firstAccessApp?: string | null;
}

export function usePeopleRegistrationGroups(people: PersonInterface[]) {
  const [registrationTab, setRegistrationTab] = useState<RegistrationSource>("mobile");
  const [subscriptionByPersonId, setSubscriptionByPersonId] = useState<Record<string, PersonSubscriptionInfo>>({});

  useEffect(() => {
    const personIds = (people || []).map((p) => p.id).filter((id): id is string => !!id);
    if (personIds.length === 0) {
      setSubscriptionByPersonId({});
      return;
    }
    ApiHelper.post("/userchurch/byPersonIds", { personIds }, "MembershipApi")
      .then((rows: PersonSubscriptionInfo[]) => {
        const map: Record<string, PersonSubscriptionInfo> = {};
        (rows || []).forEach((r) => {
          if (r.personId) map[r.personId] = r;
        });
        setSubscriptionByPersonId(map);
      })
      .catch(() => setSubscriptionByPersonId({}));
  }, [people]);

  const getRegistrationSource = useCallback(
    (person: PersonInterface): RegistrationSource => {
      const account = person.id ? subscriptionByPersonId[person.id] : undefined;
      return getPersonRegistrationSource(person, !!account, account?.firstAccessApp);
    },
    [subscriptionByPersonId]
  );

  const registrationCounts = useMemo(() => {
    let mobile = 0;
    let admin = 0;
    (people || []).forEach((p) => {
      if (getRegistrationSource(p) === "mobile") mobile++;
      else admin++;
    });
    return { mobile, admin };
  }, [people, getRegistrationSource]);

  const mobileSubscriptionSummary = useMemo(() => {
    let active = 0;
    let inactive = 0;
    (people || []).forEach((p) => {
      if (getRegistrationSource(p) !== "mobile") return;
      const sub = (subscriptionByPersonId[p.id || ""]?.subscriptionStatus || "none").toLowerCase();
      if (sub === "active" || sub === "trialing") active++;
      else if (sub === "inactive") inactive++;
    });
    return {
      registered: registrationCounts.mobile,
      active,
      inactive
    };
  }, [people, getRegistrationSource, subscriptionByPersonId, registrationCounts.mobile]);

  return {
    registrationTab,
    setRegistrationTab,
    registrationCounts,
    mobileSubscriptionSummary,
    subscriptionByPersonId,
    getRegistrationSource
  };
}
