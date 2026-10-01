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
function SaveAsButton({ url, name, style }) {
  const onClick = (0, import_react.useCallback)(async () => {
    const picker = window.showSaveFilePicker;
    if (typeof picker === "function") {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const handle = await picker({ suggestedName: name });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch {
      }
    }
    window.open(url, "_blank", "noopener");
  }, [url, name]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      type: "button",
      onClick: () => void onClick(),
      style: {
        fontSize: 12,
        color: "#4a90d9",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        ...style
      },
      children: "\u{1F4BE} \u53E6\u5B58\u4E3A"
    }
  );
}
function Lightbox({ url, name, onClose }) {
  (0, import_react.useEffect)(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      onClick: onClose,
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 1e3,
        background: "rgba(0,0,0,0.78)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src: url, alt: name, style: { maxWidth: "92vw", maxHeight: "80vh", borderRadius: 8 } }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 16, alignItems: "center" }, onClick: (event) => event.stopPropagation(), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DownloadButton, { url, name, style: { color: "#8fc4ff" } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SaveAsButton, { url, name, style: { color: "#8fc4ff" } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: onClose,
              style: { fontSize: 12, color: "#ddd", background: "none", border: "none", cursor: "pointer" },
              children: "\u2715 \u5173\u95ED"
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
      onClick: () => onOpen(url, name),
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
            onOpen: (url, name) => setOpened({ url, name })
          },
          image.attachment?.attachmentId ?? image.preview?.url ?? index
        ))
      }
    ),
    opened === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lightbox, { url: opened.url, name: opened.name, onClose: () => setOpened(void 0) })
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "video",
      {
        controls: true,
        preload: "metadata",
        src: url,
        style: { width: "min(420px, 100%)", borderRadius: 8, background: "#000" }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 14, alignItems: "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DownloadButton, { url, name }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SaveAsButton, { url, name }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "a",
        {
          href: url,
          target: "_blank",
          rel: "noopener noreferrer",
          style: { fontSize: 12, color: "#4a90d9", textDecoration: "none" },
          children: "\u2197 \u65B0\u7A97\u53E3\u6253\u5F00"
        }
      )
    ] })
  ] });
}
function MediaItemGrid({ items }) {
  const [opened, setOpened] = (0, import_react.useState)(void 0);
  const images = items.filter((item) => item.kind === "image");
  const videos = items.filter((item) => item.kind === "video");
  const others = items.filter((item) => item.kind !== "image" && item.kind !== "video");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [
    images.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: images.map((item) => {
      const url = apiFileUrl(item.path);
      const name = fileLabel(item);
      if (url === void 0) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            onClick: () => setOpened({ url, name }),
            style: { padding: 0, border: "none", background: "none", cursor: "zoom-in" },
            title: name,
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "img",
              {
                src: url,
                alt: name,
                style: { width: 112, height: 112, objectFit: "cover", borderRadius: 8, display: "block" }
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DownloadButton, { url, name }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SaveAsButton, { url, name })
        ] })
      ] }, item.path ?? item.name);
    }) }),
    videos.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaVideoCard, { item }, item.path ?? item.name)),
    others.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, opacity: 0.8 }, children: [
      "\u{1F4C4} ",
      item.path ?? item.name
    ] }, item.path ?? item.name)),
    opened === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lightbox, { url: opened.url, name: opened.name, onClose: () => setOpened(void 0) })
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
var REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
var PROVIDERS = ["agnes", "openai", "openai-videos"];
var IMAGE_RESOLUTIONS = ["1K", "2K", "3K", "4K"];
var IMAGE_RATIOS = ["1:1", "3:4", "4:3", "16:9", "9:16", "2:3", "3:2", "21:9"];
var VIDEO_SIZES = ["720P", "1080P", "1K", "2K"];
var VIDEO_RATIOS = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
var box = { display: "flex", flexDirection: "column", gap: 14 };
var group = {
  border: "1px solid rgba(128,128,128,0.28)",
  borderRadius: 10,
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 10
};
var groupTitle = { fontSize: 13, fontWeight: 600, opacity: 0.9 };
var row = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };
var fieldCol = { display: "flex", flexDirection: "column", gap: 3, flex: "1 1 140px", minWidth: 120 };
var fieldLabel = { fontSize: 11, opacity: 0.7 };
var input = {
  border: "1px solid rgba(128,128,128,0.4)",
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: 12,
  background: "transparent",
  color: "inherit"
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
var btnPrimary = { ...btn, fontWeight: 600 };
var tip = (bad) => ({
  fontSize: 12,
  minHeight: 14,
  color: bad ? "rgb(255,105,97)" : "rgb(52,199,89)"
});
function deriveRef(id) {
  return `MEDIA_STUDIO_${id.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_")}`;
}
function sectionOf(scope) {
  const snap = scope?.getSnapshot?.();
  return snap?.status === "ready" ? snap.value : void 0;
}
function entriesOf(section, key) {
  const list = section?.[key];
  if (!Array.isArray(list)) return [];
  return list.map((raw) => ({
    id: String(raw?.id ?? ""),
    label: String(raw?.label ?? ""),
    provider: String(raw?.provider ?? "openai"),
    model: String(raw?.model ?? ""),
    baseURL: String(raw?.baseURL ?? ""),
    apiKeyEnv: String(raw?.apiKeyEnv ?? ""),
    keyDraft: "",
    keyConfigured: false
  }));
}
function Field(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { style: fieldCol, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: fieldLabel, children: props.label }),
    props.children
  ] });
}
function Select(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("select", { style: input, value: props.value, onChange: (e) => props.onChange(e.target.value), children: [
    props.options.includes(props.value) ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: props.value, children: props.value }),
    props.options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: o, children: o }, o))
  ] });
}
function EntryCard(props) {
  const e = props.entry;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { ...group, padding: "8px 10px", gap: 6 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("code", { style: { fontSize: 12 }, children: e.id || "(\u65B0\u6761\u76EE)" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: fieldLabel, children: e.label }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { flex: 1 } }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: btn, onClick: props.onRemove, children: "\u5220\u9664" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "id\uFF08\u547D\u4EE4/\u5DE5\u5177\u91CC\u5F15\u7528\uFF09", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { style: input, value: e.id, onChange: (ev) => props.onChange({ id: ev.target.value }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "\u663E\u793A\u540D", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { style: input, value: e.label, onChange: (ev) => props.onChange({ label: ev.target.value }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "\u670D\u52A1\u5546", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Select, { value: e.provider, options: PROVIDERS, onChange: (v) => props.onChange({ provider: v }) }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "\u6A21\u578B\u540D", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { style: input, value: e.model, onChange: (ev) => props.onChange({ model: ev.target.value }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "\u63A5\u53E3\u5730\u5740\uFF08Base URL\uFF09", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { style: input, value: e.baseURL, onChange: (ev) => props.onChange({ baseURL: ev.target.value }) }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      import_dsh_client_ui_primitives.SettingsSecretField,
      {
        id: `media-studio-key-${e.id || "new"}`,
        label: "API Key",
        hint: "\u4FDD\u5B58\u5728 dsh \u51ED\u636E\u5E93\u91CC\uFF08\u53EA\u5199\u4E0D\u8BFB\uFF09\uFF1B\u4E5F\u53EF\u4EE5\u6539\u7528\u7CFB\u7EDF\u73AF\u5883\u53D8\u91CF",
        text: e.keyDraft,
        disabled: false,
        configured: e.keyConfigured,
        stateLabel: e.keyConfigured ? "\u5DF2\u914D\u7F6E" : "\u672A\u914D\u7F6E",
        onEdit: (text) => props.onChange({ keyDraft: text })
      }
    )
  ] });
}
function MediaStudioConfigCard(props) {
  const { ctx } = props;
  const [scope, setScope] = (0, import_react2.useState)(null);
  const [imageDrafts, setImageDrafts] = (0, import_react2.useState)([]);
  const [videoDrafts, setVideoDrafts] = (0, import_react2.useState)([]);
  const [params, setParams] = (0, import_react2.useState)({});
  const [error, setError] = (0, import_react2.useState)("");
  const [message, setMessage] = (0, import_react2.useState)("");
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const loadAll = (0, import_react2.useCallback)(async () => {
    const section = sectionOf(scope);
    if (section === void 0) return;
    const img = entriesOf(section, "imageModels");
    const vid = entriesOf(section, "videoModels");
    setImageDrafts(img);
    setVideoDrafts(vid);
    setParams({ ...section });
    const names = [...new Set([...img, ...vid].map((d) => d.apiKeyEnv.trim()).filter((n) => n !== ""))];
    if (names.length === 0) return;
    const res = await ctx.remote.credentials.describe(names);
    if (!res.ok || res.value === void 0) return;
    const mark = (list) => list.map((d) => ({ ...d, keyConfigured: res.value[d.apiKeyEnv.trim()]?.configured === true }));
    setImageDrafts(mark);
    setVideoDrafts(mark);
  }, [scope, ctx]);
  (0, import_react2.useEffect)(() => {
    try {
      setScope(ctx.configForms.get(NS));
    } catch {
      setError(`\u914D\u7F6E\u547D\u540D\u7A7A\u95F4\u300C${NS}\u300D\u4E0D\u53EF\u7528\u2014\u2014\u63D2\u4EF6\u6CA1\u5728 profile \u91CC\u52A0\u8F7D\u3002`);
      return;
    }
  }, [ctx]);
  (0, import_react2.useEffect)(() => {
    if (scope === null) return;
    void loadAll();
  }, [scope, loadAll]);
  if (error !== "" && scope === null) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: box, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: tip(true), children: error }) });
  }
  const changeEntry = (kind, index, patch) => {
    const setter = kind === "image" ? setImageDrafts : setVideoDrafts;
    setter((prev) => prev.map((d, i) => i === index ? { ...d, ...patch } : d));
  };
  const removeEntry = (kind, index) => {
    const setter = kind === "image" ? setImageDrafts : setVideoDrafts;
    setter((prev) => prev.filter((_, i) => i !== index));
  };
  const addEntry = (kind) => {
    const fresh = {
      id: "",
      label: "",
      provider: kind === "image" ? "openai" : "openai-videos",
      model: "",
      baseURL: "",
      apiKeyEnv: "",
      keyDraft: "",
      keyConfigured: false
    };
    const setter = kind === "image" ? setImageDrafts : setVideoDrafts;
    setter((prev) => [...prev, fresh]);
  };
  const save = async () => {
    if (scope === null) return;
    const seenIds = /* @__PURE__ */ new Set();
    for (const d of [...imageDrafts, ...videoDrafts]) {
      if (!REF_PATTERN.test(d.id.trim())) {
        setError(`\u6761\u76EE id\u300C${d.id || "(\u7A7A)"}\u300D\u5FC5\u987B\u662F\u5B57\u6BCD/\u6570\u5B57/\u8FDE\u5B57\u7B26`);
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
      if (d.apiKeyEnv.trim() !== "" && !REF_PATTERN.test(d.apiKeyEnv.trim())) {
        setError(`\u6761\u76EE\u300C${d.id}\u300D\u7684\u51ED\u636E\u540D\u5FC5\u987B\u662F\u5408\u6CD5\u73AF\u5883\u53D8\u91CF\u540D`);
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      const fillRef = (d) => d.apiKeyEnv.trim() === "" ? { ...d, apiKeyEnv: deriveRef(d.id) } : d;
      const imageDraftsFilled = imageDrafts.map(fillRef);
      const videoDraftsFilled = videoDrafts.map(fillRef);
      setImageDrafts(imageDraftsFilled);
      setVideoDrafts(videoDraftsFilled);
      const snap = scope.getSnapshot();
      const strip = ({ keyDraft: _k, keyConfigured: _c, ...rest }) => rest;
      const ops = [
        { op: "set", path: ["imageModels"], value: imageDraftsFilled.map(strip) },
        { op: "set", path: ["videoModels"], value: videoDraftsFilled.map(strip) },
        ...Object.entries(params).map(([k, v]) => ({ op: "set", path: [k], value: v }))
      ];
      const ok = await scope.apply(ops, snap.revision);
      if (!ok) {
        setError("\u4FDD\u5B58\u88AB\u62D2\u7EDD\uFF1A\u914D\u7F6E\u5DF2\u5728\u522B\u5904\u4FEE\u6539\uFF0C\u8BF7\u70B9\u300C\u91CD\u65B0\u52A0\u8F7D\u300D\u540E\u91CD\u8BD5");
        return;
      }
      for (const d of [...imageDraftsFilled, ...videoDraftsFilled]) {
        if (d.keyDraft.trim() !== "" && d.apiKeyEnv.trim() !== "") {
          const res = await ctx.remote.credentials.set(d.apiKeyEnv.trim(), d.keyDraft.trim());
          if (!res.ok) {
            setError(`\u300C${d.id}\u300D\u7684 Key \u5199\u5165\u51ED\u636E\u5E93\u5931\u8D25`);
            return;
          }
        }
      }
      await loadAll();
      setMessage("\u5DF2\u4FDD\u5B58\uFF0C\u914D\u7F6E\u5373\u65F6\u751F\u6548");
    } finally {
      setBusy(false);
    }
  };
  const setParam = (key, value) => setParams((prev) => ({ ...prev, [key]: value }));
  const param = (key) => String(params[key] ?? "");
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: box, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: groupTitle, children: [
        "\u56FE\u7247\u6A21\u578B\uFF08",
        imageDrafts.length,
        "\uFF09"
      ] }),
      imageDrafts.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        EntryCard,
        {
          entry: d,
          onChange: (patch) => changeEntry("image", i, patch),
          onRemove: () => removeEntry("image", i)
        },
        i
      )),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: btn, onClick: () => addEntry("image"), children: "+ \u6DFB\u52A0\u56FE\u7247\u6A21\u578B" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: groupTitle, children: [
        "\u89C6\u9891\u6A21\u578B\uFF08",
        videoDrafts.length,
        "\uFF09"
      ] }),
      videoDrafts.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        EntryCard,
        {
          entry: d,
          onChange: (patch) => changeEntry("video", i, patch),
          onRemove: () => removeEntry("video", i)
        },
        i
      )),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: btn, onClick: () => addEntry("video"), children: "+ \u6DFB\u52A0\u89C6\u9891\u6A21\u578B" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: groupTitle, children: "\u9ED8\u8BA4\u53C2\u6570" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "\u9ED8\u8BA4\u56FE\u7247\u6A21\u578B", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          Select,
          {
            value: param("defaultImageModel"),
            options: imageDrafts.map((d) => d.id),
            onChange: (v) => setParam("defaultImageModel", v)
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "\u9ED8\u8BA4\u89C6\u9891\u6A21\u578B", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          Select,
          {
            value: param("defaultVideoModel"),
            options: videoDrafts.map((d) => d.id),
            onChange: (v) => setParam("defaultVideoModel", v)
          }
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "\u8F93\u51FA\u76EE\u5F55\uFF08\u76F8\u5BF9\u4F1A\u8BDD\u5DE5\u4F5C\u76EE\u5F55\uFF09", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { style: input, value: param("outputDir"), onChange: (e) => setParam("outputDir", e.target.value) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "\u81EA\u52A8\u4FDD\u5B58", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "select",
          {
            style: input,
            value: params.autoSave === false ? "no" : "yes",
            onChange: (e) => setParam("autoSave", e.target.value === "yes"),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: "yes", children: "\u5F00\u542F" }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: "no", children: "\u5173\u95ED" })
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "\u56FE\u7247\u5206\u8FA8\u7387", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Select, { value: param("imageResolution"), options: IMAGE_RESOLUTIONS, onChange: (v) => setParam("imageResolution", v) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "\u56FE\u7247\u753B\u5E45", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Select, { value: param("imageAspectRatio"), options: IMAGE_RATIOS, onChange: (v) => setParam("imageAspectRatio", v) }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "\u89C6\u9891\u65F6\u957F\uFF084\u201312 \u79D2\uFF09", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "input",
          {
            style: input,
            type: "number",
            min: 4,
            max: 12,
            value: typeof params.videoSeconds === "number" ? params.videoSeconds : 5,
            onChange: (e) => setParam("videoSeconds", Math.min(12, Math.max(4, Number(e.target.value) || 5)))
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "\u89C6\u9891\u5C3A\u5BF8", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Select, { value: param("videoSize"), options: VIDEO_SIZES, onChange: (v) => setParam("videoSize", v) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "\u89C6\u9891\u753B\u5E45", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Select, { value: param("videoAspectRatio"), options: VIDEO_RATIOS, onChange: (v) => setParam("videoAspectRatio", v) }) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: btnPrimary, disabled: busy, onClick: () => {
        void save();
      }, children: busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u914D\u7F6E" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: btn, disabled: busy, onClick: () => {
        void loadAll();
      }, children: "\u91CD\u65B0\u52A0\u8F7D" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: tip(error !== ""), children: error !== "" ? error : message })
    ] })
  ] });
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
var inject = ["slots", "remote", "remote.credentials", "configForms"];
function apply(ctx) {
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
