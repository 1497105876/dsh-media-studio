import { Config } from './config.js';
import { registerMediaCommands } from './commands.js';
import { registerMediaTools } from './tools.js';
export const name = 'media-studio';
export const inject = ['tools', 'commands', 'attachments', 'credentials'];
export { Config };
export function apply(ctx, config) {
    registerMediaTools(ctx, config);
    registerMediaCommands(ctx, config);
}
