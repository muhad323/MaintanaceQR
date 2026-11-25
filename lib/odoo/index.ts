import { OdooService } from "../types";
import { MockOdooService } from "./mock";
import { RealOdooService } from "./real";

let serviceInstance: OdooService | null = null;

export function getOdooService(): OdooService {
  if (!serviceInstance) {
    const useMock =
      process.env.USE_MOCK_ODOO === "true" ||
      !process.env.ODOO_URL ||
      process.env.ODOO_URL.includes("yourcompany");

    if (useMock) {
      serviceInstance = new MockOdooService();
    } else {
      serviceInstance = new RealOdooService();
    }
  }
  return serviceInstance;
}
