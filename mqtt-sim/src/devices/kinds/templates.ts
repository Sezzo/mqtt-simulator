import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';

export type DeviceTemplate = {
    kind: string; // "light", "switch", ...
    title?: string;
    capabilities?: Record<string, any>;
};

type TemplatesFile = {
    version?: number;
    templates: Record<string, DeviceTemplate>;
};

const DEFAULT_PATH = process.env.DEVICE_TEMPLATES_PATH || path.resolve(process.cwd(), 'config/device-templates.yaml');

let CACHE: { path: string; mtime: number; data: TemplatesFile } | null = null;

function readFileSafe(p: string): TemplatesFile {
    if (!fs.existsSync(p)) return { version: 1, templates: {} };
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = p.endsWith('.json') ? JSON.parse(raw) : (yaml.load(raw) as any);
    if (!parsed || typeof parsed !== 'object' || !parsed.templates) return { version: 1, templates: {} };
    return { version: parsed.version ?? 1, templates: parsed.templates ?? {} };
}

export function loadTemplates(filePath = DEFAULT_PATH): TemplatesFile {
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    const mtime = stat ? stat.mtimeMs : 0;
    if (CACHE && CACHE.path === filePath && CACHE.mtime === mtime) return CACHE.data;
    const data = readFileSafe(filePath);
    CACHE = { path: filePath, mtime, data };
    return data;
}

export function listTemplateIds(): string[] {
    return Object.keys(loadTemplates().templates);
}

export function getTemplate(id: string) {
    return loadTemplates().templates[id];
}

export function getTemplateMap(): Record<string, DeviceTemplate> {
    return loadTemplates().templates;
}
