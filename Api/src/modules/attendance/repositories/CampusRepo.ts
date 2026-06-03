import { injectable } from "inversify";
import { ConfiguredRepo, type RepoConfig } from "../../../shared/infrastructure/index.js";
import { Campus } from "../models/index.js";

@injectable()
export class CampusRepo extends ConfiguredRepo<Campus> {
  protected get repoConfig(): RepoConfig<Campus> {
    return {
      tableName: "campuses",
      hasSoftDelete: true,
      defaultOrderBy: "name",
      columns: ["name", "address1", "address2", "city", "state", "zip", "country", "phone"],
      insertLiterals: { removed: "0" }
    };
  }

  /** Return the row as stored in MySQL so API responses match the database (avoids stale/echo-only payloads). */
  protected async create(model: Campus): Promise<Campus> {
    await super.create(model);
    const m = model as Campus;
    const row = await this.loadOne(m.churchId as string, m.id as string);
    return row ? this.rowToModel(row) : this.rowToModel(m);
  }

  protected async update(model: Campus): Promise<Campus> {
    await super.update(model);
    const m = model as Campus;
    const row = await this.loadOne(m.churchId as string, m.id as string);
    return row ? this.rowToModel(row) : this.rowToModel(m);
  }

  protected rowToModel(data: any): Campus {
    const result: Campus = {
      id: data.id,
      name: data.name,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country == null ? "" : String(data.country),
      phone: data.phone == null ? "" : String(data.phone),
      importKey: data.importKey
    };
    return result;
  }
}
