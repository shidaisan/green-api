// Universal host (ok for test task). In production лучше брать apiUrl из консоли.
const API_URL = "https://api.greenapi.com";

const el = (id) => document.getElementById(id);
const responseBox = el("response");

function setBusy(isBusy) {
  ["btnGetSettings","btnGetState","btnSendMessage","btnSendFile"].forEach((id) => {
    el(id).disabled = isBusy;
  });
}

function nowIso() {
  return new Date().toISOString();
}

function pretty(obj) {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

function writeResponse(payload) {
  responseBox.value = payload + (payload.endsWith("\n") ? "" : "\n");
  responseBox.scrollTop = 0;
}

function appendResponse(payload) {
  responseBox.value = payload + (payload.endsWith("\n") ? "" : "\n") + responseBox.value;
}

function getCreds() {
  const idInstance = el("idInstance").value.trim();
  const apiTokenInstance = el("apiTokenInstance").value.trim();
  if (!idInstance || !apiTokenInstance) {
    throw new Error("Заполни idInstance и ApiTokenInstance");
  }
  localStorage.setItem("greenapi.idInstance", idInstance);
  localStorage.setItem("greenapi.apiTokenInstance", apiTokenInstance);
  return { idInstance, apiTokenInstance };
}

function normalizeChatId(value) {
  const v = (value || "").trim();
  if (!v) throw new Error("Заполни номер/чат");
  if (v.includes("@")) return v;
  const digits = v.replace(/\D/g, "");
  if (!digits) throw new Error("Номер должен содержать цифры");
  return `${digits}@c.us`;
}

async function callApi({ method, path, body }) {
  const url = `${API_URL}${path}`;
  const opts = { method, headers: {} };

  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const started = performance.now();
  const res = await fetch(url, opts);
  const ms = Math.round(performance.now() - started);

  const text = await res.text();
  let parsed = text;
  try { parsed = JSON.parse(text); } catch { /* keep text */ }

  return { ok: res.ok, status: res.status, ms, url, data: parsed };
}

function renderResult(title, result) {
  const head = [
    `[${nowIso()}] ${title}`,
    `${result.ok ? "OK" : "ERROR"} ${result.status} (${result.ms}ms)`,
    result.url,
    ""
  ].join("\n");

  return head + pretty(result.data) + "\n\n";
}

function bootstrapSavedCreds() {
  const savedId = localStorage.getItem("greenapi.idInstance") || "";
  const savedToken = localStorage.getItem("greenapi.apiTokenInstance") || "";
  if (savedId) el("idInstance").value = savedId;
  if (savedToken) el("apiTokenInstance").value = savedToken;
}

async function onGetSettings() {
  const { idInstance, apiTokenInstance } = getCreds();
  setBusy(true);
  try {
    const r = await callApi({
      method: "GET",
      path: `/waInstance${encodeURIComponent(idInstance)}/getSettings/${encodeURIComponent(apiTokenInstance)}`
    });
    appendResponse(renderResult("getSettings", r));
  } finally {
    setBusy(false);
  }
}

async function onGetState() {
  const { idInstance, apiTokenInstance } = getCreds();
  setBusy(true);
  try {
    const r = await callApi({
      method: "GET",
      path: `/waInstance${encodeURIComponent(idInstance)}/getStateInstance/${encodeURIComponent(apiTokenInstance)}`
    });
    appendResponse(renderResult("getStateInstance", r));
  } finally {
    setBusy(false);
  }
}

async function onSendMessage() {
  const { idInstance, apiTokenInstance } = getCreds();
  const chatId = normalizeChatId(el("chatIdMsg").value);
  const message = el("message").value;
  if (!message.trim()) throw new Error("Сообщение не должно быть пустым");

  setBusy(true);
  try {
    const r = await callApi({
      method: "POST",
      path: `/waInstance${encodeURIComponent(idInstance)}/sendMessage/${encodeURIComponent(apiTokenInstance)}`,
      body: { chatId, message }
    });
    appendResponse(renderResult("sendMessage", r));
  } finally {
    setBusy(false);
  }
}

function deriveFileName(url) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    return last || "file";
  } catch {
    return "file";
  }
}

async function onSendFileByUrl() {
  const { idInstance, apiTokenInstance } = getCreds();
  const chatId = normalizeChatId(el("chatIdFile").value);
  const urlFile = el("fileUrl").value.trim();
  if (!/^https?:\/\//i.test(urlFile)) throw new Error("urlFile должен начинаться с http(s)://");

  const fileName = deriveFileName(urlFile);

  setBusy(true);
  try {
    const r = await callApi({
      method: "POST",
      path: `/waInstance${encodeURIComponent(idInstance)}/sendFileByUrl/${encodeURIComponent(apiTokenInstance)}`,
      body: { chatId, urlFile, fileName, caption: fileName }
    });
    appendResponse(renderResult("sendFileByUrl", r));
  } finally {
    setBusy(false);
  }
}

function showErr(err) {
  appendResponse(`[${nowIso()}] ERROR\n${err?.message || String(err)}\n`);
}

bootstrapSavedCreds();

el("btnGetSettings").addEventListener("click", () => onGetSettings().catch(showErr));
el("btnGetState").addEventListener("click", () => onGetState().catch(showErr));
el("btnSendMessage").addEventListener("click", () => onSendMessage().catch(showErr));
el("btnSendFile").addEventListener("click", () => onSendFileByUrl().catch(showErr));

writeResponse("Готово. Введи idInstance + ApiTokenInstance и нажимай кнопки.\n");
