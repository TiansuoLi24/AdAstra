const BASE = '/api';

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return data;
}

// ---- Maps ----

export async function listMapsAPI(token) {
  const res = await fetch(`${BASE}/maps`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function getMapAPI(token, id) {
  const res = await fetch(`${BASE}/maps/${id}`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function createMapAPI(token, { name, tasks }) {
  const res = await fetch(`${BASE}/maps`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name, tasks }),
  });
  return handleResponse(res);
}

export async function updateMapAPI(token, id, { name, tasks }) {
  const res = await fetch(`${BASE}/maps/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ name, tasks }),
  });
  return handleResponse(res);
}

export async function deleteMapAPI(token, id) {
  const res = await fetch(`${BASE}/maps/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function syncMapsAPI(token, maps) {
  const res = await fetch(`${BASE}/maps/sync`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ maps }),
  });
  return handleResponse(res);
}

// ---- Settings ----

export async function getSettingsAPI(token) {
  const res = await fetch(`${BASE}/settings`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function saveSettingsAPI(token, settings) {
  const res = await fetch(`${BASE}/settings`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ settings }),
  });
  return handleResponse(res);
}
