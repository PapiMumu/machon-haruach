import { controller, httpPost, httpGet, requestParam, httpDelete } from "inversify-express-utils";
import express from "express";
import { MembershipCrudController } from "./MembershipCrudController.js";
import { Group } from "../models/index.js";
import { Permissions, UserChurchHelper } from "../helpers/index.js";
import type { AuthenticatedUser } from "../auth/AuthenticatedUser.js";
import { GroupMember } from "../models/index.js";
import { ArrayHelper, SlugHelper } from "@machonharuach/apihelper";

@controller("/membership/groups")
export class GroupController extends MembershipCrudController {
  protected crudSettings = {
    repoKey: "group",
    permissions: { view: null, edit: Permissions.groups.edit },
    routes: ["getById", "getAll"] as const // Custom POST and DELETE implementations below
  };
  @httpGet("/search")
  public async search(req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const campusId = req.query.campusId.toString();
      const serviceId = req.query.serviceId.toString();
      const serviceTimeId = req.query.serviceTimeId.toString();
      return this.repos.group.convertAllToModel(au.churchId, (await this.repos.group.search(au.churchId, campusId, serviceId, serviceTimeId)) as any[]);
    });
  }

  @httpGet("/my/:tag")
  public async getMyTag(@requestParam("tag") tag: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const personId = await UserChurchHelper.resolveAuthPersonId(au as AuthenticatedUser);
      if (!personId) return [];
      const result = this.repos.group.convertAllToModel(au.churchId, (await this.repos.group.loadAllForPerson(personId)) as any[]);
      return result.filter((g) => g.tags.indexOf(tag) > -1);
    });
  }

  @httpGet("/my")
  public async getMy(req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const personId = await UserChurchHelper.resolveAuthPersonId(au as AuthenticatedUser);
      if (!personId) return [];
      // Return every group this user belongs to (cell, standard, youth, etc.).
      // Mobile Groups tab handles its own filtering and should not lose memberships because of tags.
      return this.repos.group.convertAllToModel(au.churchId, (await this.repos.group.loadAllForPerson(personId)) as any[]);
    });
  }

  /**
   * Authenticated user adds themselves to one or more groups in their church (Mobile join flow).
   * Does not require groupMembers.edit — only au.personId is used.
   */
  @httpPost("/join")
  public async joinSelf(req: express.Request<{}, {}, { groupIds?: string[]; groupId?: string }>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const personId = await UserChurchHelper.resolveAuthPersonId(au as AuthenticatedUser);
      if (!personId) return this.json({ error: "No person linked to this account." }, 400);

      const raw = req.body?.groupIds ?? (req.body?.groupId ? [req.body.groupId] : []);
      const groupIds = [...new Set(raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim()))];
      if (groupIds.length === 0) return this.json({ error: "Provide groupId or groupIds." }, 400);

      const saved: GroupMember[] = [];
      for (const gid of groupIds) {
        const row = await this.repos.group.load(au.churchId, gid);
        if (!row) return this.json({ error: `Unknown group: ${gid}` }, 400);
        if (await this.repos.groupMember.hasMembership(au.churchId, gid, personId)) continue;
        const gm: GroupMember = { churchId: au.churchId, groupId: gid, personId, leader: false };
        saved.push(await this.repos.groupMember.save(gm));
      }
      for (const gm of saved) {
        await UserChurchHelper.createForGroupMember(au.churchId!, gm.personId!);
      }

      // Business rule: once a person joins a group, they are considered a church member.
      const person = await this.repos.person.load(au.churchId, personId);
      if (person) {
        const status = (person.membershipStatus || "").toLowerCase();
        if (status !== "member" && status !== "staff") {
          person.membershipStatus = "Member";
          await this.repos.person.save(person);
        }
      }

      return this.repos.groupMember.convertAllToModel(au.churchId, saved);
    });
  }

  @httpGet("/public/:churchId/slug/:slug")
  public async getPublicSlug(@requestParam("churchId") churchId: string, @requestParam("slug") slug: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      return this.repos.group.convertToModel(churchId, await this.repos.group.loadPublicSlug(churchId, slug));
    });
  }

  @httpGet("/public/:churchId/label")
  public async getPublicLabel(@requestParam("churchId") churchId: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const label = req.query.label.toString();
      return this.repos.group.convertAllToModel(churchId, (await this.repos.group.publicLabel(churchId, label)) as any[]);
    });
  }

  @httpGet("/public/:churchId/:id")
  public async getPublic(@requestParam("churchId") churchId: string, @requestParam("id") id: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      return this.repos.group.convertToModel(churchId, await this.repos.group.load(churchId, id));
    });
  }

  @httpGet("/tag/:tag")
  public async getByTag(@requestParam("tag") tag: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      return this.repos.group.convertAllToModel(au.churchId, (await this.repos.group.loadByTag(au.churchId, tag)) as any[]);
    });
  }

  @httpGet("/public/:churchId/tag/:tag")
  public async getPublicByTag(@requestParam("churchId") churchId: string, @requestParam("tag") tag: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      return this.repos.group.convertAllToModel(churchId, (await this.repos.group.loadByTag(churchId, tag)) as any[]);
    });
  }

  // Custom POST implementation (slug generation)
  @httpPost("/")
  public async save(req: express.Request<{}, {}, Group[]>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.groups.edit)) return this.json({}, 401);
      else {
        const promises: Promise<Group>[] = [];
        req.body.forEach((group) => {
          group.churchId = au.churchId;
          if (!group.slug) group.slug = SlugHelper.slugifyString(group.name);
          promises.push(this.repos.group.save(group));
        });
        const result = await Promise.all(promises);
        return this.repos.group.convertAllToModel(au.churchId, result);
      }
    });
  }

  // Custom DELETE implementation (ministry tag handling)
  @httpDelete("/:id")
  public async delete(@requestParam("id") id: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.groups.edit)) return this.json({}, 401);
      else {
        const group: Group = await this.repos.group.load(au.churchId, id);
        if (group.tags.indexOf("ministry") > -1) {
          const AllTeams = (await this.repos.group.loadByTag(au.churchId, "team")) as any[];
          const ministryTeams = ArrayHelper.getAll(AllTeams, "categoryName", id);
          const ids = ArrayHelper.getIds(ministryTeams, "id");
          await this.repos.group.delete(au.churchId, id);
          await this.repos.group.deleteByIds(au.churchId, ids);
          return this.json({});
        } else {
          await this.repos.group.delete(au.churchId, id);
          return this.json({});
        }
      }
    });
  }
}
