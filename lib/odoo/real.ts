import crypto from "crypto";
import {
  AuthUser,
  CreateProjectInput,
  MaintenanceLog,
  MaintenanceStatus,
  OdooService,
  PhotoAttachment,
  PhotoUploadPayload,
  Project,
} from "../types";

interface JsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: {
      name?: string;
      debug?: string;
      message?: string;
      arguments?: unknown[];
    };
  };
}

const META_PREFIX = "<!--MIMAR_SPEC:";
const META_SUFFIX = "-->";

interface EmbeddedSpec {
  workOrderNo?: string;
  projectManager?: string;
  programmer?: string;
  scale?: string;
  deliveryDate?: string;
  baseSize?: string;
  powerConsumption?: string;
}

function encodeSpecInDescription(spec: EmbeddedSpec): string {
  return `${META_PREFIX}${JSON.stringify(spec)}${META_SUFFIX}`;
}

function hydrateProjectSpec(project: Project): Project {
  const desc = typeof project.description === "string" ? project.description : "";
  const startIdx = desc.indexOf(META_PREFIX);
  const endIdx = desc.indexOf(META_SUFFIX);
  if (startIdx !== -1 && endIdx > startIdx) {
    try {
      const jsonStr = desc.slice(startIdx + META_PREFIX.length, endIdx);
      const spec = JSON.parse(jsonStr) as EmbeddedSpec;
      const cleanDesc = (
        desc.slice(0, startIdx) + desc.slice(endIdx + META_SUFFIX.length)
      ).trim();
      return {
        ...project,
        description: cleanDesc,
        x_work_order_no: project.x_work_order_no || spec.workOrderNo || null,
        x_project_manager: project.x_project_manager || spec.projectManager || null,
        x_programmer: project.x_programmer || spec.programmer || null,
        x_scale: project.x_scale || spec.scale || null,
        x_delivery_date: project.x_delivery_date || spec.deliveryDate || null,
        x_base_size: project.x_base_size || spec.baseSize || null,
        x_power_consumption:
          project.x_power_consumption || spec.powerConsumption || null,
      };
    } catch {
      return project;
    }
  }
  return project;
}

export class RealOdooService implements OdooService {
  private url: string;
  private db: string;
  private robotLogin: string;
  private robotApiKey: string;
  private robotUid: number | null = null;
  private supportedCustomFields: Set<string> | null = null;

  constructor() {
    this.url = (process.env.ODOO_URL || "http://localhost:8069").replace(/\/+$/, "");
    this.db = process.env.ODOO_DB || "odoo";
    this.robotLogin =
      process.env.ODOO_ROBOT_LOGIN || process.env.ODOO_USER || "admin";
    this.robotApiKey =
      process.env.ODOO_ROBOT_API_KEY || process.env.ODOO_API_KEY || "admin";
  }

  private async jsonRpcCall<T>(
    service: string,
    method: string,
    args: unknown[],
    timeoutMs = 15000
  ): Promise<T> {
    const endpoint = `${this.url}/jsonrpc`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "call",
          params: {
            service,
            method,
            args,
          },
          id: Math.floor(Math.random() * 100000),
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Odoo server returned HTTP status ${response.status}: ${response.statusText}`
        );
      }

      const data = (await response.json()) as JsonRpcResponse<T>;

      if (data.error) {
        const errorDetail =
          data.error.data?.message ||
          data.error.data?.name ||
          data.error.message ||
          "Unknown Odoo Error";
        console.error("[Odoo RPC Server Error]:", data.error);
        throw new Error(`Odoo API Error: ${errorDetail}`);
      }

      return data.result as T;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `Connection to Odoo timed out (${timeoutMs / 1000}s). Please verify Odoo server status or VPN connection.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getRobotUid(): Promise<number> {
    if (this.robotUid) return this.robotUid;

    const uid = await this.jsonRpcCall<number | false>("common", "authenticate", [
      this.db,
      this.robotLogin,
      this.robotApiKey,
      {},
    ]);

    if (!uid || typeof uid !== "number") {
      throw new Error(
        `Failed to authenticate robot account "${this.robotLogin}". Check ODOO_ROBOT_LOGIN and ODOO_ROBOT_API_KEY.`
      );
    }

    this.robotUid = uid;
    return uid;
  }

  private async executeKw<T>(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {}
  ): Promise<T> {
    const uid = await this.getRobotUid();
    return await this.jsonRpcCall<T>("object", "execute_kw", [
      this.db,
      uid,
      this.robotApiKey,
      model,
      method,
      args,
      kwargs,
    ]);
  }

  private async getProjectFields(): Promise<string[]> {
    const baseFields = [
      "id",
      "name",
      "partner_id",
      "user_id",
      "stage_id",
      "date_start",
      "date",
      "description",
      "x_qr_token",
    ];
    const optionalCustom = [
      "x_work_order_no",
      "x_project_manager",
      "x_programmer",
      "x_scale",
      "x_delivery_date",
      "x_base_size",
      "x_power_consumption",
    ];

    if (!this.supportedCustomFields) {
      try {
        const found = await this.executeKw<Array<{ name: string }>>(
          "ir.model.fields",
          "search_read",
          [
            [
              ["model", "=", "project.project"],
              ["name", "in", optionalCustom],
            ],
          ],
          { fields: ["name"] }
        );
        this.supportedCustomFields = new Set((found || []).map((f) => f.name));
      } catch {
        this.supportedCustomFields = new Set();
      }
    }

    return [
      ...baseFields,
      ...optionalCustom.filter((f) => this.supportedCustomFields?.has(f)),
    ];
  }

  async authenticateUser(login: string, password: string): Promise<AuthUser | null> {
    const userLogin = login.trim();

    const userUid = await this.jsonRpcCall<number | false>(
      "common",
      "authenticate",
      [this.db, userLogin, password, {}],
      10000
    );

    if (!userUid || typeof userUid !== "number") {
      return null;
    }

    const userRecords = await this.executeKw<Array<{
      id: number;
      name: string;
      login: string;
      groups_id: number[];
    }>>(
      "res.users",
      "read",
      [[userUid]],
      { fields: ["id", "name", "login", "groups_id"] }
    );

    if (!userRecords || userRecords.length === 0) {
      throw new Error("Could not retrieve user details from Odoo.");
    }

    const userRecord = userRecords[0];
    const groupIds = userRecord.groups_id || [];

    const userGroups =
      groupIds.length > 0
        ? await this.executeKw<Array<{ id: number; name: string; full_name?: string }>>(
            "res.groups",
            "read",
            [groupIds],
            { fields: ["id", "name", "full_name"] }
          )
        : [];

    const isMemberOfGroup = (targetGroupName: string): boolean => {
      const target = targetGroupName.toLowerCase().trim();
      return userGroups.some((g) => {
        const gName = (g.name || "").toLowerCase().trim();
        const gFull = (g.full_name || "").toLowerCase().trim();
        return gName === target || gFull === target || gFull.includes(target);
      });
    };

    const hasUserGroup = isMemberOfGroup("QR App Users");
    const hasAdminGroup = isMemberOfGroup("QR App Admins");

    if (!hasUserGroup && !hasAdminGroup) {
      throw new Error(
        "Access denied: You must be a member of the 'QR App Users' group in Odoo to use this application."
      );
    }

    return {
      uid: userUid,
      name: userRecord.name || userLogin,
      login: userRecord.login || userLogin,
      isAdmin: hasAdminGroup,
    };
  }

  async getProjectByToken(token: string): Promise<Project | null> {
    if (!token) return null;
    const cleanToken = token.trim();

    try {
      const fields = await this.getProjectFields();
      const projects = await this.executeKw<Project[]>(
        "project.project",
        "search_read",
        [[["x_qr_token", "=", cleanToken]]],
        {
          fields,
          limit: 1,
        }
      );

      return projects && projects.length > 0
        ? hydrateProjectSpec(projects[0])
        : null;
    } catch (err) {
      console.error("[RealOdooService getProjectByToken error]:", err);
      throw err;
    }
  }

  async listProjects(): Promise<Project[]> {
    try {
      const fields = await this.getProjectFields();
      const projects = await this.executeKw<Project[]>(
        "project.project",
        "search_read",
        [[]],
        {
          fields,
          limit: 200,
          order: "id desc",
        }
      );

      return (projects || []).map(hydrateProjectSpec);
    } catch (err) {
      console.error("[RealOdooService listProjects error]:", err);
      throw err;
    }
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    try {
      await this.getProjectFields();
      const rawUuid = crypto.randomUUID().replace(/-/g, "");
      const token = input.generateQr ? `pqr_${rawUuid.slice(0, 20)}` : false;

      const spec: EmbeddedSpec = {
        workOrderNo: input.workOrderNo.trim(),
        projectManager: input.projectManager.trim(),
        programmer: input.programmer.trim(),
        scale: input.scale.trim(),
        deliveryDate: input.deliveryDate.trim(),
        baseSize: input.baseSize.trim(),
        powerConsumption: input.powerConsumption.trim(),
      };

      const createPayload: Record<string, unknown> = {
        name: input.name.trim(),
        description: encodeSpecInDescription(spec),
      };

      if (token) {
        createPayload.x_qr_token = token;
      }

      if (this.supportedCustomFields?.has("x_work_order_no"))
        createPayload.x_work_order_no = spec.workOrderNo;
      if (this.supportedCustomFields?.has("x_project_manager"))
        createPayload.x_project_manager = spec.projectManager;
      if (this.supportedCustomFields?.has("x_programmer"))
        createPayload.x_programmer = spec.programmer;
      if (this.supportedCustomFields?.has("x_scale"))
        createPayload.x_scale = spec.scale;
      if (this.supportedCustomFields?.has("x_delivery_date"))
        createPayload.x_delivery_date = spec.deliveryDate;
      if (this.supportedCustomFields?.has("x_base_size"))
        createPayload.x_base_size = spec.baseSize;
      if (this.supportedCustomFields?.has("x_power_consumption"))
        createPayload.x_power_consumption = spec.powerConsumption;

      const newId = await this.executeKw<number>("project.project", "create", [
        createPayload,
      ]);

      return {
        id: newId,
        name: input.name.trim(),
        x_qr_token: token || null,
        x_work_order_no: spec.workOrderNo,
        x_project_manager: spec.projectManager,
        x_programmer: spec.programmer,
        x_scale: spec.scale,
        x_delivery_date: spec.deliveryDate,
        x_base_size: spec.baseSize,
        x_power_consumption: spec.powerConsumption,
      };
    } catch (err) {
      console.error("[RealOdooService createProject error]:", err);
      throw err;
    }
  }

  async getMaintenanceLogs(projectId: number): Promise<MaintenanceLog[]> {
    try {
      const logs = await this.executeKw<MaintenanceLog[]>(
        "x_maintenance_log",
        "search_read",
        [[["x_project_id", "=", projectId]]],
        {
          fields: [
            "id",
            "x_project_id",
            "x_note",
            "x_status",
            "x_done_by",
            "x_date",
          ],
          order: "x_date desc, id desc",
          limit: 100,
        }
      );

      if (!logs || logs.length === 0) return [];

      const logIds = logs.map((l) => l.id);

      const attachments = await this.executeKw<
        Array<{ id: number; res_id: number; name: string; mimetype: string }>
      >(
        "ir.attachment",
        "search_read",
        [
          [
            ["res_model", "=", "x_maintenance_log"],
            ["res_id", "in", logIds],
          ],
        ],
        { fields: ["id", "res_id", "name", "mimetype"] }
      );

      return logs.map((log) => {
        const matchingPhotos = (attachments || [])
          .filter((a) => a.res_id === log.id)
          .map((a) => ({
            id: a.id,
            name: a.name,
            mimetype: a.mimetype || "image/jpeg",
          }));

        return {
          ...log,
          photos: matchingPhotos,
        };
      });
    } catch (err) {
      console.error("[RealOdooService getMaintenanceLogs error]:", err);
      throw err;
    }
  }

  async addMaintenanceLog(
    projectId: number,
    note: string,
    status: MaintenanceStatus,
    userName: string,
    photos?: PhotoUploadPayload[]
  ): Promise<MaintenanceLog> {
    try {
      const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

      const logData = {
        x_project_id: projectId,
        x_note: note.trim(),
        x_status: status,
        x_done_by: userName || "Staff",
        x_date: nowStr,
      };

      const newId = await this.executeKw<number>("x_maintenance_log", "create", [
        logData,
      ]);

      const createdPhotos: PhotoAttachment[] = [];

      if (photos && photos.length > 0) {
        for (const photo of photos) {
          const attachId = await this.executeKw<number>("ir.attachment", "create", [
            {
              name: photo.name,
              type: "binary",
              datas: photo.base64,
              res_model: "x_maintenance_log",
              res_id: newId,
              mimetype: photo.type,
            },
          ]);

          createdPhotos.push({
            id: attachId,
            name: photo.name,
            mimetype: photo.type,
          });
        }
      }

      return {
        id: newId,
        ...logData,
        photos: createdPhotos,
      };
    } catch (err) {
      console.error("[RealOdooService addMaintenanceLog error]:", err);
      throw err;
    }
  }

  async ensureToken(projectId: number): Promise<string> {
    try {
      const projects = await this.executeKw<Project[]>(
        "project.project",
        "read",
        [[projectId]],
        { fields: ["id", "x_qr_token"] }
      );

      if (!projects || projects.length === 0) {
        throw new Error(`Project with ID ${projectId} does not exist in Odoo.`);
      }

      const existingToken = projects[0].x_qr_token;
      if (
        existingToken &&
        typeof existingToken === "string" &&
        existingToken.trim().length > 0
      ) {
        return existingToken;
      }

      const rawUuid = crypto.randomUUID().replace(/-/g, "");
      const generatedToken = `pqr_${rawUuid.slice(0, 20)}`;

      await this.executeKw<boolean>("project.project", "write", [
        [projectId],
        { x_qr_token: generatedToken },
      ]);

      return generatedToken;
    } catch (err) {
      console.error("[RealOdooService ensureToken error]:", err);
      throw err;
    }
  }

  async getAttachmentData(attachmentId: number): Promise<{
    data: Buffer;
    mimetype: string;
    filename: string;
  } | null> {
    try {
      const records = await this.executeKw<
        Array<{ id: number; datas: string; mimetype: string; name: string }>
      >(
        "ir.attachment",
        "read",
        [[attachmentId]],
        { fields: ["id", "datas", "mimetype", "name"] }
      );

      if (!records || records.length === 0 || !records[0].datas) {
        return null;
      }

      const record = records[0];
      const buffer = Buffer.from(record.datas, "base64");
      return {
        data: buffer,
        mimetype: record.mimetype || "image/jpeg",
        filename: record.name || `photo_${attachmentId}.jpg`,
      };
    } catch (err) {
      console.error("[RealOdooService getAttachmentData error]:", err);
      return null;
    }
  }

  async checkHealth(): Promise<{
    version: unknown;
    customModelExists: boolean;
    customFieldExists: boolean;
    groupsConfigured: {
      userGroupExists: boolean;
      adminGroupExists: boolean;
    };
  }> {
    const version = await this.jsonRpcCall("common", "version", []);

    const models = await this.executeKw<Array<{ id: number; model: string }>>(
      "ir.model",
      "search_read",
      [[["model", "=", "x_maintenance_log"]]],
      { fields: ["id", "model"] }
    );
    const customModelExists = Boolean(models && models.length > 0);

    const fields = await this.executeKw<Array<{ id: number; name: string }>>(
      "ir.model.fields",
      "search_read",
      [
        [
          ["model", "=", "project.project"],
          ["name", "=", "x_qr_token"],
        ],
      ],
      { fields: ["id", "name"] }
    );
    const customFieldExists = Boolean(fields && fields.length > 0);

    const groups = await this.executeKw<Array<{ id: number; name: string }>>(
      "res.groups",
      "search_read",
      [[["name", "in", ["QR App Users", "QR App Admins"]]]],
      { fields: ["id", "name"] }
    );

    const userGroupExists = groups.some((g) => g.name === "QR App Users");
    const adminGroupExists = groups.some((g) => g.name === "QR App Admins");

    return {
      version,
      customModelExists,
      customFieldExists,
      groupsConfigured: {
        userGroupExists,
        adminGroupExists,
      },
    };
  }
}
