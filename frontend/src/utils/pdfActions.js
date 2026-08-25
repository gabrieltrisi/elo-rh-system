import api from '../services/api';

const createPdfBlobUrl = (data) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
};

export const openPdfFromEndpoint = async (endpoint) => {
  const response = await api.get(endpoint, { responseType: 'blob' });
  const blobUrl = createPdfBlobUrl(response.data);
  window.open(blobUrl, '_blank', 'noopener,noreferrer');

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60000);
};

export const downloadPdfFromEndpoint = async (endpoint, fileName = 'documento.pdf') => {
  const response = await api.get(endpoint, { responseType: 'blob' });
  const blobUrl = createPdfBlobUrl(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60000);
};
