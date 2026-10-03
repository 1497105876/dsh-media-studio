declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        /** Standing display rules from this plugin (queued context, never rendered). */
        'media-studio': {
            kind: 'media-studio';
        } & {
            form: 'instructions';
        };
    }
}
export declare const MEDIA_DISPLAY_INSTRUCTIONS: string;
/** Queue the display instructions once per agent (no wake; claimed at the next pre-step). */
export declare function ensureMediaInstructions(ctx: {
    get(name: string): unknown;
}, agentId: string | undefined): void;
