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
var box = { display: "flex", flexDirection: "column", gap: 10 };
var row = { display: "flex", gap: 8, alignItems: "center" };
var note = { fontSize: 11, opacity: 0.7 };
var tip = (bad) => ({
  fontSize: 12,
  minHeight: 14,
  color: bad ? "rgb(255,105,97)" : "rgb(52,199,89)"
});
var btn = {
  border: "1px solid rgba(128,128,128,0.45)",
  borderRadius: 6,
  padding: "3px 12px",
  fontSize: 12,
  cursor: "pointer",
  background: "transparent",
  color: "inherit"
};
function collectRefs(section) {
  const names = /* @__PURE__ */ new Set();
  if (section === void 0) return [];
  for (const key of ["imageModels", "videoModels"]) {
    const list = section[key];
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const name = typeof entry?.apiKeyEnv === "string" ? entry.apiKeyEnv.trim() : "";
      if (name !== "" && REF_PATTERN.test(name)) names.add(name);
    }
  }
  return [...names];
}
function CredentialRow(props) {
  const [draft, setDraft] = (0, import_react2.useState)("");
  const [error, setError] = (0, import_react2.useState)("");
  const save = async () => {
    if (draft.trim() === "") return;
    if (!await props.onSave(draft.trim())) {
      setError("\u51ED\u636E\u670D\u52A1\u62D2\u7EDD\u4E86\u5199\u5165");
      return;
    }
    setDraft("");
    setError("");
  };
  const clear = async () => {
    if (!await props.onClear()) {
      setError("\u51ED\u636E\u670D\u52A1\u62D2\u7EDD\u4E86\u6E05\u9664");
      return;
    }
    setError("");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      import_dsh_client_ui_primitives.SettingsSecretField,
      {
        id: `media-studio-cred-${props.name}`,
        label: props.name,
        hint: "\u4FDD\u5B58\u8FDB dsh \u51ED\u636E\u5E93\uFF08\u53EA\u5199\u4E0D\u8BFB\uFF09\uFF1B\u4E5F\u53EF\u4EE5\u6539\u7528\u7CFB\u7EDF\u73AF\u5883\u53D8\u91CF",
        text: draft,
        disabled: false,
        configured: props.configured,
        stateLabel: props.configured ? "\u5DF2\u914D\u7F6E" : "\u672A\u914D\u7F6E",
        onEdit: setDraft
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: btn, disabled: draft.trim() === "", onClick: () => {
        void save();
      }, children: "\u4FDD\u5B58" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: btn, disabled: !props.configured, onClick: () => {
        void clear();
      }, children: "\u6E05\u9664" }),
      error === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: tip(true), children: error })
    ] })
  ] });
}
function MediaStudioCredentialCard(props) {
  const { ctx } = props;
  const [refs, setRefs] = (0, import_react2.useState)([]);
  const [status, setStatus] = (0, import_react2.useState)("loading");
  const [creds, setCreds] = (0, import_react2.useState)({});
  const [error, setError] = (0, import_react2.useState)("");
  const refresh = (0, import_react2.useCallback)(async (names) => {
    if (names.length === 0) {
      setCreds({});
      return;
    }
    const res = await ctx.remote.credentials.describe(names);
    if (res.ok && res.value !== void 0) setCreds(res.value);
  }, [ctx]);
  (0, import_react2.useEffect)(() => {
    let scope;
    try {
      scope = ctx.configForms.get(NS);
    } catch {
      setStatus("unavailable");
      return;
    }
    const sync = () => {
      const snap = scope.getSnapshot();
      setStatus(snap.status);
      const names = collectRefs(snap.value);
      setRefs(names);
      void refresh(names);
    };
    sync();
    return scope.subscribe(sync);
  }, [ctx, refresh]);
  (0, import_react2.useEffect)(() => {
    void ctx.remote.$on("credentials/reference-updated", (ref) => {
      if (typeof ref !== "string" || refs.includes(ref)) void refresh(refs);
    });
  }, [ctx, refs, refresh]);
  if (props.view !== void 0 && props.view !== "page") return null;
  if (status === "unavailable") {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: box, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: tip(true), children: [
      "\u914D\u7F6E\u547D\u540D\u7A7A\u95F4\u300C",
      NS,
      "\u300D\u4E0D\u53EF\u7528\u2014\u2014\u63D2\u4EF6\u6CA1\u5728 profile \u91CC\u52A0\u8F7D\u3002"
    ] }) });
  }
  const setKey = (name) => async (key) => (await ctx.remote.credentials.set(name, key)).ok;
  const clearKey = (name) => async () => (await ctx.remote.credentials.unset(name)).ok;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: box, children: [
    status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: note, children: "\u6B63\u5728\u8BFB\u53D6\u914D\u7F6E\u2026" }) : null,
    refs.length === 0 && status === "ready" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: note, children: "\uFF08\u6A21\u578B\u6761\u76EE\u8FD8\u6CA1\u6709\u5F15\u7528\u51ED\u636E\u540D\uFF1B\u5728\u4E0A\u9762\u7684\u914D\u7F6E\u8868\u5355\u91CC\u7ED9\u6761\u76EE\u586B apiKeyEnv\uFF09" }) : null,
    refs.map((name) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      CredentialRow,
      {
        name,
        configured: creds[name]?.configured === true,
        onSave: setKey(name),
        onClear: clearKey(name)
      },
      name
    )),
    error === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: tip(true), children: error })
  ] });
}
function registerCredentialCard(ctx) {
  ctx.effect(() => ctx.configForms.whileServed([NS], () => ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register(
    { name: "plugins.bundle.config", key: PACKAGE_KEY, label: () => "\u5A92\u4F53\u751F\u6210" },
    (ownerProps) => (0, import_react2.createElement)(MediaStudioCredentialCard, {
      ctx,
      view: ownerProps.view
    })
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
  registerCredentialCard(ctx);
}
;Object.defineProperty(module.exports,Symbol.toStringTag,{value:"Module"});return module.exports}});
