import { api } from "./axiosClient";
import { DEFAULT_USER_TYPES } from "../utils/userTypes";

export const registerUser = async (data: any) => {
  const response = await api.post("api/auth/register", data);
  return response.data;
};

export const loginUser = async (email: string, password: string) => {
  const response = await api.post("api/auth/login", {
    email,
    password,
  });

  return response.data;
};

function parseUserTypes(payload: any): string[] {
  const raw =
    payload?.userTypes ??
    payload?.profiles ??
    payload?.data?.userTypes ??
    payload?.data?.profiles ??
    payload?.data ??
    payload;

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item: any) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const value = item.value ?? item.name ?? item.label ?? item.userType;
        if (typeof value === "string") return value.trim();
      }
      return "";
    })
    .filter(Boolean);
}

export const getUserTypeOptions = async () => {
  const endpoints = [
    "/api/auth/user-types",
    "/api/auth/profile-types",
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint);
      const parsed = parseUserTypes(response.data);
      if (parsed.length > 0) return parsed;
    } catch {
      continue;
    }
  }

  return [...DEFAULT_USER_TYPES];
};
