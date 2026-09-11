import { readdir, readFile } from 'fs/promises';
import { flattenLeaves, JsonObject } from '../build-global';

const SOURCE_LOCALE = 'enUS';
const SKIP_LOCALES = new Set([SOURCE_LOCALE, 'en']);

export type StaleKey = {
	key: string;
	oldEn: string | null;
	newEn: string;
};

export type LocaleGaps = {
	locale: string;
	missing: string[];
	stale: StaleKey[];
	pruneHuman: string[];
	pruneRemoved: string[];
};

const loadJson = async (path: string): Promise<JsonObject | null> => {
	try {
		const content = await readFile(path, 'utf8');
		if (!content?.length) {
			return null;
		}
		const json = JSON.parse(content);
		if (!json || typeof json !== 'object' || !Object.keys(json).length) {
			return null;
		}
		return json;
	} catch {
		return null;
	}
};

export const listLocales = async (): Promise<string[]> => {
	const files = await readdir('./firestone/');
	return files
		.filter((file) => file.endsWith('.json'))
		.map((file) => file.replace(/\.json$/, ''))
		.filter((locale) => !SKIP_LOCALES.has(locale))
		.sort();
};

export const collectLocaleGaps = async (locale: string, enLeaves: Record<string, string>): Promise<LocaleGaps> => {
	const human = await loadJson(`./firestone/${locale}.json`);
	const ai = await loadJson(`./firestone-ai/${locale}.json`);
	const source = ((await loadJson(`./firestone-ai/_en-source/${locale}.json`)) ?? {}) as Record<string, string>;

	const humanLeaves = flattenLeaves(human ?? {});
	const aiLeaves = flattenLeaves(ai ?? {});

	const missing: string[] = [];
	const stale: StaleKey[] = [];
	const pruneHuman: string[] = [];
	const pruneRemoved: string[] = [];

	for (const key of Object.keys(enLeaves)) {
		if (humanLeaves[key]) {
			continue;
		}
		if (!aiLeaves[key]) {
			missing.push(key);
			continue;
		}
		const stored = source[key];
		if (stored !== enLeaves[key]) {
			stale.push({ key, oldEn: stored ?? null, newEn: enLeaves[key] });
		}
	}

	for (const key of Object.keys(aiLeaves)) {
		if (humanLeaves[key]) {
			pruneHuman.push(key);
		} else if (!(key in enLeaves)) {
			pruneRemoved.push(key);
		}
	}

	missing.sort();
	stale.sort((a, b) => a.key.localeCompare(b.key));
	pruneHuman.sort();
	pruneRemoved.sort();

	return { locale, missing, stale, pruneHuman, pruneRemoved };
};

const printLocale = (gaps: LocaleGaps, detailed: boolean) => {
	const staleCount = gaps.stale.length;
	console.log(
		`${gaps.locale}: missing=${gaps.missing.length} stale=${staleCount} pruneHuman=${gaps.pruneHuman.length} pruneRemoved=${gaps.pruneRemoved.length}`,
	);
	if (!detailed) {
		return;
	}
	for (const key of gaps.missing) {
		console.log(`  missing  ${key}`);
	}
	for (const item of gaps.stale) {
		console.log(`  stale    ${item.key}`);
		console.log(`           old: ${item.oldEn ?? '(none)'}`);
		console.log(`           new: ${item.newEn}`);
	}
	for (const key of gaps.pruneHuman) {
		console.log(`  prune    ${key} (human exists)`);
	}
	for (const key of gaps.pruneRemoved) {
		console.log(`  prune    ${key} (removed from enUS)`);
	}
};

const run = async () => {
	const args = process.argv.slice(2);
	const asJson = args.includes('--json');
	const detailed = args.includes('--detailed');
	const check = args.includes('--check');
	const localeArg = args.find((arg) => !arg.startsWith('--'));

	const en = await loadJson(`./firestone/${SOURCE_LOCALE}.json`);
	if (!en) {
		throw new Error(`Missing source locale firestone/${SOURCE_LOCALE}.json`);
	}
	const enLeaves = flattenLeaves(en);
	const locales = localeArg ? [localeArg] : await listLocales();

	const reports: LocaleGaps[] = [];
	for (const locale of locales) {
		reports.push(await collectLocaleGaps(locale, enLeaves));
	}

	if (asJson) {
		console.log(JSON.stringify(reports, null, '\t'));
	} else {
		let missing = 0;
		let stale = 0;
		for (const gaps of reports) {
			printLocale(gaps, detailed);
			missing += gaps.missing.length;
			stale += gaps.stale.length;
		}
		console.log(`total: missing=${missing} stale=${stale}`);
	}

	if (check && reports.some((gaps) => gaps.missing.length || gaps.stale.length)) {
		process.exit(1);
	}
};

if (require.main === module) {
	run();
}
