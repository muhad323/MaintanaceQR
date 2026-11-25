export type MaintenanceStatus = "done" | "pending" | "issue";

export interface Project {
  id: number;
  name: string;
  partner_id?: [number, string] | false | null | string;
  user_id?: [number, string] | false | null | string;
  stage_id?: [number, string] | false | null | string;
  date_start?: string | false | null;
  date?: string | false | null;
  description?: string | false | null;
  x_qr_token?: string | false | null;
  // Mimar Project Identification fields
  x_work_order_no?: string | false | null;
  x_project_manager?: string | false | null;
  x_programmer?: string | false | null;
  x_scale?: string | false | null;
  x_delivery_date?: string | false | null;
  x_base_size?: string | false | null;
  x_power_consumption?: string | false | null;
}

export interface CreateProjectInput {
  name: string;
  workOrderNo: string;
  projectManager: string;
  programmer: string;
  scale: string;
  deliveryDate: string;
  baseSize: string;
  powerConsumption: string;
  generateQr?: boolean;
}

export interface UpdateProjectInput {
  id: number;
  name: string;
  workOrderNo: string;
  projectManager: string;
  programmer: string;
  scale: string;
  deliveryDate: string;
  baseSize: string;
  powerConsumption: string;
  regenerateQr?: boolean;
}

export interface PhotoAttachment {
  id: number;
  name: string;
  mimetype: string;
}

export interface MaintenanceLog {
  id: number;
  x_project_id: [number, string] | number;
  x_note: string;
  x_status: MaintenanceStatus;
  x_done_by: string;
  x_date: string;
  photos?: PhotoAttachment[];
}

export interface AuthUser {
  uid: number;
  name: string;
  login: string;
  isAdmin: boolean;
}

export interface SessionPayload {
  uid: number;
  name: string;
  isAdmin: boolean;
  exp?: number;
  iat?: number;
}

export interface PhotoUploadPayload {
  name: string;
  type: string;
  base64: string;
}

export interface OdooService {
  authenticateUser(login: string, password: string): Promise<AuthUser | null>;
  getProjectByToken(token: string): Promise<Project | null>;
  listProjects(): Promise<Project[]>;
  createProject(input: CreateProjectInput): Promise<Project>;
  updateProject(input: UpdateProjectInput): Promise<Project>;
  getMaintenanceLogs(projectId: number): Promise<MaintenanceLog[]>;
  addMaintenanceLog(
    projectId: number,
    note: string,
    status: MaintenanceStatus,
    userName: string,
    photos?: PhotoUploadPayload[]
  ): Promise<MaintenanceLog>;
  ensureToken(projectId: number): Promise<string>;
  regenerateToken(projectId: number): Promise<string>;
  getAttachmentData(attachmentId: number): Promise<{
    data: Buffer;
    mimetype: string;
    filename: string;
  } | null>;
}
