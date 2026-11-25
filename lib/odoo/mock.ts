import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import {
  AuthUser,
  CreateProjectInput,
  MaintenanceLog,
  MaintenanceStatus,
  OdooService,
  PhotoAttachment,
  PhotoUploadPayload,
  Project,
  UpdateProjectInput,
} from "../types";

interface MockAttachment {
  id: number;
  res_model: string;
  res_id: number;
  name: string;
  mimetype: string;
  datas: string; // base64
}

interface MockDataStore {
  projects: Project[];
  logs: MaintenanceLog[];
  attachments: MockAttachment[];
  nextProjectId: number;
  nextLogId: number;
  nextAttachmentId: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __projectQrFallbackMemStore: MockDataStore | undefined;
}

function getStoreFilePath(): string {
  try {
    const localPath = path.join(process.cwd(), ".mock-odoo-data.json");
    fs.accessSync(process.cwd(), fs.constants.W_OK);
    return localPath;
  } catch {
    return path.join(os.tmpdir(), "mimar-mock-odoo-data.json");
  }
}

function createEmptyStore(): MockDataStore {
  return {
    projects: [],
    logs: [],
    attachments: [],
    nextProjectId: 1,
    nextLogId: 1,
    nextAttachmentId: 1,
  };
}

function readStore(): MockDataStore {
  const filePath = getStoreFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as MockDataStore;
      if (parsed && Array.isArray(parsed.projects)) {
        globalThis.__projectQrFallbackMemStore = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[MockOdooService readStore fallback]:", err);
  }

  const fresh = createEmptyStore();
  saveStore(fresh);
  return fresh;
}

function saveStore(store: MockDataStore): void {
  globalThis.__projectQrFallbackMemStore = store;
  const filePath = getStoreFilePath();
  try {
    const tmpPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), "utf8");
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.warn("[MockOdooService saveStore warning]:", err);
  }
}

function makeQrToken(): string {
  const rawUuid = crypto.randomUUID().replace(/-/g, "");
  return `pqr_${rawUuid.slice(0, 20)}`;
}

export class MockOdooService implements OdooService {
  async authenticateUser(login: string, password: string): Promise<AuthUser | null> {
    const userLogin = login.trim().toLowerCase();

    if (userLogin === "staff@test.com" && password === "staff123") {
      return {
        uid: 10,
        name: "Staff User",
        login: "staff@test.com",
        isAdmin: false,
      };
    }

    if (userLogin === "admin@test.com" && password === "admin123") {
      return {
        uid: 1,
        name: "Admin User",
        login: "admin@test.com",
        isAdmin: true,
      };
    }

    return null;
  }

  async getProjectByToken(token: string): Promise<Project | null> {
    if (!token) return null;
    const store = readStore();
    const cleanToken = token.trim();
    const project = store.projects.find((p) => p.x_qr_token === cleanToken);
    return project ? JSON.parse(JSON.stringify(project)) : null;
  }

  async listProjects(): Promise<Project[]> {
    const store = readStore();
    return JSON.parse(JSON.stringify(store.projects));
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const store = readStore();
    const id = store.nextProjectId++;
    const token = input.generateQr ? makeQrToken() : null;

    const newProject: Project = {
      id,
      name: input.name.trim(),
      partner_id: false,
      user_id: [1, input.projectManager.trim()],
      stage_id: [1, "Active"],
      date_start: new Date().toISOString().slice(0, 10),
      date: input.deliveryDate.trim(),
      description: "",
      x_qr_token: token,
      x_work_order_no: input.workOrderNo.trim(),
      x_project_manager: input.projectManager.trim(),
      x_programmer: input.programmer.trim(),
      x_scale: input.scale.trim(),
      x_delivery_date: input.deliveryDate.trim(),
      x_base_size: input.baseSize.trim(),
      x_power_consumption: input.powerConsumption.trim(),
    };

    store.projects.unshift(newProject);
    saveStore(store);
    return JSON.parse(JSON.stringify(newProject));
  }

  async updateProject(input: UpdateProjectInput): Promise<Project> {
    const store = readStore();
    const project = store.projects.find((p) => p.id === input.id);
    if (!project) {
      throw new Error(`Project with ID ${input.id} not found.`);
    }

    project.name = input.name.trim();
    project.user_id = [1, input.projectManager.trim()];
    project.date = input.deliveryDate.trim();
    project.x_work_order_no = input.workOrderNo.trim();
    project.x_project_manager = input.projectManager.trim();
    project.x_programmer = input.programmer.trim();
    project.x_scale = input.scale.trim();
    project.x_delivery_date = input.deliveryDate.trim();
    project.x_base_size = input.baseSize.trim();
    project.x_power_consumption = input.powerConsumption.trim();

    if (input.regenerateQr) {
      project.x_qr_token = makeQrToken();
    }

    saveStore(store);
    return JSON.parse(JSON.stringify(project));
  }

  async getMaintenanceLogs(projectId: number): Promise<MaintenanceLog[]> {
    const store = readStore();
    const filtered = store.logs.filter((log) => {
      const pid = Array.isArray(log.x_project_id)
        ? log.x_project_id[0]
        : log.x_project_id;
      return pid === projectId;
    });

    const populated = filtered.map((log) => {
      const logAttachments = store.attachments
        .filter((a) => a.res_model === "x_maintenance_log" && a.res_id === log.id)
        .map((a) => ({ id: a.id, name: a.name, mimetype: a.mimetype }));

      return {
        ...log,
        photos: logAttachments,
      };
    });

    return populated.sort(
      (a, b) => new Date(b.x_date).getTime() - new Date(a.x_date).getTime()
    );
  }

  async addMaintenanceLog(
    projectId: number,
    note: string,
    status: MaintenanceStatus,
    userName: string,
    photos?: PhotoUploadPayload[]
  ): Promise<MaintenanceLog> {
    const store = readStore();
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }

    const logId = store.nextLogId++;
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

    const createdPhotos: PhotoAttachment[] = [];

    if (photos && photos.length > 0) {
      for (const photo of photos) {
        const attachId = store.nextAttachmentId++;
        store.attachments.push({
          id: attachId,
          res_model: "x_maintenance_log",
          res_id: logId,
          name: photo.name,
          mimetype: photo.type,
          datas: photo.base64,
        });
        createdPhotos.push({
          id: attachId,
          name: photo.name,
          mimetype: photo.type,
        });
      }
    }

    const newLog: MaintenanceLog = {
      id: logId,
      x_project_id: [project.id, project.name],
      x_note: note.trim(),
      x_status: status,
      x_done_by: userName || "Staff",
      x_date: nowStr,
      photos: createdPhotos,
    };

    store.logs.unshift(newLog);
    saveStore(store);
    return JSON.parse(JSON.stringify(newLog));
  }

  async ensureToken(projectId: number): Promise<string> {
    const store = readStore();
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }

    if (project.x_qr_token && project.x_qr_token.trim().length > 0) {
      return project.x_qr_token;
    }

    const generatedToken = makeQrToken();
    project.x_qr_token = generatedToken;
    saveStore(store);
    return generatedToken;
  }

  async regenerateToken(projectId: number): Promise<string> {
    const store = readStore();
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }
    const newToken = makeQrToken();
    project.x_qr_token = newToken;
    saveStore(store);
    return newToken;
  }

  async getAttachmentData(attachmentId: number): Promise<{
    data: Buffer;
    mimetype: string;
    filename: string;
  } | null> {
    const store = readStore();
    const attachment = store.attachments.find((a) => a.id === attachmentId);
    if (!attachment) return null;

    const buffer = Buffer.from(attachment.datas, "base64");
    return {
      data: buffer,
      mimetype: attachment.mimetype || "image/jpeg",
      filename: attachment.name || `photo_${attachmentId}.jpg`,
    };
  }
}
