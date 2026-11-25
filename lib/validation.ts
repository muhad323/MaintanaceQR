import { z } from "zod";

export const loginSchema = z.object({
  login: z.string().trim().min(1, "User ID is required"),
  password: z.string().min(1, "Password is required"),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project Name is required").max(200),
  workOrderNo: z.string().trim().min(1, "Work Order No is required").max(100),
  projectManager: z.string().trim().min(1, "Project Manager is required").max(150),
  programmer: z.string().trim().min(1, "Programmer is required").max(150),
  scale: z.string().trim().min(1, "Scale is required").max(100),
  deliveryDate: z.string().trim().min(1, "Delivery Date is required").max(100),
  baseSize: z.string().trim().min(1, "Base Size is required").max(150),
  powerConsumption: z.string().trim().min(1, "Power Consumption is required").max(100),
  generateQr: z.boolean().optional(),
});

export const photoSchema = z.object({
  name: z.string().min(1).max(255),
  type: z
    .string()
    .regex(
      /^image\/(jpeg|jpg|png|webp)$/,
      "Only image files (JPEG, PNG, WEBP) are allowed"
    ),
  base64: z.string().min(1, "Photo data is required"),
});

export const addMaintenanceLogSchema = z.object({
  projectId: z.coerce.number().int().positive("Invalid project ID"),
  token: z.string().trim().min(1, "Project token is required"),
  doneBy: z
    .string()
    .trim()
    .min(1, "Please enter your name")
    .max(150, "Name is too long"),
  note: z
    .string()
    .trim()
    .min(1, "Please enter a maintenance description")
    .max(2000, "Description is too long"),
  status: z.enum(["done", "pending", "issue"], {
    errorMap: () => ({ message: "Status must be Done, Pending, or Issue" }),
  }),
  photos: z.array(photoSchema).max(6, "Maximum 6 images allowed").optional(),
});
