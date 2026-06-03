import { PersonHelper as BasePersonhelper } from "@machonharuach/apphelper";
import type { PersonInterface } from "@machonharuach/helpers";

export class PersonHelper extends BasePersonhelper {
  static person: PersonInterface;
}
