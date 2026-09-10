export type JsonObject = { [key: string]: any };

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
