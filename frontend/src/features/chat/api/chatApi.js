import apiClient from "../../../lib/apiClient";

export async function getChatHistory(documentId) {
  const response = await apiClient.get(`/documents/${documentId}/chat`);
  return response.data.data;
}

export async function sendChatMessage(documentId, message) {
  const response = await apiClient.post(`/documents/${documentId}/chat`, { message });
  return response.data.data;
}
