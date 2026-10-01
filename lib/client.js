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
var import_jsx_runtime4 = require("react/jsx-runtime");
var NS = "media-studio";
var REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
var container = {
  display: "flex",
  flexDirection: "column",
  gap: 10
};
var row = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap"
};
var entryCard = {
  border: "1px solid rgba(128,128,128,0.25)",
  borderRadius: 8,
  padding: "8px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 6
};
var label = { fontSize: 11, opacity: 0.7 };
var input = {
  border: "1px solid rgba(128,128,128,0.4)",
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: 12,
  background: "transparent",
  color: "inherit"
};
var button = {
  border: "1px solid rgba(128,128,128,0.45)",
  borderRadius: 6,
  padding: "4px 12px",
  fontSize: 12,
  cursor: "pointer",
  background: "transparent",
  color: "inherit"
};
var badge = (configured) => ({
  fontSize: 10,
  borderRadius: 999,
  padding: "2px 8px",
  border: "1px solid",
  borderColor: configured ? "rgba(52,199,89,0.55)" : "rgba(128,128,128,0.4)",
  color: configured ? "rgb(52,199,89)" : "inherit",
  opacity: configured ? 1 : 0.65
});
var messageStyle = (isError) => ({
  fontSize: 12,
  color: isError ? "rgb(255,105,97)" : "rgb(52,199,89)",
  minHeight: 14
});
function credentialRefs(value) {
  const seen = /* @__PURE__ */ new Set();
  for (const key of ["imageModels", "videoModels"]) {
    const raw = value[key];
    if (!Array.isArray(raw)) continue;
    for (const entry of raw) {
      const name = typeof entry?.apiKeyEnv === "string" ? entry.apiKeyEnv.trim() : "";
      if (name !== "" && REF_PATTERN.test(name)) seen.add(name);
    }
  }
  return [...seen];
}
function CredentialRow(props) {
  const [value, setValue] = (0, import_react2.useState)("");
  const [error, setError] = (0, import_react2.useState)("");
  const info = props.info;
  const save = async () => {
    const trimmed = value.trim();
    if (trimmed === "") return;
    setError("");
    const res = await props.ctx.remote.credentials.set(props.name, trimmed);
    if (!res.ok) {
      setError("\u51ED\u636E\u670D\u52A1\u62D2\u7EDD\u4E86\u5199\u5165");
      return;
    }
    setValue("");
    props.onSaved();
  };
  const clear = async () => {
    setError("");
    const res = await props.ctx.remote.credentials.unset(props.name);
    if (!res.ok) {
      setError("\u51ED\u636E\u670D\u52A1\u62D2\u7EDD\u4E86\u6E05\u9664");
      return;
    }
    props.onSaved();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: entryCard, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("code", { style: { fontSize: 12 }, children: props.name }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: badge(info?.configured === true), children: info?.configured === true ? "\u5DF2\u914D\u7F6E" : "\u672A\u914D\u7F6E" }),
      info?.source === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: label, children: info.source })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "input",
        {
          style: { ...input, flex: "1 1 220px" },
          type: "password",
          placeholder: "\u7C98\u8D34 API Key\uFF08\u4FDD\u5B58\u8FDB dsh \u51ED\u636E\u5E93\uFF0C\u4E0D\u4F1A\u56DE\u663E\uFF09",
          value,
          onChange: (event) => setValue(event.target.value)
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: button, disabled: value.trim() === "", onClick: () => {
        void save();
      }, children: "\u4FDD\u5B58" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: button, disabled: info?.configured !== true, onClick: () => {
        void clear();
      }, children: "\u6E05\u9664" })
    ] }),
    error === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: messageStyle(true), children: error })
  ] });
}
function MediaStudioCredentialCard(props) {
  const ctx = props.ctx;
  const [refs, setRefs] = (0, import_react2.useState)([]);
  const [creds, setCreds] = (0, import_react2.useState)({});
  const [missing, setMissing] = (0, import_react2.useState)(false);
  const [error, setError] = (0, import_react2.useState)("");
  const load = (0, import_react2.useCallback)(async () => {
    setError("");
    const res = await ctx.remote.settings.describe();
    if (!res.ok || res.value === void 0) {
      setError("\u8BFB\u53D6\u914D\u7F6E\u5931\u8D25\uFF1A\u8BBE\u7F6E\u670D\u52A1\u4E0D\u53EF\u7528");
      return;
    }
    const found = res.value.namespaces.find((namespace) => namespace.ns === NS);
    if (found === void 0) {
      setMissing(true);
      setRefs([]);
      return;
    }
    setMissing(false);
    const nextRefs = credentialRefs(found.value);
    setRefs(nextRefs);
    if (nextRefs.length > 0) {
      const credRes = await ctx.remote.credentials.describe(nextRefs);
      if (credRes.ok && credRes.value !== void 0) setCreds(credRes.value);
    }
  }, [ctx]);
  (0, import_react2.useEffect)(() => {
    void load();
  }, [load]);
  (0, import_react2.useEffect)(() => {
    void ctx.remote.$on("credentials/reference-updated", () => {
      void load();
    });
  }, [load]);
  if (props.view === "summary") return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "\u5728\u5BF9\u8BDD\u91CC\u751F\u6210\u56FE\u7247 / \u89C6\u9891\uFF1BAPI Key \u5728\u51ED\u636E\u533A\u586B\u5199" });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: container, children: [
    missing ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: messageStyle(true), children: [
      "\u63D2\u4EF6\u672A\u52A0\u8F7D\uFF08\u627E\u4E0D\u5230\u914D\u7F6E\u547D\u540D\u7A7A\u95F4\u300C",
      NS,
      "\u300D\uFF09\u3002"
    ] }) : null,
    error === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: messageStyle(true), children: error }),
    refs.length === 0 && !missing ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: label, children: "\uFF08\u6A21\u578B\u6761\u76EE\u8FD8\u6CA1\u6709\u5F15\u7528\u4EFB\u4F55\u51ED\u636E\u540D\uFF1B\u5728\u914D\u7F6E\u8868\u5355\u91CC\u7ED9\u6761\u76EE\u586B\u300CKey \u73AF\u5883\u53D8\u91CF\u540D\u300D\uFF09" }) : null,
    refs.map((name) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      CredentialRow,
      {
        name,
        info: creds[name],
        ctx,
        onSaved: () => {
          void load();
        }
      },
      name
    )),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: label, children: "Key \u4E5F\u53EF\u4EE5\u4E0D\u586B\u5728\u8FD9\u91CC\uFF1A\u8BBE\u7F6E\u7CFB\u7EDF\u73AF\u5883\u53D8\u91CF\uFF08\u5982 setx AGNES_API_KEY \u2026\uFF09\u540E\u91CD\u542F dsh\uFF0C\u6548\u679C\u76F8\u540C\u3002" })
  ] });
}
function registerCredentialCard(rawCtx) {
  const ctx = rawCtx;
  ctx.effect(() => ctx.configForms.whileServed([NS], () => ctx.slots.inject("plugins.item", () => ctx.slots.register(
    {
      name: "plugins.item",
      id: NS,
      order: 40,
      label: () => "\u5A92\u4F53\u751F\u6210"
    },
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
