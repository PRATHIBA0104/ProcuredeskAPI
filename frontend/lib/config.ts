// Address of the Express API. Set NEXT_PUBLIC_API_URL in frontend/.env.local to change it.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");
export const APP_NAME = "ProcureDesk";
