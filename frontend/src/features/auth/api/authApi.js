
import apiClient from "../../../lib/apiClient";

export async function signup({ username, email, password }) {
  const response = await apiClient.post("/auth/signup", {
    username,
    email,
    password,
  });

  return response.data.data;
}

export async function login({ email, password }) {
  const response = await apiClient.post("/auth/login", {
    email,
    password,
  });

  return response.data.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get("/auth/me");

  return response.data.data.user;
}

// Requires the authenticated PATCH /api/v1/auth/password endpoint.
export async function changePassword({ currentPassword, newPassword }) {
  const response = await apiClient.patch("/auth/password", {
    currentPassword,
    newPassword,
  });
  return response.data.data;
}
