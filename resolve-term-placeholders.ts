import { JsonObject } from './build-global';

const TERM_PATTERN = '«TERM:([^»]+)»';

export const resolveTermPlaceholders = (
	json: JsonObject,
	hsTerms: Record<string, string>,
	locale: string,
): JsonObject => {
	walk(json, '', (value, path) => resolveString(value, hsTerms, json, locale, path, new Set()));
	return json;
};

const walk = (obj: JsonObject, path: string, replace: (value: string, path: string) => string) => {
	for (const [key, value] of Object.entries(obj)) {
		const childPath = path ? `${path}.${key}` : key;
		if (typeof value === 'string') {
			obj[key] = replace(value, childPath);
		} else if (value && typeof value === 'object' && !Array.isArray(value)) {
			walk(value, childPath, replace);
		}
	}
};

const resolveString = (
	value: string,
	hsTerms: Record<string, string>,
	root: JsonObject,
	locale: string,
	stringPath: string,
	stack: Set<string>,
): string => {
	return value.replace(new RegExp(TERM_PATTERN, 'g'), (_match, rawToken: string) => {
		const token = rawToken.trim();
		if (!token) {
			throw new Error(`Empty TERM token for ${locale} at ${stringPath}`);
		}
		if (stack.has(token)) {
			throw new Error(
				`Cycle in TERM placeholders for ${locale} at ${stringPath}: ${[...stack, token].join(' -> ')}`,
			);
		}
		const nextStack = new Set(stack);
		nextStack.add(token);

		const replacement = lookupTerm(token, hsTerms, root);
		if (!replacement) {
			throw new Error(`Unknown TERM token for ${locale} at ${stringPath}: «TERM:${token}»`);
		}
		return resolveString(replacement, hsTerms, root, locale, stringPath, nextStack);
	});
};

const lookupTerm = (token: string, hsTerms: Record<string, string>, root: JsonObject): string | undefined => {
	const fromDict = hsTerms[token]?.trim();
	if (fromDict) {
		return fromDict;
	}
	const fromTree = getPath(root, token);
	if (typeof fromTree === 'string' && fromTree.trim()) {
		return fromTree;
	}
	return undefined;
};

export const getPath = (obj: JsonObject, path: string): unknown => {
	let current: any = obj;
	for (const part of path.split('.')) {
		if (!current || typeof current !== 'object' || !(part in current)) {
			return undefined;
		}
		current = current[part];
	}
	return current;
};
