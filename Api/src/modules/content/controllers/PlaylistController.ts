import { controller, httpPost, httpGet, requestParam } from "inversify-express-utils";
import express from "express";
import { Playlist } from "../models/index.js";
import { ContentCrudController } from "./ContentCrudController.js";
import { Permissions } from "../../../shared/helpers/index.js";
import { Environment } from "../helpers/index.js";
import { FileStorageHelper } from "@machonharuach/apihelper";

@controller("/content/playlists")
export class PlaylistController extends ContentCrudController {
  protected crudSettings = {
    repoKey: "playlist",
    permissions: { view: null, edit: Permissions.streamingServices.edit },
    routes: ["getById", "getAll", "delete"] as const
  };
  @httpGet("/public/:churchId")
  public async loadPublicAll(@requestParam("churchId") churchId: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const type = req.query?.type?.toString();
      const playlistType = type === "music" || type === "video" ? type : undefined;
      return await this.repos.playlist.loadPublicAll(churchId, playlistType);
    });
  }

  @httpGet("/:playlistId/songs/public/:churchId")
  public async loadPublicSongs(
    @requestParam("playlistId") playlistId: string,
    @requestParam("churchId") churchId: string,
    req: express.Request<{}, {}, null>,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const playlist = await this.repos.playlist.load(churchId, playlistId);
      if (!playlist?.id || (playlist.playlistType || "video") !== "music") return [];
      return await this.repos.playlistSong.loadPublicForPlaylist(churchId, playlistId);
    });
  }

  @httpGet("/:playlistId/songs")
  public async loadSongs(@requestParam("playlistId") playlistId: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      return await this.repos.playlistSong.loadForPlaylist(au.churchId, playlistId);
    });
  }

  @httpPost("/:playlistId/songs")
  public async saveSongs(
    @requestParam("playlistId") playlistId: string,
    req: express.Request<{}, {}, { songDetailIds?: string[] }>,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.streamingServices.edit)) return this.json({}, 401);
      const playlist = await this.repos.playlist.load(au.churchId, playlistId);
      if (!playlist?.id) return this.json({ error: "Playlist not found" }, 404);
      const ids = Array.isArray(req.body?.songDetailIds) ? req.body.songDetailIds : [];
      await this.repos.playlistSong.replaceForPlaylist(au.churchId, playlistId, ids);
      return await this.repos.playlistSong.loadForPlaylist(au.churchId, playlistId);
    });
  }

  @httpPost("/")
  public async save(req: express.Request<{}, {}, Playlist[]>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.streamingServices.edit)) return this.json({}, 401);
      else {
        let playlists: Playlist[] = req.body;
        const promises: Promise<Playlist>[] = [];
        // playlist.forEach((s) => { if (s.churchId === au.churchId) promises.push(this.repos.playlist.save(s)); });

        for (const p of playlists) {
          let base64Photo = "";
          if (p.thumbnail && p.thumbnail.startsWith("data:image/png;base64,")) {
            base64Photo = p.thumbnail;
            p.thumbnail = "";
          }
          if (p.churchId === au.churchId) {
            promises.push(
              this.repos.playlist.save(p).then(async (playlist: Playlist) => {
                if (base64Photo) {
                  playlist.thumbnail = base64Photo;
                  await this.savePhoto(au.churchId, playlist);
                }
                return playlist;
              })
            );
          }
        }

        playlists = await Promise.all(promises);
        if (!playlists.length) return this.json({ error: "No playlists saved" }, 400);
        return this.json(playlists, 200);
      }
    });
  }

  @httpPost("/sort")
  public async updateSort(req: express.Request<{}, {}, { ids?: string[] }>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.streamingServices.edit)) return this.json({}, 401);
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
      if (ids.length) await this.repos.playlist.updateSortOrder(au.churchId, ids);
      return { success: true };
    });
  }

  private async savePhoto(churchId: string, playlist: Playlist) {
    const base64 = playlist.thumbnail.split(",")[1];
    const key = "/" + churchId + "/streamingLive/playlists/" + playlist.id + ".png";

    return FileStorageHelper.store(key, "image/png", Buffer.from(base64, "base64")).then(async () => {
      const photoUpdated = new Date();
      playlist.thumbnail = Environment.contentRoot + key + "?dt=" + photoUpdated.getTime().toString();
      await this.repos.playlist.save(playlist);
    });
  }
}
