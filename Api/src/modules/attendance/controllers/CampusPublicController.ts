import { controller, httpGet, requestParam } from "inversify-express-utils";
import express from "express";
import { AttendanceBaseController } from "./AttendanceBaseController.js";

/** Public read-only listing for mobile branch picker (same campuses as Admin Attendance). */
const PUBLIC_CHURCH_ID = /^[a-zA-Z0-9_-]{2,64}$/;

@controller("/attendance/public-campuses")
export class CampusPublicController extends AttendanceBaseController {
  @httpGet(":churchId")
  public async listForChurch(@requestParam("churchId") churchId: string, req: express.Request, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const id = String(churchId || "").trim();
      if (!PUBLIC_CHURCH_ID.test(id)) {
        return this.json({ error: "Invalid church id" }, 400);
      }
      const rows = await this.repos.campus.loadAll(id);
      return (rows || []).map((c: any) => ({
        id: c.id,
        name: c.name || "",
        address1: c.address1 || "",
        address2: c.address2 || "",
        city: c.city || "",
        state: c.state || "",
        zip: c.zip || "",
        country: c.country || "",
        phone: c.phone || ""
      }));
    });
  }
}
