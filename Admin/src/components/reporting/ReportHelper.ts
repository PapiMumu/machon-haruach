import { DateHelper } from "@machonharuach/apphelper";
import type { ColumnInterface } from "@machonharuach/helpers";

export class ReportHelper {
  static getField = (column: ColumnInterface, dataRow: any) => {
    let result = "";
    try {
      result = dataRow[column.value]?.toString() || "";
    } catch {
      //do nothing
    }

    switch (column.formatter) {
      case "date":
        const dt = new Date(result);
        result = DateHelper.prettyDate(dt);
        break;
      case "number":
        try {
          const num = parseFloat(result);
          result = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        } catch {
          //do nothing
        }
        break;
      case "dollars":
        try {
          const num = parseFloat(result);
          const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
          result = usd.format(num).replace(".00", "");
        } catch {
          //do nothing
        }
        break;
    }
    return result;
  };
}
