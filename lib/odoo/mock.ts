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

const SAMPLE_MOCK_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const INITIAL_PROJECTS: Project[] = [
  {
    id: 101,
    name: "EMAAR - DUBAI OPERA HOUSE SCALE MODEL",
    partner_id: [12, "Emaar Properties PJSC"],
    user_id: [4, "TARIQ AL-SAYED"],
    stage_id: [3, "In Progress"],
    date_start: "2024-01-15",
    date: "2026-11-13",
    description:
      "1:150 scale architectural physical model featuring illuminated auditorium ceiling and working motorized stage lift.",
    x_qr_token: "proj_qr_dubai_opera_101",
    x_work_order_no: "MM-10145",
    x_project_manager: "TARIQ AL-SAYED",
    x_programmer: "HASSAN RASHID",
    x_scale: "1-150",
    x_delivery_date: "13.11.2026",
    x_base_size: "3.2M X 2.4M X 0.9M",
    x_power_consumption: "350 WATTS",
  },
  {
    id: 102,
    name: "ETIHAD RAIL - NATIONAL NETWORK MASTERPLAN",
    partner_id: [15, "Etihad Rail Company"],
    user_id: [7, "MONA AL-KHATIB"],
    stage_id: [3, "In Progress"],
    date_start: "2023-09-01",
    date: "2026-12-15",
    description:
      "1:500 scale terrain model with fiber optic dynamic train movement simulation and interactive track lighting.",
    x_qr_token: "proj_qr_etihad_rail_102",
    x_work_order_no: "MM-10288",
    x_project_manager: "MONA AL-KHATIB",
    x_programmer: "OMAR FAROOQ",
    x_scale: "1-500",
    x_delivery_date: "15.12.2026",
    x_base_size: "4.5M X 2.8M X 1.0M",
    x_power_consumption: "480 WATTS",
  },
  {
    id: 103,
    name: "EXPO CITY - AL WASL PLAZA DOME MODEL",
    partner_id: [22, "Expo City Dubai"],
    user_id: [4, "TARIQ AL-SAYED"],
    stage_id: [2, "Initial Setup"],
    date_start: "2024-03-10",
    date: "2027-02-28",
    description:
      "Laser-sintered 3D printed steel lattice sphere with 360-degree micro-projector mapping rig.",
    x_qr_token: "proj_qr_al_wasl_103",
    x_work_order_no: "MM-10312",
    x_project_manager: "TARIQ AL-SAYED",
    x_programmer: "SALMAN KHALID",
    x_scale: "1-200",
    x_delivery_date: "28.02.2027",
    x_base_size: "2.5M X 2.5M X 1.2M",
    x_power_consumption: "420 WATTS",
  },
  {
    id: 104,
    name: "MIMAR MODELS - HQ SHOWCASE MODEL",
    partner_id: [1, "Mimar Engineering LLC"],
    user_id: [2, "ZAID QASIMI"],
    stage_id: [4, "Testing & Handover"],
    date_start: "2024-05-01",
    date: "2026-08-31",
    description:
      "Acrylic and brushed brass interior cross-section showcase with internal LED strip lighting.",
    x_qr_token: "proj_qr_mimar_hq_104",
    x_work_order_no: "MM-10409",
    x_project_manager: "ZAID QASIMI",
    x_programmer: "HASSAN RASHID",
    x_scale: "1-100",
    x_delivery_date: "31.08.2026",
    x_base_size: "1.8M X 1.5M X 0.9M",
    x_power_consumption: "220 WATTS",
  },
  {
    id: 105,
    name: "ADGM - FINANCIAL CENTER MASTERPLAN",
    partner_id: [31, "ADGM Authority"],
    user_id: [9, "FATIMA AL-NUAIMI"],
    stage_id: [3, "In Progress"],
    date_start: "2024-02-01",
    date: "2026-11-20",
    description:
      "Frosted acrylic towers with integrated fiber-optic floorplate lighting and touch-screen building directory.",
    x_qr_token: "proj_qr_adgm_center_105",
    x_work_order_no: "MM-10577",
    x_project_manager: "FATIMA AL-NUAIMI",
    x_programmer: "OMAR FAROOQ",
    x_scale: "1-1000",
    x_delivery_date: "20.11.2026",
    x_base_size: "3M X 2M X 1M",
    x_power_consumption: "300 WATTS",
  },
];

const INITIAL_LOGS: MaintenanceLog[] = [
  {
    id: 1,
    x_project_id: [101, "EMAAR - DUBAI OPERA HOUSE SCALE MODEL"],
    x_note:
      "Auditorium fiber-optic wiring inspected. Replaced faulty 12V LED driver under the stage deck.",
    x_status: "done",
    x_done_by: "Staff User",
    x_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
      .toISOString()
      .replace("T", " ")
      .substring(0, 19),
    photos: [
      { id: 501, name: "led_driver_replacement.jpg", mimetype: "image/jpeg" },
    ],
  },
  {
    id: 2,
    x_project_id: [101, "EMAAR - DUBAI OPERA HOUSE SCALE MODEL"],
    x_note:
      "Perimeter acrylic dust cover has minor surface scratching near the north entrance. Buffing kit needed.",
    x_status: "pending",
    x_done_by: "Admin User",
    x_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
      .toISOString()
      .replace("T", " ")
      .substring(0, 19),
    photos: [],
  },
  {
    id: 3,
    x_project_id: [102, "ETIHAD RAIL - NATIONAL NETWORK MASTERPLAN"],
    x_note:
      "Train track sector 3 power connector loose. Model trains stopping intermittently.",
    x_status: "issue",
    x_done_by: "Staff User",
    x_date: new Date(Date.now() - 1000 * 60 * 60 * 12)
      .toISOString()
      .replace("T", " ")
      .substring(0, 19),
    photos: [
      { id: 502, name: "track_connector_issue.jpg", mimetype: "image/jpeg" },
    ],
  },
];

const INITIAL_ATTACHMENTS: MockAttachment[] = [
  {
    id: 501,
    res_model: "x_maintenance_log",
    res_id: 1,
    name: "led_driver_replacement.jpg",
    mimetype: "image/jpeg",
    datas: SAMPLE_MOCK_IMAGE_BASE64,
  },
  {
    id: 502,
    res_model: "x_maintenance_log",
    res_id: 3,
    name: "track_connector_issue.jpg",
    mimetype: "image/jpeg",
    datas: SAMPLE_MOCK_IMAGE_BASE64,
  },
];

declare global {
  // eslint-disable-next-line no-var
  var __projectQrStoreV2: MockDataStore | undefined;
}

function getStore(): MockDataStore {
  if (!globalThis.__projectQrStoreV2) {
    globalThis.__projectQrStoreV2 = {
      projects: JSON.parse(JSON.stringify(INITIAL_PROJECTS)),
      logs: JSON.parse(JSON.stringify(INITIAL_LOGS)),
      attachments: JSON.parse(JSON.stringify(INITIAL_ATTACHMENTS)),
      nextProjectId: 106,
      nextLogId: 10,
      nextAttachmentId: 600,
    };
  }
  return globalThis.__projectQrStoreV2;
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
    const store = getStore();
    const cleanToken = token.trim();
    const project = store.projects.find((p) => p.x_qr_token === cleanToken);
    return project ? JSON.parse(JSON.stringify(project)) : null;
  }

  async listProjects(): Promise<Project[]> {
    const store = getStore();
    return JSON.parse(JSON.stringify(store.projects));
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const store = getStore();
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
    return JSON.parse(JSON.stringify(newProject));
  }

  async updateProject(input: UpdateProjectInput): Promise<Project> {
    const store = getStore();
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

    return JSON.parse(JSON.stringify(project));
  }

  async getMaintenanceLogs(projectId: number): Promise<MaintenanceLog[]> {
    const store = getStore();
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
    const store = getStore();
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
    return JSON.parse(JSON.stringify(newLog));
  }

  async ensureToken(projectId: number): Promise<string> {
    const store = getStore();
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }

    if (project.x_qr_token && project.x_qr_token.trim().length > 0) {
      return project.x_qr_token;
    }

    const generatedToken = makeQrToken();
    project.x_qr_token = generatedToken;
    return generatedToken;
  }

  async regenerateToken(projectId: number): Promise<string> {
    const store = getStore();
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }
    const newToken = makeQrToken();
    project.x_qr_token = newToken;
    return newToken;
  }

  async getAttachmentData(attachmentId: number): Promise<{
    data: Buffer;
    mimetype: string;
    filename: string;
  } | null> {
    const store = getStore();
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
