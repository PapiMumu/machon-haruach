/**
 * Maps Stripe card brand strings to their SVG logo components.
 * SVGs are from https://github.com/aaronfagan/svg-credit-card-payment-icons (flat-rounded style).
 * Usage:
 *   import { getCardLogo } from "@helpers/cardLogos";
 *   const Logo = getCardLogo("visa");
 *   <Logo width={48} height={32} />
 */

import React from "react";
import { SvgProps } from "react-native-svg";

import AmexSvg from "../assets/images/card-amex.svg";
import DinersSvg from "../assets/images/card-diners.svg";
import DiscoverSvg from "../assets/images/card-discover.svg";
import EloSvg from "../assets/images/card-elo.svg";
import GenericSvg from "../assets/images/card-generic.svg";
import HiperSvg from "../assets/images/card-hiper.svg";
import HipercardSvg from "../assets/images/card-hipercard.svg";
import JcbSvg from "../assets/images/card-jcb.svg";
import MaestroSvg from "../assets/images/card-maestro.svg";
import MastercardSvg from "../assets/images/card-mastercard.svg";
import MirSvg from "../assets/images/card-mir.svg";
import PaypalSvg from "../assets/images/card-paypal.svg";
import UnionpaySvg from "../assets/images/card-unionpay.svg";
import VisaSvg from "../assets/images/card-visa.svg";

type SvgComponent = React.FC<SvgProps>;

const brandMap: Record<string, SvgComponent> = {
  visa: VisaSvg,
  mastercard: MastercardSvg,
  amex: AmexSvg,
  "american express": AmexSvg,
  americanexpress: AmexSvg,
  discover: DiscoverSvg,
  diners: DinersSvg,
  "diners club": DinersSvg,
  dinersclub: DinersSvg,
  jcb: JcbSvg,
  unionpay: UnionpaySvg,
  "union pay": UnionpaySvg,
  maestro: MaestroSvg,
  elo: EloSvg,
  mir: MirSvg,
  hiper: HiperSvg,
  hipercard: HipercardSvg,
  paypal: PaypalSvg,
};

/**
 * Returns the SVG logo component for a given card brand name.
 * Falls back to GenericSvg if the brand is not recognised.
 */
export function getCardLogo(brand: string | undefined | null): SvgComponent {
  if (!brand) return GenericSvg;
  return brandMap[brand.toLowerCase().trim()] ?? GenericSvg;
}
