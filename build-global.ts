export type JsonObject = { [key: string]: any };

const KEYWORD_PREFIX = 'GLOBAL_KEYWORD_';
const BARE_TERM = /^«TERM:[^»]+»$/;

/** Every GLOBAL_KEYWORD_* becomes mechanics.<suffix>, unless the explicit map already owns that path. */
export const mechanicsFromKeywords = (
	hsTerms: Record<string, string>,
	explicitPaths: ReadonlySet<string>,
): Record<string, string> => {
	const extra: Record<string, string> = {};
	for (const key of Object.keys(hsTerms)) {
		if (!key.startsWith(KEYWORD_PREFIX)) {
			continue;
		}
		const suffix = key.slice(KEYWORD_PREFIX.length).toLowerCase();
		if (!suffix) {
			continue;
		}
		const path = `mechanics.${suffix}`;
		if (explicitPaths.has(path)) {
			continue;
		}
		if (!hsTerms[key]?.trim()) {
			continue;
		}
		extra[path] = key;
	}
	return extra;
};

/** Explicit map entries win over the generated keyword paths. */
export const mergeTermMaps = (
	explicitMap: Record<string, string>,
	keywordMap: Record<string, string>,
): Record<string, string> => {
	return { ...keywordMap, ...explicitMap };
};

/**
 * Paths whose first segment is a top-level locale key (`app.…`) are written on the locale root.
 * Every other path stays relative to `global`, matching the existing map.
 */
export const splitTermMap = (
	map: Record<string, string>,
	rootKeys: ReadonlySet<string>,
): { globalRelative: Record<string, string>; fromRoot: Record<string, string> } => {
	const globalRelative: Record<string, string> = {};
	const fromRoot: Record<string, string> = {};
	for (const [path, termKey] of Object.entries(map)) {
		const head = path.split('.')[0];
		if (rootKeys.has(head)) {
			fromRoot[path] = termKey;
		} else {
			globalRelative[path] = termKey;
		}
	}
	return { globalRelative, fromRoot };
};

export const findBareTermTokens = (json: JsonObject, prefix = ''): string[] => {
	const hits: string[] = [];
	for (const [key, value] of Object.entries(json ?? {})) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof value === 'string') {
			if (BARE_TERM.test(value.trim())) {
				hits.push(`${path} = ${value.trim()}`);
			}
		} else if (value && typeof value === 'object' && !Array.isArray(value)) {
			hits.push(...findBareTermTokens(value, path));
		}
	}
	return hits;
};

export const buildConstructedGlobal = (
	map: Record<string, string>,
	hsTerms: Record<string, string>,
): { global: JsonObject; missing: string[] } => {
	const global: JsonObject = {};
	const missing: string[] = [];
	for (const [path, termKey] of Object.entries(map)) {
		const value = hsTerms[termKey]?.trim();
		if (!value) {
			missing.push(`${path} -> ${termKey}`);
			continue;
		}
		setPath(global, path, value);
	}
	return { global, missing };
};

export const stripMappedKeys = (global: JsonObject, map: Record<string, string>): JsonObject => {
	const leftover = cloneJson(global);
	for (const path of Object.keys(map)) {
		deletePath(leftover, path);
	}
	pruneEmpty(leftover);
	return leftover;
};

export const mergeGlobal = (constructed: JsonObject, leftover: JsonObject): JsonObject => {
	return deepMerge(cloneJson(constructed), leftover);
};

export const setPath = (obj: JsonObject, path: string, value: string) => {
	const parts = path.split('.');
	let current = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i];
		if (!current[part] || typeof current[part] !== 'object') {
			current[part] = {};
		}
		current = current[part];
	}
	current[parts[parts.length - 1]] = value;
};

export const deletePath = (obj: JsonObject, path: string) => {
	const parts = path.split('.');
	let current = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		if (!current?.[parts[i]] || typeof current[parts[i]] !== 'object') {
			return;
		}
		current = current[parts[i]];
	}
	if (current && typeof current === 'object') {
		delete current[parts[parts.length - 1]];
	}
};

export const pruneEmpty = (obj: JsonObject) => {
	Object.entries(obj).forEach(([key, val]) => {
		if (val && typeof val === 'object') {
			pruneEmpty(val);
			if (!Object.keys(val).length) {
				delete obj[key];
			}
		}
	});
	return obj;
};

export const removeEmpty = (obj: JsonObject) => {
	Object.entries(obj).forEach(
		([key, val]) =>
			(val && typeof val === 'object' && removeEmpty(val)) || ((val === null || val === '') && delete obj[key]),
	);
	return obj;
};

export const deepMerge = (base: JsonObject, overlay: JsonObject): JsonObject => {
	for (const [key, value] of Object.entries(overlay)) {
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			base[key] = deepMerge(base[key] && typeof base[key] === 'object' ? base[key] : {}, value);
		} else {
			base[key] = value;
		}
	}
	return base;
};

export const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const SKIP_FLATTEN_KEYS = new Set(['unused-do-not-translate']);

export const getPath = (obj: JsonObject | undefined, path: string): unknown => {
	if (!obj) {
		return undefined;
	}
	return path.split('.').reduce<unknown>((acc, part) => {
		if (!acc || typeof acc !== 'object') {
			return undefined;
		}
		return (acc as JsonObject)[part];
	}, obj);
};

export const flattenLeaves = (obj: JsonObject | undefined, prefix = ''): Record<string, string> => {
	const out: Record<string, string> = {};
	if (!obj) {
		return out;
	}
	for (const [key, val] of Object.entries(obj)) {
		if (SKIP_FLATTEN_KEYS.has(key)) {
			continue;
		}
		const path = prefix ? `${prefix}.${key}` : key;
		if (val && typeof val === 'object' && !Array.isArray(val)) {
			Object.assign(out, flattenLeaves(val, path));
		} else if (typeof val === 'string' && val.length) {
			out[path] = val;
		}
	}
	return out;
};

export const mergeHumanOverAi = (ai: JsonObject, human: JsonObject): JsonObject => {
	const overlay = (base: JsonObject, src: JsonObject): JsonObject => {
		for (const [key, value] of Object.entries(src)) {
			if (value === null || value === '') {
				continue;
			}
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				base[key] = overlay(base[key] && typeof base[key] === 'object' ? base[key] : {}, value);
			} else {
				base[key] = value;
			}
		}
		return base;
	};
	return overlay(cloneJson(ai), human);
};
