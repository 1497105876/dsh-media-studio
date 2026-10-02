window.__ModuleLoader__.load({id:"@gw/dsh-media-studio",factory:(require)=>{const module={exports:{}};
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/types.ts
var COMMAND_PAYLOAD_OPEN = "\u27E8media-studio\u27E9";
var COMMAND_PAYLOAD_CLOSE = "\u27E8/media-studio\u27E9";
function decodeCommandPayload(text) {
  if (text === void 0) return void 0;
  const start = text.indexOf(COMMAND_PAYLOAD_OPEN);
  const end = text.indexOf(COMMAND_PAYLOAD_CLOSE);
  if (start < 0 || end < start) return void 0;
  try {
    const parsed = JSON.parse(text.slice(start + COMMAND_PAYLOAD_OPEN.length, end));
    return parsed !== null && typeof parsed === "object" && parsed.v === 1 ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function stripCommandPayload(text) {
  if (text === void 0) return "";
  const start = text.indexOf(COMMAND_PAYLOAD_OPEN);
  const end = text.indexOf(COMMAND_PAYLOAD_CLOSE);
  if (start < 0 || end < start) return text;
  return `${text.slice(0, start)}${text.slice(end + COMMAND_PAYLOAD_CLOSE.length)}`.trim();
}

// src/client/media.tsx
var import_react = require("react");

// src/client/native-open.ts
var session;
var availability;
function bindNativeOpen(sessionRemote) {
  const candidate = sessionRemote;
  session = candidate !== void 0 && typeof candidate.openWorkspacePath === "function" ? candidate : void 0;
}
function probeNativeOpen() {
  availability ??= (async () => {
    if (session === void 0 || session.canOpenWorkspacePath === void 0) return false;
    try {
      const result = await session.canOpenWorkspacePath();
      return result.ok === true && result.value === true;
    } catch {
      return false;
    }
  })();
  return availability;
}
async function nativeOpenPath(path) {
  if (session === void 0 || session.openWorkspacePath === void 0) return false;
  try {
    const result = await session.openWorkspacePath({ path });
    return result.ok === true;
  } catch {
    return false;
  }
}

// src/client/media.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var ABSOLUTE_PATH = /^(?:\/|[A-Za-z]:[\\/])/;
function apiFileUrl(path) {
  if (path === void 0 || !ABSOLUTE_PATH.test(path) || path.startsWith("//")) return void 0;
  if (/[\u0000-\u001f\u007f]/.test(path)) return void 0;
  try {
    return new URL(`api/file?path=${encodeURIComponent(path)}`, document.baseURI).href;
  } catch {
    return void 0;
  }
}
function fileLabel(item) {
  return item.name;
}
function formatBytes(bytes) {
  if (bytes === void 0 || !Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
function DownloadButton({ url, name, style }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "a",
    {
      href: url,
      download: name,
      style: { fontSize: 12, color: "#4a90d9", textDecoration: "none", cursor: "pointer", ...style },
      children: "\u2B07 \u4E0B\u8F7D"
    }
  );
}
function OpenSystemButton({ path, style }) {
  const [available, setAvailable] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    void probeNativeOpen().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!available) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      type: "button",
      title: "\u7528\u7CFB\u7EDF\u9ED8\u8BA4\u5E94\u7528\u6253\u5F00",
      onClick: () => void nativeOpenPath(path),
      style: {
        fontSize: 12,
        color: "#4a90d9",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        ...style
      },
      children: "\u{1F5A5} \u6253\u5F00"
    }
  );
}
var lightboxStyleInjected = false;
function injectLightboxStyle() {
  if (lightboxStyleInjected) return;
  lightboxStyleInjected = true;
  const tag = document.createElement("style");
  tag.dataset.plugin = "dsh-media-studio";
  tag.textContent = "@keyframes ms-fade-in{from{opacity:0}to{opacity:1}}";
  document.head.appendChild(tag);
}
var lightboxBar = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: "0 4px",
  minHeight: 24
};
var lightboxText = {
  fontSize: 12,
  color: "#ddd",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};
var lightboxClose = {
  marginLeft: "auto",
  fontSize: 12,
  color: "#ddd",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "2px 6px",
  flexShrink: 0
};
function Lightbox({ url, name, size, path, onClose }) {
  const [full, setFull] = (0, import_react.useState)(false);
  const [dims, setDims] = (0, import_react.useState)(void 0);
  (0, import_react.useEffect)(() => {
    injectLightboxStyle();
  }, []);
  (0, import_react.useEffect)(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const info = [
    dims !== void 0 ? `${dims.w}\xD7${dims.h}` : void 0,
    formatBytes(size) === "" ? void 0 : formatBytes(size)
  ].filter(Boolean).join(" \xB7 ");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      onClick: onClose,
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 1e3,
        background: "rgba(0,0,0,0.82)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 12,
        gap: 8,
        animation: "ms-fade-in 160ms ease-out"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: lightboxBar, onClick: (event) => event.stopPropagation(), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: lightboxText, title: name, children: [
            name,
            info === "" ? "" : `\u3000${info}`
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: lightboxClose, onClick: onClose, children: "\u2715 \u5173\u95ED" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "div",
          {
            style: {
              flex: 1,
              minHeight: 0,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...full ? { overflow: "auto" } : {}
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "img",
              {
                src: url,
                alt: name,
                onLoad: (event) => {
                  setDims({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight });
                },
                onClick: (event) => {
                  event.stopPropagation();
                  setFull((previous) => !previous);
                },
                style: {
                  borderRadius: 8,
                  boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
                  ...full ? { maxWidth: "none", maxHeight: "none", cursor: "zoom-out", flexShrink: 0 } : { maxWidth: "92vw", maxHeight: "100%", objectFit: "contain", cursor: "zoom-in" }
                }
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: lightboxBar, onClick: (event) => event.stopPropagation(), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...lightboxText, opacity: 0.6 }, children: full ? "\u70B9\u51FB\u56FE\u7247\u56DE\u5230\u9002\u5E94\u7A97\u53E3" : "\u70B9\u51FB\u56FE\u7247\u67E5\u770B\u539F\u59CB\u5C3A\u5BF8" }),
          path === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OpenSystemButton, { path, style: { marginLeft: "auto", flexShrink: 0 } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            DownloadButton,
            {
              url,
              name,
              style: { color: "#8fc4ff", flexShrink: 0, ...path === void 0 ? { marginLeft: "auto" } : {} }
            }
          )
        ] })
      ]
    }
  );
}
function useImageSource(image, loadImage) {
  const [url, setUrl] = (0, import_react.useState)(() => {
    if (image.preview !== void 0) return image.preview.url;
    if (image.attachment !== void 0 && loadImage?.peek !== void 0) return loadImage.peek(image.attachment);
    return void 0;
  });
  (0, import_react.useEffect)(() => {
    if (url !== void 0) return;
    if (image.preview !== void 0) {
      setUrl(image.preview.url);
      return;
    }
    if (image.attachment === void 0 || loadImage === void 0) return;
    let cancelled = false;
    void loadImage(image.attachment).then((loaded) => {
      if (!cancelled) setUrl(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [image, loadImage, url]);
  return url;
}
function GalleryTile({ image, loadImage, size, onOpen }) {
  const url = useImageSource(image, loadImage);
  const name = image.preview?.name ?? image.attachment?.name ?? image.label ?? "image";
  if (url === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: size, height: size, borderRadius: 8, background: "rgba(128,128,128,0.18)" } });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      type: "button",
      onClick: () => onOpen(url, name, image.attachment?.bytes),
      title: name,
      style: {
        padding: 0,
        border: "none",
        background: "none",
        cursor: "zoom-in",
        width: size,
        height: size,
        borderRadius: 8,
        overflow: "hidden"
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "img",
        {
          src: url,
          alt: name,
          style: { width: "100%", height: "100%", objectFit: "cover", display: "block" }
        }
      )
    }
  );
}
function MediaGallery({ images, loadImage, align = "start", compact = false, thumbnail = false }) {
  const [opened, setOpened] = (0, import_react.useState)(void 0);
  const size = thumbnail ? 56 : compact ? 80 : 112;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: align === "end" ? "flex-end" : "flex-start"
        },
        children: images.map((image, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          GalleryTile,
          {
            image,
            ...loadImage === void 0 ? {} : { loadImage },
            size,
            onOpen: (url, name, bytes) => setOpened({ url, name, ...bytes === void 0 ? {} : { size: bytes } })
          },
          image.attachment?.attachmentId ?? image.preview?.url ?? index
        ))
      }
    ),
    opened === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lightbox, { url: opened.url, name: opened.name, size: opened.size, onClose: () => setOpened(void 0) })
  ] });
}
function MediaVideoCard({ item }) {
  const url = apiFileUrl(item.path);
  const name = fileLabel(item);
  if (url === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, opacity: 0.75 }, children: [
      name,
      "\uFF08\u6587\u4EF6\u672A\u843D\u76D8\uFF0C\u65E0\u6CD5\u5185\u8054\u64AD\u653E\uFF09"
    ] });
  }
  const sizeText = formatBytes(item.bytes);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "video",
      {
        controls: true,
        preload: "metadata",
        src: url,
        style: {
          width: "min(520px, 100%)",
          maxHeight: "70vh",
          borderRadius: 10,
          background: "#000",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          display: "block"
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 10, alignItems: "center", maxWidth: "min(520px, 100%)" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 12, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
        "\u{1F3AC} ",
        name,
        sizeText === "" ? "" : ` \xB7 ${sizeText}`
      ] }),
      item.path === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OpenSystemButton, { path: item.path, style: { marginLeft: "auto", flexShrink: 0 } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DownloadButton, { url, name, style: { flexShrink: 0, ...item.path === void 0 ? { marginLeft: "auto" } : {} } })
    ] })
  ] });
}
function MediaItemGrid({ items }) {
  const [opened, setOpened] = (0, import_react.useState)(void 0);
  const images = items.filter((item) => item.kind === "image");
  const videos = items.filter((item) => item.kind === "video");
  const others = items.filter((item) => item.kind !== "image" && item.kind !== "video");
  const many = images.length > 1;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [
    images.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: images.map((item) => {
      const url = apiFileUrl(item.path);
      const name = fileLabel(item);
      if (url === void 0) return null;
      const sizeText = formatBytes(item.bytes);
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4, maxWidth: "100%" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            onClick: () => setOpened({
              url,
              name,
              ...item.bytes === void 0 ? {} : { size: item.bytes },
              ...item.path === void 0 ? {} : { path: item.path }
            }),
            style: {
              padding: 0,
              border: "none",
              background: "none",
              cursor: "zoom-in",
              lineHeight: 0,
              alignSelf: "flex-start",
              maxWidth: "100%"
            },
            title: name,
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "img",
              {
                src: url,
                alt: name,
                style: many ? { width: 96, height: 96, objectFit: "cover", borderRadius: 8, display: "block" } : { maxWidth: "min(360px, 100%)", maxHeight: 300, borderRadius: 8, display: "block" }
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 10, alignItems: "center", maxWidth: "min(360px, 100%)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 11, opacity: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
            name,
            sizeText === "" ? "" : ` \xB7 ${sizeText}`
          ] }),
          item.path === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OpenSystemButton, { path: item.path, style: { marginLeft: "auto", flexShrink: 0 } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DownloadButton, { url, name, style: { flexShrink: 0, ...item.path === void 0 ? { marginLeft: "auto" } : {} } })
        ] })
      ] }, item.path ?? item.name);
    }) }),
    videos.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaVideoCard, { item }, item.path ?? item.name)),
    others.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, opacity: 0.8 }, children: [
      "\u{1F4C4} ",
      item.path ?? item.name
    ] }, item.path ?? item.name)),
    opened === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lightbox, { url: opened.url, name: opened.name, size: opened.size, path: opened.path, onClose: () => setOpened(void 0) })
  ] });
}
function parseMediaMeta(meta) {
  if (meta === null || typeof meta !== "object") return void 0;
  const items = meta.items;
  if (!Array.isArray(items)) return void 0;
  return { items };
}

// src/client/command-row.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var containerStyle = {
  border: "1px solid rgba(128,128,128,0.28)",
  borderRadius: 10,
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 8
};
function MediaCommandRow(props) {
  const { node } = props;
  const title = node.name === "video" ? "\u{1F3AC} /video" : "\u{1F5BC}\uFE0F /image";
  const args = node.args?.trim() ?? "";
  const outcome = node.outcome;
  const payload = decodeCommandPayload(outcome?.text);
  const plain = stripCommandPayload(outcome?.text).trim();
  const failed = outcome?.kind === "error";
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: containerStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "baseline", fontSize: 12, opacity: 0.85 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { opacity: 0.75 }, children: args.slice(0, 120) }),
      outcome === null ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { opacity: 0.7 }, children: "\u751F\u6210\u4E2D\u2026" }) : null,
      failed ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { color: "#d9534f" }, children: "\u5931\u8D25" }) : null
    ] }),
    failed && plain !== "" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: 12, color: "#d9534f", whiteSpace: "pre-wrap" }, children: plain }) : null,
    payload !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(MediaItemGrid, { items: payload.items }) : null,
    !failed && plain !== "" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: 12, opacity: 0.75, whiteSpace: "pre-wrap" }, children: plain }) : null
  ] });
}

// src/client/gallery.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function MessageMediaImages(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    MediaGallery,
    {
      images: props.images,
      loadImage: props.loadImage,
      align: props.align,
      compact: props.compact ?? false,
      thumbnail: props.thumbnail ?? false
    }
  );
}

// src/client/settings-card.tsx
var import_react2 = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime4 = require("react/jsx-runtime");
var NS = "media-studio";
var PACKAGE_KEY = "@gw/dsh-media-studio";
var ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
var ENV_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
var IMAGE_RESOLUTIONS = ["1K", "2K", "3K", "4K"];
var IMAGE_RATIOS = ["1:1", "3:4", "4:3", "16:9", "9:16", "2:3", "3:2", "21:9"];
var VIDEO_SIZES = ["720P", "1080P", "1K", "2K"];
var VIDEO_RATIOS = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
var VIDEO_SECONDS = ["4", "5", "6", "7", "8", "9", "10", "11", "12"];
var PROVIDER_ADAPTERS = ["agnes", "openai", "openai-videos"];
var PROVIDER_PRESETS = [
  {
    key: "agnes",
    label: "Agnes\uFF08\u514D\u8D39\u989D\u5EA6\uFF09",
    labelFor: (kind) => kind === "image" ? "Agnes \u751F\u56FE" : "Agnes \u751F\u89C6\u9891",
    provider: "agnes",
    baseURL: "https://apihub.agnes-ai.com/v1",
    modelFor: (kind) => kind === "image" ? "agnes-image-2.5-flash" : "agnes-video-2.5-flash",
    suggestedIdFor: (kind) => kind === "image" ? "agnes-image" : "agnes-video",
    kinds: ["image", "video"]
  },
  {
    key: "openai-image",
    label: "OpenAI \u751F\u56FE",
    labelFor: () => "OpenAI \u751F\u56FE",
    provider: "openai",
    baseURL: "https://api.openai.com/v1",
    modelFor: () => "gpt-image-1",
    suggestedIdFor: () => "openai-image",
    kinds: ["image"]
  },
  {
    key: "openai-video",
    label: "OpenAI Sora 2",
    labelFor: () => "OpenAI Sora 2",
    provider: "openai-videos",
    baseURL: "https://api.openai.com/v1",
    modelFor: () => "sora-2",
    suggestedIdFor: () => "openai-sora2",
    kinds: ["video"]
  },
  {
    key: "gemini",
    label: "Gemini \u751F\u56FE",
    labelFor: () => "Gemini \u751F\u56FE",
    provider: "openai",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelFor: () => "gemini-2.5-flash-image",
    suggestedIdFor: () => "gemini-image",
    kinds: ["image"]
  },
  {
    key: "siliconflow",
    label: "\u7845\u57FA\u6D41\u52A8",
    labelFor: () => "\u7845\u57FA\u6D41\u52A8",
    provider: "openai",
    baseURL: "https://api.siliconflow.cn/v1",
    modelFor: () => "Kwai-Kolors/Kolors",
    suggestedIdFor: () => "siliconflow-image",
    kinds: ["image"]
  },
  {
    key: "dashscope",
    label: "\u963F\u91CC\u4E91\u767E\u70BC",
    labelFor: () => "\u963F\u91CC\u4E91\u767E\u70BC",
    provider: "openai",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    modelFor: () => "wanx2.1-t2i-turbo",
    suggestedIdFor: () => "dashscope-image",
    kinds: ["image"]
  },
  {
    key: "custom",
    label: "\u81EA\u5B9A\u4E49\uFF08\u624B\u586B\uFF09",
    labelFor: () => "",
    provider: "openai",
    baseURL: "",
    modelFor: () => "",
    suggestedIdFor: () => "",
    kinds: ["image", "video"]
  }
];
function guessProviderKey(provider, baseURL) {
  for (const preset of PROVIDER_PRESETS) {
    if (preset.key === "custom") continue;
    if (preset.provider === provider && preset.baseURL === baseURL) return preset.key;
  }
  return "custom";
}
function uniqueSuggestedId(base, taken) {
  if (!taken.has(base)) return base;
  for (let i = 2; ; i += 1) {
    if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  }
}
var MODEL_KEYS = /* @__PURE__ */ new Set(["imageModels", "videoModels"]);
var REQUIRED_PARAMS = {
  outputDir: "\u8F93\u51FA\u76EE\u5F55",
  imageResolution: "\u56FE\u7247\u5206\u8FA8\u7387",
  imageAspectRatio: "\u56FE\u7247\u753B\u5E45",
  videoSize: "\u89C6\u9891\u5C3A\u5BF8",
  videoAspectRatio: "\u89C6\u9891\u753B\u5E45"
};
var draftUidSeq = 0;
function newDraftUid() {
  draftUidSeq += 1;
  return `draft-${Date.now().toString(36)}-${draftUidSeq}`;
}
var box = { display: "flex", flexDirection: "column", gap: 12 };
var section = {
  border: "1px solid rgba(128,128,128,0.25)",
  borderRadius: 10,
  padding: "2px 14px 12px"
};
var summary = {
  cursor: "pointer",
  userSelect: "none",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 0"
};
var badge = {
  display: "inline-block",
  marginLeft: 8,
  verticalAlign: "1px",
  fontSize: 10,
  fontWeight: 500,
  opacity: 0.65,
  border: "1px solid rgba(128,128,128,0.4)",
  borderRadius: 999,
  padding: "1px 8px"
};
var body = { display: "flex", flexDirection: "column", gap: 12, paddingTop: 2 };
var sectionDesc = { fontSize: 11, opacity: 0.55, lineHeight: 1.6 };
var entryBox = {
  border: "1px solid rgba(128,128,128,0.22)",
  borderRadius: 8,
  background: "rgba(128,128,128,0.06)",
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 10
};
var btn = {
  border: "1px solid rgba(128,128,128,0.45)",
  borderRadius: 6,
  padding: "4px 12px",
  fontSize: 12,
  cursor: "pointer",
  background: "transparent",
  color: "inherit"
};
var fieldBox = { display: "flex", flexDirection: "column", gap: 4 };
var fieldLabel = { fontSize: 12, opacity: 0.8 };
var fieldHint = { fontSize: 11, opacity: 0.5, lineHeight: 1.5 };
var input = {
  border: "1px solid rgba(128,128,128,0.4)",
  borderRadius: 6,
  padding: "5px 8px",
  fontSize: 12,
  background: "transparent",
  color: "inherit",
  width: "100%",
  boxSizing: "border-box"
};
var tip = (bad) => ({
  fontSize: 12,
  color: bad ? "rgb(255,105,97)" : "rgb(52,199,89)",
  lineHeight: 1.5
});
function deriveRef(id) {
  return `MEDIA_STUDIO_${id.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_")}`;
}
function safeConfirm(message) {
  try {
    return window.confirm(message);
  } catch {
    return true;
  }
}
function sectionOf(scope) {
  const snap = scope?.getSnapshot?.();
  return snap?.status === "ready" ? snap.value : void 0;
}
function entriesOf(section2, key, kind) {
  const list = section2?.[key];
  if (!Array.isArray(list)) return [];
  return list.map((raw) => {
    const provider = String(raw?.provider ?? "openai");
    const baseURL = String(raw?.baseURL ?? "");
    return {
      draftUid: newDraftUid(),
      id: String(raw?.id ?? ""),
      label: String(raw?.label ?? ""),
      providerKey: guessProviderKey(provider, baseURL),
      provider,
      model: String(raw?.model ?? ""),
      baseURL,
      apiKeyEnv: String(raw?.apiKeyEnv ?? ""),
      keyDraft: ""
    };
  });
}
function Section(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("details", { style: section, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("summary", { style: summary, children: [
      props.title,
      props.badge === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: badge, children: props.badge })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: body, children: [
      props.desc === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: sectionDesc, children: props.desc }),
      props.children
    ] })
  ] });
}
function SelectRow(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: fieldBox, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("label", { style: fieldLabel, htmlFor: props.id, children: props.label }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "select",
      {
        id: props.id,
        style: input,
        value: props.value,
        disabled: props.disabled,
        onChange: (e) => props.onChange(e.target.value),
        children: [
          props.options.includes(props.value) ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: props.value, children: props.value }),
          props.options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: o, children: props.optionLabels?.[o] ?? o }, o))
        ]
      }
    ),
    props.hint === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: fieldHint, children: props.hint })
  ] });
}
function ProviderSelect(props) {
  const options = PROVIDER_PRESETS.filter((p) => p.kinds.includes(props.kind));
  const known = options.some((p) => p.key === props.value);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "select",
    {
      style: input,
      value: props.value,
      disabled: props.disabled,
      onChange: (e) => {
        if (e.target.value !== "") props.onChange(e.target.value);
      },
      children: [
        props.value === "" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: "", disabled: true, children: "\u9009\u62E9\u670D\u52A1\u5546\uFF0C\u81EA\u52A8\u586B\u597D\u5730\u5740\u548C\u6A21\u578B" }) : null,
        !known && props.value !== "" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: props.value, children: props.value }) : null,
        options.map((p) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: p.key, children: p.label }, p.key))
      ]
    }
  );
}
function ValueField(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    import_dsh_client_ui_primitives.SettingsValueField,
    {
      id: props.id,
      label: props.label,
      text: props.text,
      ...props.hint === void 0 ? {} : { hint: props.hint },
      ...props.placeholder === void 0 ? {} : { placeholder: props.placeholder },
      numeric: props.numeric === true,
      disabled: props.disabled === true,
      onEdit: props.onEdit,
      overridden: false,
      invalid: false,
      overriddenLabel: "",
      resetLabel: "",
      invalidLabel: "",
      onReset: () => {
      }
    }
  );
}
function EntryCard(props) {
  const e = props.entry;
  const uid = e.draftUid;
  const configured = props.keyStatus[e.apiKeyEnv.trim()] === true;
  const keyFilled = e.keyDraft.trim() !== "";
  const refName = e.apiKeyEnv.trim() !== "" ? e.apiKeyEnv.trim() : e.id.trim() !== "" ? deriveRef(e.id) : "\u4FDD\u5B58\u65F6\u6309 id \u81EA\u52A8\u6D3E\u751F";
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: entryBox, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: fieldBox, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("label", { style: fieldLabel, htmlFor: `ms-${uid}-provider`, children: "\u670D\u52A1\u5546" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        ProviderSelect,
        {
          kind: props.kind,
          value: e.providerKey,
          disabled: props.disabled,
          onChange: (v) => props.onProviderChange(v)
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: fieldHint, children: "\u9009\u4E2D\u5373\u81EA\u52A8\u586B\u5145\u63A5\u53E3\u5730\u5740\u548C\u53C2\u8003\u6A21\u578B\u540D\uFF1B\u4E0B\u62C9\u6CA1\u6709\u7684\u670D\u52A1\u5546\u9009\u300C\u81EA\u5B9A\u4E49\u300D\u624B\u586B" })
    ] }),
    e.providerKey === "custom" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      SelectRow,
      {
        id: `ms-${uid}-adapter`,
        label: "\u9002\u914D\u5668",
        hint: "\u63A5\u53E3\u534F\u8BAE\uFF1Aagnes=Agnes \u4E13\u6709\uFF1Bopenai=OpenAI \u517C\u5BB9\u56FE\u7247\u63A5\u53E3\uFF1Bopenai-videos=OpenAI \u98CE\u683C\u5F02\u6B65\u89C6\u9891\u63A5\u53E3",
        value: e.provider,
        options: PROVIDER_ADAPTERS,
        disabled: props.disabled,
        onChange: (v) => props.onChange({ provider: v })
      }
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      ValueField,
      {
        id: `ms-${uid}-id`,
        label: "id",
        hint: "\u5BF9\u8BDD / \u5DE5\u5177\u91CC\u5F15\u7528\u7684\u540D\u5B57\uFF1B\u51ED\u636E\u6309 id \u6D3E\u751F\uFF0C\u6539 id \u540E\u53EF\u80FD\u9700\u8981\u91CD\u65B0\u586B API Key",
        text: e.id,
        disabled: props.disabled,
        onEdit: (text) => props.onChange({ id: text })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      ValueField,
      {
        id: `ms-${uid}-label`,
        label: "\u663E\u793A\u540D",
        hint: "\u53EF\u9009\uFF0C\u63A8\u9001\u6D88\u606F\u91CC\u5C55\u793A",
        text: e.label,
        disabled: props.disabled,
        onEdit: (text) => props.onChange({ label: text })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      ValueField,
      {
        id: `ms-${uid}-model`,
        label: "\u6A21\u578B\u540D",
        text: e.model,
        disabled: props.disabled,
        onEdit: (text) => props.onChange({ model: text })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      ValueField,
      {
        id: `ms-${uid}-baseurl`,
        label: "\u63A5\u53E3\u5730\u5740\uFF08Base URL\uFF09",
        hint: "OpenAI \u517C\u5BB9\u5730\u5740\uFF0C\u4E00\u822C\u4EE5 /v1 \u7ED3\u5C3E",
        text: e.baseURL,
        disabled: props.disabled,
        onEdit: (text) => props.onChange({ baseURL: text })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      import_dsh_client_ui_primitives.SettingsSecretField,
      {
        id: `ms-${uid}-key`,
        label: "API Key",
        hint: `\u5199\u5165\u51ED\u636E\u5E93\u300C${refName}\u300D\uFF08\u53EA\u5199\u4E0D\u8BFB\uFF09\uFF1B\u4E5F\u53EF\u4EE5\u6539\u7528\u7CFB\u7EDF\u73AF\u5883\u53D8\u91CF`,
        text: e.keyDraft,
        disabled: props.disabled,
        configured: configured || keyFilled,
        stateLabel: keyFilled ? "\u5DF2\u8F93\u5165\uFF0C\u4FDD\u5B58\u540E\u751F\u6548" : configured ? "\u5DF2\u914D\u7F6E" : "\u672A\u914D\u7F6E",
        onEdit: (text) => props.onChange({ keyDraft: text })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { display: "flex", justifyContent: "flex-end" }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "button",
      {
        type: "button",
        style: { ...btn, border: "none", opacity: 0.6 },
        disabled: props.disabled,
        onClick: props.onRemove,
        children: "\u5220\u9664"
      }
    ) })
  ] });
}
function MediaStudioConfigCard(props) {
  const { ctx } = props;
  const [scope, setScope] = (0, import_react2.useState)(null);
  const [imageDrafts, setImageDrafts] = (0, import_react2.useState)([]);
  const [videoDrafts, setVideoDrafts] = (0, import_react2.useState)([]);
  const [params, setParams] = (0, import_react2.useState)({});
  const [keyStatus, setKeyStatus] = (0, import_react2.useState)({});
  const [baseline, setBaseline] = (0, import_react2.useState)("");
  const [error, setError] = (0, import_react2.useState)("");
  const [message, setMessage] = (0, import_react2.useState)("");
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const [saveFailed, setSaveFailed] = (0, import_react2.useState)(false);
  const loadAll = (0, import_react2.useCallback)(async () => {
    const section2 = sectionOf(scope);
    if (section2 === void 0) return {};
    const img = entriesOf(section2, "imageModels", "image");
    const vid = entriesOf(section2, "videoModels", "video");
    setImageDrafts(img);
    setVideoDrafts(vid);
    setParams({ ...section2 });
    setBaseline(JSON.stringify({ img, vid, params: { ...section2 } }));
    const names = [...new Set([...img, ...vid].map((d) => d.apiKeyEnv.trim()).filter((n) => n !== ""))];
    if (names.length === 0) {
      setKeyStatus({});
      return {};
    }
    const res = await ctx.remote.credentials.describe(names);
    const raw = res.ok && res.value !== void 0 ? res.value : {};
    const status = {};
    for (const [name, info] of Object.entries(raw)) status[name] = info?.configured === true;
    setKeyStatus(status);
    return status;
  }, [scope, ctx]);
  (0, import_react2.useEffect)(() => {
    try {
      setScope(ctx.configForms.get(NS));
    } catch {
      setScope(null);
      setSaveFailed(false);
      setError(`\u914D\u7F6E\u547D\u540D\u7A7A\u95F4\u300C${NS}\u300D\u4E0D\u53EF\u7528\u2014\u2014\u63D2\u4EF6\u6CA1\u5728 profile \u91CC\u52A0\u8F7D\u3002`);
      return;
    }
  }, [ctx]);
  (0, import_react2.useEffect)(() => {
    if (scope === null) return;
    void loadAll();
  }, [scope, loadAll]);
  const snapshotReady = scope !== null && sectionOf(scope) !== void 0;
  const snapshotWritable = snapshotReady && scope.getSnapshot().writable !== false;
  const isDirty = () => {
    if (baseline === "") return false;
    return JSON.stringify({ img: imageDrafts, vid: videoDrafts, params }) !== baseline;
  };
  const changeEntry = (kind, index, patch) => {
    const setter = kind === "image" ? setImageDrafts : setVideoDrafts;
    setter((prev) => prev.map((d, i) => i === index ? { ...d, ...patch } : d));
  };
  const removeEntry = (kind, index) => {
    const list = kind === "image" ? imageDrafts : videoDrafts;
    const removed = list[index];
    const setter = kind === "image" ? setImageDrafts : setVideoDrafts;
    setter((prev) => prev.filter((_, i) => i !== index));
    if (removed === void 0) return;
    const defKey = kind === "image" ? "defaultImageModel" : "defaultVideoModel";
    if (String(params[defKey] ?? "") === removed.id.trim()) {
      setParam(defKey, list.filter((_, i) => i !== index)[0]?.id ?? "");
    }
  };
  const addEntry = (kind) => {
    const fresh = {
      draftUid: newDraftUid(),
      id: "",
      label: "",
      providerKey: "",
      provider: kind === "image" ? "openai" : "openai-videos",
      model: "",
      baseURL: "",
      apiKeyEnv: "",
      keyDraft: ""
    };
    const setter = kind === "image" ? setImageDrafts : setVideoDrafts;
    setter((prev) => [...prev, fresh]);
  };
  const applyPreset = (kind, index, key) => {
    const preset = PROVIDER_PRESETS.find((p) => p.key === key);
    if (preset === void 0) return;
    const setter = kind === "image" ? setImageDrafts : setVideoDrafts;
    setter((prev) => prev.map((d, i) => {
      if (i !== index) return d;
      if (preset.key === "custom") return { ...d, providerKey: "custom" };
      const patch = {
        providerKey: key,
        provider: preset.provider,
        baseURL: preset.baseURL,
        model: preset.modelFor(kind)
      };
      if (d.label.trim() === "") patch.label = preset.labelFor(kind);
      if (d.id.trim() === "") {
        const taken = new Set([...prev].map((x) => x.id.trim()));
        patch.id = uniqueSuggestedId(preset.suggestedIdFor(kind), taken);
      }
      return { ...d, ...patch };
    }));
  };
  const setParam = (key, value) => setParams((prev) => ({ ...prev, [key]: value }));
  const param = (key) => String(params[key] ?? "");
  const reload = () => {
    if (isDirty() && !safeConfirm("\u6709\u672A\u4FDD\u5B58\u7684\u4FEE\u6539\uFF0C\u91CD\u65B0\u52A0\u8F7D\u4F1A\u4E22\u5F03\u8FD9\u4E9B\u4FEE\u6539\uFF0C\u786E\u5B9A\u5417\uFF1F")) return;
    void loadAll();
  };
  const save = async () => {
    if (scope === null || busy) return;
    const seenIds = /* @__PURE__ */ new Set();
    for (const d of [...imageDrafts, ...videoDrafts]) {
      if (d.providerKey === "" && d.id.trim() === "" && d.model.trim() === "" && d.baseURL.trim() === "") {
        setError("\u8FD8\u6709\u6CA1\u914D\u7F6E\u7684\u7A7A\u6761\u76EE\u2014\u2014\u9009\u4E2D\u670D\u52A1\u5546\u5373\u53EF\u81EA\u52A8\u586B\u597D\uFF0C\u4E0D\u9700\u8981\u7684\u6761\u76EE\u8BF7\u5220\u9664");
        return;
      }
      if (d.providerKey === "" && d.model.trim() === "" && d.baseURL.trim() === "") {
        setError(`\u6761\u76EE\u300C${d.id}\u300D\u8FD8\u6CA1\u9009\u670D\u52A1\u5546\u2014\u2014\u9009\u4E2D\u4F1A\u81EA\u52A8\u586B\u597D\u5730\u5740\u548C\u6A21\u578B\u540D\uFF0C\u6216\u9009\u300C\u81EA\u5B9A\u4E49\u300D\u624B\u586B`);
        return;
      }
      if (!ID_PATTERN.test(d.id.trim())) {
        setError(`\u6761\u76EE id\u300C${d.id || "(\u7A7A)"}\u300D\u8981\u4EE5\u5B57\u6BCD\u6216\u4E0B\u5212\u7EBF\u5F00\u5934\uFF0C\u53EA\u80FD\u542B\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u4E0B\u5212\u7EBF\u3001\u8FDE\u5B57\u7B26`);
        return;
      }
      if (seenIds.has(d.id.trim())) {
        setError(`\u6761\u76EE id\u300C${d.id}\u300D\u91CD\u590D\u4E86\uFF0C\u6539\u4E00\u4E2A\u4E0D\u4E00\u6837\u7684`);
        return;
      }
      seenIds.add(d.id.trim());
      if (d.model.trim() === "") {
        setError(`\u6761\u76EE\u300C${d.id}\u300D\u7684\u6A21\u578B\u540D\u4E0D\u80FD\u4E3A\u7A7A`);
        return;
      }
      if (d.baseURL.trim() === "") {
        setError(`\u6761\u76EE\u300C${d.id}\u300D\u7684\u63A5\u53E3\u5730\u5740\u4E0D\u80FD\u4E3A\u7A7A`);
        return;
      }
      if (d.apiKeyEnv.trim() !== "" && !ENV_PATTERN.test(d.apiKeyEnv.trim())) {
        setError(`\u6761\u76EE\u300C${d.id}\u300D\u7684\u51ED\u636E\u540D\u5FC5\u987B\u662F\u5408\u6CD5\u73AF\u5883\u53D8\u91CF\u540D\uFF08\u4E0D\u80FD\u5E26\u8FDE\u5B57\u7B26\uFF09`);
        return;
      }
    }
    for (const [key, label] of Object.entries(REQUIRED_PARAMS)) {
      if (String(params[key] ?? "").trim() === "") {
        setError(`\u300C${label}\u300D\u4E0D\u80FD\u4E3A\u7A7A`);
        return;
      }
    }
    setBusy(true);
    setError("");
    setSaveFailed(false);
    try {
      const fillRef = (d) => d.apiKeyEnv.trim() === "" ? { ...d, apiKeyEnv: deriveRef(d.id) } : d;
      const imageDraftsFilled = imageDrafts.map(fillRef);
      const videoDraftsFilled = videoDrafts.map(fillRef);
      setImageDrafts(imageDraftsFilled);
      setVideoDrafts(videoDraftsFilled);
      const paramsToWrite = { ...params };
      const imageIds = imageDraftsFilled.map((d) => d.id.trim());
      const videoIds = videoDraftsFilled.map((d) => d.id.trim());
      if (imageIds.length > 0 && !imageIds.includes(String(params.defaultImageModel ?? "").trim())) {
        paramsToWrite.defaultImageModel = imageIds[0];
      }
      if (videoIds.length > 0 && !videoIds.includes(String(params.defaultVideoModel ?? "").trim())) {
        paramsToWrite.defaultVideoModel = videoIds[0];
      }
      const snap = scope.getSnapshot();
      const strip = ({ draftUid: _u, keyDraft: _k, providerKey: _p, ...rest }) => rest;
      const ops = [
        { op: "set", path: ["imageModels"], value: imageDraftsFilled.map(strip) },
        { op: "set", path: ["videoModels"], value: videoDraftsFilled.map(strip) },
        ...Object.entries(paramsToWrite).filter(([k]) => !MODEL_KEYS.has(k)).map(([k, v]) => ({ op: "set", path: [k], value: v }))
      ];
      const landed = await scope.mutate(ops, snap.revision);
      if (landed !== true) {
        setSaveFailed(true);
        setError("\u4FDD\u5B58\u88AB\u62D2\u7EDD\uFF1A\u914D\u7F6E\u5DF2\u5728\u522B\u5904\u4FEE\u6539\uFF0C\u8BF7\u70B9\u300C\u91CD\u65B0\u52A0\u8F7D\u300D\u540E\u91CD\u8BD5");
        return;
      }
      for (const d of [...imageDraftsFilled, ...videoDraftsFilled]) {
        if (d.keyDraft.trim() !== "" && d.apiKeyEnv.trim() !== "") {
          const res = await ctx.remote.credentials.set(d.apiKeyEnv.trim(), d.keyDraft.trim());
          if (!res.ok) {
            setSaveFailed(true);
            setError(`\u300C${d.id}\u300D\u7684 Key \u5199\u5165\u51ED\u636E\u5E93\u5931\u8D25`);
            return;
          }
        }
      }
      const status = await loadAll();
      const missing = [...imageDraftsFilled, ...videoDraftsFilled].filter((d) => d.keyDraft.trim() === "" && status[d.apiKeyEnv.trim()] !== true).map((d) => d.id);
      setMessage(missing.length > 0 ? `\u5DF2\u4FDD\u5B58\u3002\u63D0\u9192\uFF1A${missing.join("\u3001")} \u8FD8\u6CA1\u914D\u7F6E API Key\uFF08\u4E5F\u6CA1\u68C0\u6D4B\u5230\u5DF2\u914D\u7F6E\u8FC7\uFF09\uFF0C\u751F\u6210\u65F6\u4F1A\u5931\u8D25` : "\u5DF2\u4FDD\u5B58\uFF0C\u914D\u7F6E\u5373\u65F6\u751F\u6548");
    } catch (err) {
      setSaveFailed(true);
      setError(`\u4FDD\u5B58\u51FA\u9519\uFF1A${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };
  const dirty = snapshotReady && isDirty();
  const disabled = !snapshotReady;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    import_dsh_client_ui_primitives.SettingsForm,
    {
      labels: {
        unavailable: "\u914D\u7F6E\u4E0D\u53EF\u7528\u2014\u2014\u63D2\u4EF6\u6CA1\u5728\u672C profile \u91CC\u52A0\u8F7D",
        readOnly: "\u5F53\u524D\u4E3A\u53EA\u8BFB\u72B6\u6001\uFF0C\u65E0\u6CD5\u4FEE\u6539\u914D\u7F6E",
        saveFailed: "\u4FDD\u5B58\u5931\u8D25\u2014\u2014\u8BF7\u6309\u4E0B\u65B9\u63D0\u793A\u4FEE\u6B63\u540E\u91CD\u8BD5",
        save: "\u4FDD\u5B58\u914D\u7F6E",
        saving: "\u4FDD\u5B58\u4E2D\u2026"
      },
      state: {
        available: snapshotReady,
        writable: snapshotWritable,
        dirty,
        invalid: false,
        saving: busy,
        failed: saveFailed
      },
      onSave: () => {
        void save();
      },
      onDiscard: () => {
        void loadAll();
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: box, children: [
        error !== "" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: tip(true), children: error }) : null,
        !snapshotReady && error === "" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: tip(true), children: "\u914D\u7F6E\u8FD8\u6CA1\u52A0\u8F7D\u597D\uFF0C\u7A0D\u7B49\u4E00\u4E0B\u518D\u8BD5\u3002" }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          Section,
          {
            title: "\u56FE\u7247\u6A21\u578B",
            badge: `${imageDrafts.length} \u4E2A`,
            desc: "\u9009\u670D\u52A1\u5546\u81EA\u52A8\u586B\u597D\u5730\u5740\u548C\u6A21\u578B\uFF0C\u586B\u4E0A API Key \u5C31\u80FD\u7528\uFF1B\u5BF9\u8BDD\u548C\u5DE5\u5177\u6309 id \u5F15\u7528\u6761\u76EE\u3002",
            children: [
              imageDrafts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: sectionDesc, children: "\u8FD8\u6CA1\u6709\u6761\u76EE\u2014\u2014\u70B9\u4E0B\u9762\u300C\u6DFB\u52A0\u300D\uFF0C\u9009\u4E2A\u670D\u52A1\u5546\u5C31\u586B\u597D\u5927\u534A\u4E86\u3002" }) : null,
              imageDrafts.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                EntryCard,
                {
                  entry: d,
                  kind: "image",
                  keyStatus,
                  disabled,
                  onChange: (patch) => changeEntry("image", i, patch),
                  onProviderChange: (key) => applyPreset("image", i, key),
                  onRemove: () => removeEntry("image", i)
                },
                d.draftUid
              )),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", style: btn, disabled, onClick: () => addEntry("image"), children: "+ \u6DFB\u52A0\u56FE\u7247\u6A21\u578B" }) })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          Section,
          {
            title: "\u89C6\u9891\u6A21\u578B",
            badge: `${videoDrafts.length} \u4E2A`,
            desc: "\u540C\u4E0A\uFF1B\u89C6\u9891\u4EFB\u52A1\u9ED8\u8BA4\u540E\u53F0\u751F\u6210\uFF0C\u5B8C\u6210\u540E\u63A8\u9001\u8FDB\u4F1A\u8BDD\u3002",
            children: [
              videoDrafts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: sectionDesc, children: "\u8FD8\u6CA1\u6709\u6761\u76EE\u2014\u2014\u70B9\u4E0B\u9762\u300C\u6DFB\u52A0\u300D\uFF0C\u9009\u4E2A\u670D\u52A1\u5546\u5C31\u586B\u597D\u5927\u534A\u4E86\u3002" }) : null,
              videoDrafts.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                EntryCard,
                {
                  entry: d,
                  kind: "video",
                  keyStatus,
                  disabled,
                  onChange: (patch) => changeEntry("video", i, patch),
                  onProviderChange: (key) => applyPreset("video", i, key),
                  onRemove: () => removeEntry("video", i)
                },
                d.draftUid
              )),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", style: btn, disabled, onClick: () => addEntry("video"), children: "+ \u6DFB\u52A0\u89C6\u9891\u6A21\u578B" }) })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          Section,
          {
            title: "\u9ED8\u8BA4\u53C2\u6570",
            desc: "\u8FD9\u91CC\u914D\u7F6E\u7684\u53EA\u662F\u9ED8\u8BA4\u503C\uFF1A\u751F\u6210\u65F6\u5728\u5BF9\u8BDD\u91CC\u660E\u786E\u6307\u5B9A\u4E86\u53C2\u6570\uFF08\u6A21\u578B\u3001\u5206\u8FA8\u7387\u3001\u753B\u5E45\u3001\u65F6\u957F\u7B49\uFF09\uFF0C\u4EE5\u5BF9\u8BDD\u6307\u5B9A\u7684\u4E3A\u51C6\u3002",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                ValueField,
                {
                  id: "ms-output-dir",
                  label: "\u8F93\u51FA\u76EE\u5F55",
                  hint: "\u652F\u6301 ~ \u5F00\u5934\uFF08\u5C55\u5F00\u5230\u7528\u6237\u4E3B\u76EE\u5F55\uFF09\uFF0C\u9ED8\u8BA4 ~/.dsh/media-studio\uFF1B\u76F8\u5BF9\u8DEF\u5F84\u57FA\u4E8E\u4F1A\u8BDD\u5DE5\u4F5C\u76EE\u5F55",
                  text: param("outputDir"),
                  disabled,
                  onEdit: (text) => setParam("outputDir", text)
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                SelectRow,
                {
                  id: "ms-autosave",
                  label: "\u81EA\u52A8\u4FDD\u5B58",
                  hint: "\u56FE\u7247\u662F\u5426\u989D\u5916\u843D\u76D8\u4E00\u4EFD\uFF08\u89C6\u9891\u59CB\u7EC8\u843D\u76D8\uFF0C\u64AD\u653E\u9700\u8981\u6587\u4EF6\uFF09",
                  value: params.autoSave === false ? "no" : "yes",
                  options: ["yes", "no"],
                  optionLabels: { yes: "\u5F00\u542F", no: "\u5173\u95ED" },
                  disabled,
                  onChange: (v) => setParam("autoSave", v === "yes")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { ...fieldLabel, fontWeight: 600, opacity: 0.6, marginTop: 2 }, children: "\u56FE\u7247" }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                SelectRow,
                {
                  id: "ms-image-resolution",
                  label: "\u5206\u8FA8\u7387",
                  hint: "\u5E38\u7528 1K\u20134K\uFF1B\u8981\u7528\u4EBA\u5BB6\u7684\u81EA\u5B9A\u4E49\u6863\u4F4D\u65F6\u6539 profile patch \u91CC\u7684 imageResolution",
                  value: param("imageResolution"),
                  options: IMAGE_RESOLUTIONS,
                  disabled,
                  onChange: (v) => setParam("imageResolution", v)
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                SelectRow,
                {
                  id: "ms-image-ratio",
                  label: "\u753B\u5E45",
                  hint: "\u5BBD\u9AD8\u6BD4\uFF0C\u5982 16:9 \u6A2A\u30019:16 \u7AD6",
                  value: param("imageAspectRatio"),
                  options: IMAGE_RATIOS,
                  disabled,
                  onChange: (v) => setParam("imageAspectRatio", v)
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { ...fieldLabel, fontWeight: 600, opacity: 0.6, marginTop: 2 }, children: "\u89C6\u9891" }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                SelectRow,
                {
                  id: "ms-video-seconds",
                  label: "\u65F6\u957F",
                  hint: "4\u201312 \u79D2",
                  value: param("videoSeconds"),
                  options: VIDEO_SECONDS,
                  disabled,
                  onChange: (v) => {
                    const n = Math.round(Number(v));
                    if (Number.isFinite(n)) setParam("videoSeconds", Math.min(12, Math.max(4, n)));
                  }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                SelectRow,
                {
                  id: "ms-video-size",
                  label: "\u5C3A\u5BF8",
                  hint: "\u5206\u8FA8\u7387\u6863\u4F4D",
                  value: param("videoSize"),
                  options: VIDEO_SIZES,
                  disabled,
                  onChange: (v) => setParam("videoSize", v)
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                SelectRow,
                {
                  id: "ms-video-ratio",
                  label: "\u753B\u5E45",
                  hint: "\u5BBD\u9AD8\u6BD4",
                  value: param("videoAspectRatio"),
                  options: VIDEO_RATIOS,
                  disabled,
                  onChange: (v) => setParam("videoAspectRatio", v)
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                SelectRow,
                {
                  id: "ms-default-image-model",
                  label: "\u9ED8\u8BA4\u56FE\u7247\u6A21\u578B",
                  hint: "\u5BF9\u8BDD\u91CC\u6CA1\u6307\u5B9A model \u65F6\u7684\u515C\u5E95",
                  value: param("defaultImageModel"),
                  options: imageDrafts.map((d) => d.id),
                  disabled,
                  onChange: (v) => setParam("defaultImageModel", v)
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                SelectRow,
                {
                  id: "ms-default-video-model",
                  label: "\u9ED8\u8BA4\u89C6\u9891\u6A21\u578B",
                  hint: "\u5BF9\u8BDD\u91CC\u6CA1\u6307\u5B9A model \u65F6\u7684\u515C\u5E95",
                  value: param("defaultVideoModel"),
                  options: videoDrafts.map((d) => d.id),
                  disabled,
                  onChange: (v) => setParam("defaultVideoModel", v)
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(Section, { title: "\u9AD8\u7EA7", desc: "\u8D85\u65F6\u4E0E\u8F6E\u8BE2\u8282\u594F\uFF08\u5355\u4F4D\uFF1A\u79D2\uFF09\uFF0C\u4E00\u822C\u4E0D\u7528\u6539\uFF1B\u4FDD\u5B58\u540E\u5373\u65F6\u751F\u6548\u3002", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            ValueField,
            {
              id: "ms-request-timeout",
              label: "\u8BF7\u6C42\u8D85\u65F6\uFF08\u79D2\uFF09",
              numeric: true,
              hint: "\u5355\u6B21\u751F\u6210 HTTP \u8BF7\u6C42\u7684\u6700\u957F\u7B49\u5F85\uFF0C\u9ED8\u8BA4 300 \u79D2",
              text: param("requestTimeoutSec"),
              disabled,
              onEdit: (text) => {
                const n = Math.round(Number(text));
                if (Number.isFinite(n)) setParam("requestTimeoutSec", n);
              }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            ValueField,
            {
              id: "ms-poll-interval",
              label: "\u89C6\u9891\u8F6E\u8BE2\u95F4\u9694\uFF08\u79D2\uFF09",
              numeric: true,
              hint: "\u67E5\u8BE2\u89C6\u9891\u4EFB\u52A1\u8FDB\u5EA6\u7684\u95F4\u9694\uFF0C\u9ED8\u8BA4 30 \u79D2",
              text: param("videoPollIntervalSec"),
              disabled,
              onEdit: (text) => {
                const n = Math.round(Number(text));
                if (Number.isFinite(n)) setParam("videoPollIntervalSec", n);
              }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            ValueField,
            {
              id: "ms-poll-timeout",
              label: "\u89C6\u9891\u8F6E\u8BE2\u4E0A\u9650\uFF08\u79D2\uFF09",
              numeric: true,
              hint: "\u8D85\u8FC7\u6B64\u65F6\u957F\u4EFB\u52A1\u8FD8\u6CA1\u5B8C\u6210\uFF0C\u6309\u5931\u8D25\u5904\u7406\uFF0C\u9ED8\u8BA4 300 \u79D2",
              text: param("videoPollTimeoutSec"),
              disabled,
              onEdit: (text) => {
                const n = Math.round(Number(text));
                if (Number.isFinite(n)) setParam("videoPollTimeoutSec", n);
              }
            }
          )
        ] }),
        message !== "" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: tip(false), children: message }) : null
      ] })
    }
  );
}
function registerConfigCard(ctx) {
  ctx.effect(() => ctx.configForms.whileServed([NS], () => ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register(
    { name: "plugins.bundle.config", key: PACKAGE_KEY, label: () => "\u5A92\u4F53\u751F\u6210" },
    (ownerProps) => (0, import_react2.createElement)(MediaStudioConfigCard, { ctx, view: ownerProps.view })
  ))));
}

// src/client/tool-row.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
function promptFromArgs(argsRaw) {
  if (argsRaw === void 0) return "";
  try {
    const parsed = JSON.parse(argsRaw);
    if (typeof parsed.prompt === "string") return parsed.prompt;
    if (typeof parsed.caption === "string") return parsed.caption;
    if (Array.isArray(parsed.paths)) return parsed.paths.map(String).join(", ");
  } catch {
  }
  return "";
}
function firstText(block) {
  for (const item of block.content ?? []) {
    if (item.type === "text" && typeof item.text === "string") return item.text;
  }
  return "";
}
var containerStyle2 = {
  border: "1px solid rgba(128,128,128,0.28)",
  borderRadius: 10,
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 8
};
var headStyle = {
  display: "flex",
  gap: 8,
  alignItems: "baseline",
  fontSize: 12,
  opacity: 0.85
};
function MediaToolRow(props) {
  const { phase, block, toolName } = props;
  const title = toolName === "generate_image" ? "\u{1F5BC}\uFE0F \u751F\u6210\u56FE\u7247" : toolName === "generate_video" ? "\u{1F3AC} \u751F\u6210\u89C6\u9891" : "\u{1F4CE} \u53D1\u9001\u5A92\u4F53\u6587\u4EF6";
  if (phase !== "result") {
    const prompt = promptFromArgs(block.argsRaw ?? block.call?.argsRaw);
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: containerStyle2, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: headStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: title }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: { opacity: 0.7 }, children: "\u751F\u6210\u4E2D\u2026" })
      ] }),
      prompt === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { fontSize: 12, opacity: 0.75 }, children: prompt })
    ] });
  }
  const meta = parseMediaMeta(block.meta);
  const text = firstText(block).trim();
  const failed = block.isError === true;
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: containerStyle2, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: headStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: failed ? "\u26A0\uFE0F" : title }),
      failed ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: { color: "#d9534f" }, children: "\u5931\u8D25" }) : null
    ] }),
    failed && text !== "" ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { fontSize: 12, color: "#d9534f", whiteSpace: "pre-wrap" }, children: text }) : null,
    meta !== void 0 && meta.items.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(MediaItemGrid, { items: meta.items }) : null,
    !failed && text !== "" ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { fontSize: 12, opacity: 0.75, whiteSpace: "pre-wrap" }, children: text }) : null
  ] });
}

// src/client/index.ts
var inject = ["slots", "remote", "remote.session", "remote.credentials", "configForms"];
function apply(ctx) {
  bindNativeOpen(ctx["remote.session"] ?? ctx.remote?.session);
  for (const key of ["generate_image", "generate_video", "send_media"]) {
    ctx.slots.inject("tool.call.toolview", () => ctx.slots.register(
      { name: "tool.call.toolview", key },
      MediaToolRow
    ));
  }
  for (const key of ["image", "video"]) {
    ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register(
      { name: "conversation.chat.commandview", key },
      MediaCommandRow
    ));
  }
  ctx.slots.inject("conversation.message.images", () => ctx.slots.register(
    { name: "conversation.message.images", priority: -1 },
    MessageMediaImages
  ));
  registerConfigCard(ctx);
}
;Object.defineProperty(module.exports,Symbol.toStringTag,{value:"Module"});return module.exports}});
