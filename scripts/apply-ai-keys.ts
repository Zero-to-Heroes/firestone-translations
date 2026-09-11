import { mkdir, readFile, writeFile } from 'fs/promises';
import { deletePath, flattenLeaves, JsonObject, pruneEmpty, setPath } from '../build-global';

const loadJson = async (path: string): Promise<JsonObject> => {
	try {
		const content = await readFile(path, 'utf8');
		if (!content?.length) {
			return {};
		}
		const json = JSON.parse(content);
		return json && typeof json === 'object' ? json : {};
	} catch {
		return {};
	}
};

const writeJson = async (path: string, json: JsonObject) => {
	await writeFile(path, JSON.stringify(json, null, '\t') + '\n');
};

const run = async () => {
	const args = process.argv.slice(2);
	const locale = args.find((arg) => !arg.startsWith('--') && !arg.endsWith('.json'));
	const inputFile = args.find((arg) => arg.endsWith('.json') && arg !== locale);
	const prune = args.includes('--prune');

	if (!locale) {
		throw new Error('Usage: npx ts-node scripts/apply-ai-keys.ts <locale> [flat.json] [--prune]');
	}

	await mkdir('./firestone-ai/_en-source', { recursive: true });

	const ai = await loadJson(`./firestone-ai/${locale}.json`);
	const source = (await loadJson(`./firestone-ai/_en-source/${locale}.json`)) as Record<string, string>;
	const en = flattenLeaves(await loadJson('./firestone/enUS.json'));

	if (inputFile) {
		const incoming = JSON.parse(await readFile(inputFile, 'utf8')) as Record<string, string>;
		for (const [key, value] of Object.entries(incoming)) {
			if (!value?.length) {
				continue;
			}
			if (!en[key]) {
				throw new Error(`Unknown or empty enUS key: ${key}`);
			}
			setPath(ai, key, value);
			source[key] = en[key];
		}
	}

	if (prune) {
		const human = flattenLeaves(await loadJson(`./firestone/${locale}.json`));
		for (const key of Object.keys(source)) {
			if (human[key] || !en[key]) {
				delete source[key];
				deletePath(ai, key);
			}
		}
		const leftoverAi = flattenLeaves(ai);
		for (const key of Object.keys(leftoverAi)) {
			if (human[key] || !en[key]) {
				deletePath(ai, key);
			}
		}
		pruneEmpty(ai);
	}

	await writeJson(`./firestone-ai/${locale}.json`, ai);
	await writeJson(`./firestone-ai/_en-source/${locale}.json`, sortKeys(source));
	console.log(`updated firestone-ai/${locale}.json`);
};

const sortKeys = (map: Record<string, string>): Record<string, string> => {
	return Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
};

run();
