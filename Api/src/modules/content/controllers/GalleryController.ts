import { FileStorageHelper } from "@machonharuach/apihelper";
import express from "express";
import { controller, httpDelete, httpGet, httpPost, requestParam } from "inversify-express-utils";
import { Environment, Permissions } from "../helpers/index.js";
import { ContentBaseController } from "./ContentBaseController.js";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

@controller("/content/gallery")
export class GalleryController extends ContentBaseController {
  private async createPresignedUpload(key: string) {
    const cleanKey = key.startsWith("/") ? key.substring(1) : key;
    const client = new S3Client({});
    const { url, fields } = await createPresignedPost(client, {
      Bucket: Environment.s3Bucket,
      Key: cleanKey,
      Conditions: [
        ["starts-with", "$Content-Type", ""]
      ],
      Expires: 3600
    });
    return { url, fields, key: cleanKey };
  }

  @httpGet("/stock/:folder")
  public async getStock(@requestParam("folder") folder: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const files = await FileStorageHelper.list("stockPhotos/" + folder);
      return { images: files };
    });
  }

  @httpGet("/:folder")
  public async getAll(@requestParam("folder") folder: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.content.edit)) return this.json({}, 401);
      else {
        const files = await FileStorageHelper.list(au.churchId + "/gallery/" + folder);
        return { images: files };
      }
    });
  }

  @httpPost("/requestUpload")
  public async getUploadUrl(req: express.Request<{}, {}, { folder: string; fileName: string }>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.content.edit)) return this.json({}, 401);
      if (Environment.fileStore !== "S3") {
        return this.json({ error: "Gallery upload requires S3 file storage (FILE_STORE=S3)." }, 503);
      }
      const key = au.churchId + "/gallery/" + req.body.folder + "/" + req.body.fileName;
      return await this.createPresignedUpload(key);
    });
  }

  /** Upload via API (avoids S3 CORS from browser). Prefer this over presigned POST for admin gallery uploads. */
  @httpPost("/uploadImage")
  public async uploadImage(
    req: express.Request<{}, {}, { folder?: string; fileName?: string; fileContents?: string; fileType?: string }>,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.content.edit)) return this.json({}, 401);

      const folder = String(req.body?.folder || "").trim();
      const fileName = String(req.body?.fileName || "").trim();
      const fileContents = String(req.body?.fileContents || "");
      if (!folder || !fileName || !fileContents) {
        return this.json({ error: "folder, fileName, and fileContents are required" }, 400);
      }

      const cleanKey = `${au.churchId}/gallery/${folder}/${fileName}`.replace(/^\/+/, "");
      const base64 = fileContents.includes(",") ? fileContents.split(",")[1] : fileContents;
      const buffer = Buffer.from(base64, "base64");
      if (!buffer.length) return this.json({ error: "Invalid image data" }, 400);

      const fileType = String(req.body?.fileType || "image/jpeg");
      await FileStorageHelper.store(cleanKey, fileType, buffer);

      const root = (Environment.contentRoot || "").replace(/\/$/, "");
      const url = root ? `${root}/${cleanKey}` : cleanKey;
      return { key: cleanKey, url };
    });
  }

  @httpDelete("/:folder/:image")
  public async delete(@requestParam("folder") folder: string, @requestParam("image") image: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.content.edit)) return this.json({}, 401);
      else {
        await FileStorageHelper.remove(au.churchId + "/gallery/" + folder + "/" + image);
        return this.json({});
      }
    });
  }
}
