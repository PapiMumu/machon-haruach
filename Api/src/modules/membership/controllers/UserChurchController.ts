import { controller, httpDelete, httpGet, httpPatch, httpPost, requestParam } from "inversify-express-utils";
import express from "express";
import { MembershipBaseController } from "./MembershipBaseController.js";
import { UserChurch } from "../models/index.js";
import { Permissions } from "../helpers/index.js";

@controller("/membership/userchurch")
export class UserChurchController extends MembershipBaseController {
  @httpPatch("/:userId")
  public async update(@requestParam("userId") userId: string, req: express.Request, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async () => {
      const { churchId, appName } = req.body;
      await this.repos.accessLog.create({ appName: appName || "", churchId, userId });
      const existing = await this.repos.userChurch.loadByUserId(userId, churchId);
      if (!existing) {
        return this.json({ message: "No church found for user" }, 400);
      } else {
        const existingUserChurch = existing as UserChurch;
        const updatedUserChrurch: UserChurch = {
          id: existingUserChurch?.id,
          userId,
          personId: existingUserChurch.personId,
          churchId,
          lastAccessed: new Date()
        };
        await this.repos.userChurch.save(updatedUserChrurch);
      }
      return existing;
    });
  }

  @httpPost("/")
  public async save(req: express.Request<{}, {}, UserChurch, { userId: string }>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const userId = req.query.userId || au.id;
      const record = await this.repos.userChurch.loadByUserId(userId, au.churchId);
      let result: any = {};
      if (record) {
        const userChurchRecord = record as UserChurch;
        if (userChurchRecord.userId !== userId) return this.json({ message: "User already has a linked person record" }, 400);
      } else {
        const userChurch: UserChurch = {
          userId,
          churchId: au.churchId,
          personId: req.body.personId
        };
        const data = await this.repos.userChurch.save(userChurch);
        result = this.repos.userChurch.convertToModel(au.churchId, data);
      }
      return result;
    });
  }

  @httpGet("/userid/:userId")
  public async getByUserId(@requestParam("userId") userId: string, req: express.Request, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async ({ churchId }) => {
      const record = await this.repos.userChurch.loadByUserId(userId, churchId);
      return this.repos.userChurch.convertToModel(churchId, record);
    });
  }

  @httpGet("/personid/:personId")
  public async getByPersonId(@requestParam("personId") personId: string, req: express.Request, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async ({ churchId }) => {
      const record = await this.repos.userChurch.loadByPersonId(personId, churchId);
      if (!record) return null;
      return {
        email: record.email,
        subscriptionStatus: record.subscriptionStatus || "active",
        trialEndsAt: record.trialEndsAt || null,
        subscriptionEndsAt: record.subscriptionEndsAt || null
      };
    });
  }

  @httpGet("/user/:userId")
  public async loadForUser(@requestParam("userId") userId: string, req: express.Request, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.server.admin)) return this.json({}, 401);

      const userChurches = await this.repos.userChurch.loadForUser(userId);
      return this.json(userChurches, 200);
    });
  }

  @httpPost("/byPersonIds")
  public async loadByPersonIds(req: express.Request<{}, {}, { personIds: string[] }>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async ({ churchId }) => {
      const personIds = Array.isArray(req.body?.personIds) ? req.body.personIds.filter((id) => typeof id === "string" && id.length > 0) : [];
      if (personIds.length === 0) return this.json([], 200);
      const records = await this.repos.userChurch.loadByPersonIds(personIds, churchId);
      return this.json(records.map((r: any) => ({
        personId: r.personId,
        email: r.email,
        subscriptionStatus: r.subscriptionStatus || "active",
        trialEndsAt: r.trialEndsAt || null,
        subscriptionEndsAt: r.subscriptionEndsAt || null,
        firstAccessApp: r.firstAccessApp || null
      })), 200);
    });
  }

  @httpDelete("/record/:userId/:churchId/:personId")
  public async deleteRecord(
    @requestParam("userId") userId: string,
    @requestParam("churchId") churchId: string,
    @requestParam("personId") personId: string,
      req: express.Request,
      res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (_au) => {
      await this.repos.userChurch.deleteRecord(userId, churchId, personId);
      return this.json({});
    });
  }
}
