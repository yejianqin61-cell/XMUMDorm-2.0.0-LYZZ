/**
 * Build FormData from a body object and optional files array.
 * Used by shared/api modules to construct multipart/form-data requests.
 *
 * @param {Object} [body={}] - Key-value pairs for form fields
 * @param {Array<{key: string, value: File|Blob}>} [files=[]] - File attachments
 * @returns {FormData}
 */
export function toFormData(body = {}, files = []) {
  const fd = new FormData();
  Object.entries(body).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  files.forEach(({ key, value }) => {
    if (typeof Blob !== 'undefined' && value instanceof Blob) {
      fd.append(key, value);
    }
  });
  return fd;
}
