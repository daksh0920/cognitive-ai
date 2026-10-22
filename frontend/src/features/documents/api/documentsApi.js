import apiClient from "../../../lib/apiClient";

export async function getDocuments({ page = 1, limit = 20 } = {}) {
  const response = await apiClient.get("/documents", { params: { page, limit } });
  return response.data.data;
}

export async function uploadDocument(file, title = "") {
  const formData = new FormData();
  const extension = file.name.includes(".") ? `.${file.name.split(".").pop()}`.toLowerCase() : "";
  const cleanTitle = title.trim().replace(/\\/g, "-").replace(/[/:*?"<>|]/g, "-").replace(/\.pdf$/i, "");
  const uploadName = cleanTitle ? `${cleanTitle}${extension}` : file.name;
  // The backend persists originalname; provide the title as the multipart filename.
  formData.append("document", file, uploadName);
  const response = await apiClient.post("/documents", formData);
  return response.data;
}

export async function deleteDocument(documentId) {
  const response = await apiClient.delete(`/documents/${documentId}`);
  return response.data;
}

export async function getDocument(documentId) {
  const response = await apiClient.get(`/documents/${documentId}`);
  return response.data.data.document;
}

export async function getDocumentContent(documentId, params = {}) {
  const response = await apiClient.get(`/documents/${documentId}/content`, { params });
  return response.data.data;
}

export async function getDocumentFileBlob(documentId) {
  const response = await apiClient.get(`/documents/${documentId}/file`, { responseType: "blob" });
  return response.data;
}
