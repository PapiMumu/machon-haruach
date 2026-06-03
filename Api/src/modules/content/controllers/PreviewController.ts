import { controller, httpGet, requestParam } from "inversify-express-utils";
import { DateHelper } from "@machonharuach/apihelper";
import { Sermon, StreamingService } from "../models/index.js";
import { StreamingConfigHelper, SubDomainHelper } from "../helpers/index.js";
import { ContentBaseController } from "./ContentBaseController.js";
import { Link } from "../models/index.js";

@controller("/content/preview")
export class PreviewController extends ContentBaseController {
  private async buildPreviewJson(churchId: string) {
    let tabs: Link[] = null;
    let links: Link[] = null;
    let services: StreamingService[] = null;
    let sermons: Sermon[] = null;

    const promises: Promise<any>[] = [];
    promises.push(this.repos.link.loadByCategory(churchId, "streamingTab").then((d) => (tabs = d)));
    promises.push(this.repos.link.loadByCategory(churchId, "streamingLink").then((d) => (links = d)));
    promises.push(this.repos.streamingService.loadAll(churchId).then((d) => (services = d)));
    promises.push(this.repos.sermon.loadAll(churchId).then((d) => (sermons = d)));
    await Promise.all(promises);

    const cutoff = DateHelper.subtractHoursFromNow(6);
    (services || []).forEach((s) => {
      if (!s.recurring || !s.serviceTime) return;
      const serviceTime = new Date(s.serviceTime);
      while (serviceTime < cutoff) serviceTime.setDate(serviceTime.getDate() + 7);
      s.serviceTime = serviceTime;
    });

    return StreamingConfigHelper.generateJson(churchId, tabs, links, services, sermons);
  }

  @httpGet("/data/:key")
  public async loadData(@requestParam("key") key: string, req: any, res: any): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const churchId = await SubDomainHelper.getId(key);
      return this.buildPreviewJson(churchId);
    });
  }

  @httpGet("/church/:churchId")
  public async loadDataByChurch(@requestParam("churchId") churchId: string, req: any, res: any): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => this.buildPreviewJson(churchId));
  }
}
