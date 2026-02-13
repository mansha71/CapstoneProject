const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const buildUrl = (path) => `${API_BASE_URL}${path}`;

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text } : null;
};

const normalizeError = (status, payload) => {
  if (!payload) return new ApiError('Request failed', status);
  if (typeof payload === 'string') return new ApiError(payload, status);
  const message =
    payload.error?.message ??
    payload.message ??
    `Request failed with status ${status}`;
  return new ApiError(message, status, payload);
};

const request = async (method, path, options = {}) => {
  const { body, headers = {}, signal } = options;
  const requestHeaders = { ...headers };
  let requestBody = body;

  if (body && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal,
    });
  } catch (error) {
    throw new ApiError(error.message || 'Network request failed');
  }

  if (response.status === 204) return null;
  const payload = await parseResponse(response);
  if (!response.ok) {
    throw normalizeError(response.status, payload);
  }
  return payload;
};

export const get = (path, options) => request('GET', path, options);
export const post = (path, body, options = {}) =>
  request('POST', path, { ...options, body });
export const del = (path, options) => request('DELETE', path, options);
