/**
 * Shared value and presentation types for the dsh-media-studio host plugin and
 * its web client half. Everything here is lossless JSON (canonical tool
 * values, `output.presentationMeta` payloads, and the slash-command payload),
 * so both sides can consume it without importing each other's runtime code.
 */
/** Marker framing the command payload inside `CommandResult.text`. */
export const COMMAND_PAYLOAD_OPEN = '⟨media-studio⟩';
/** Marker framing the command payload inside `CommandResult.text`. */
export const COMMAND_PAYLOAD_CLOSE = '⟨/media-studio⟩';
/** Frame one payload for `CommandResult.text`. */
export function encodeCommandPayload(payload) {
    return `${COMMAND_PAYLOAD_OPEN}${JSON.stringify(payload)}${COMMAND_PAYLOAD_CLOSE}`;
}
/** Recover the payload from a recorded `CommandNode.outcome.text`, if present. */
export function decodeCommandPayload(text) {
    if (text === undefined)
        return undefined;
    const start = text.indexOf(COMMAND_PAYLOAD_OPEN);
    const end = text.indexOf(COMMAND_PAYLOAD_CLOSE);
    if (start < 0 || end < start)
        return undefined;
    try {
        const parsed = JSON.parse(text.slice(start + COMMAND_PAYLOAD_OPEN.length, end));
        return parsed !== null && typeof parsed === 'object' && parsed.v === 1 ? parsed : undefined;
    }
    catch {
        return undefined;
    }
}
/** Strip the payload marker from a command result so fallback rows stay readable. */
export function stripCommandPayload(text) {
    if (text === undefined)
        return '';
    const start = text.indexOf(COMMAND_PAYLOAD_OPEN);
    const end = text.indexOf(COMMAND_PAYLOAD_CLOSE);
    if (start < 0 || end < start)
        return text;
    return `${text.slice(0, start)}${text.slice(end + COMMAND_PAYLOAD_CLOSE.length)}`.trim();
}
