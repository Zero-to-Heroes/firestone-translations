import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import {
	buildConstructedGlobal,
	cloneJson,
	JsonObject,
	mergeGlobal,
	mergeHumanOverAi,
	removeEmpty,
	stripMappedKeys,
} from './build-global';
import { resolveTermPlaceholders } from './resolve-term-placeholders';

const process = async () => {
	const files = await readdir('./firestone/');
	const map = JSON.parse(await readFile('./hs-terms/global-map.json', 'utf8')) as Record<string, string>;
	await mkdir('./dist/i18n', { recursive: true });
	console.log('all files', files);

	for (const file of files) {
		console.log('processing', file);
		const content = await readFile(`./firestone/${file}`, 'utf8');
		if (!content?.length) {
			continue;
		}

		const json = JSON.parse(content);
		if (!json || !Object.keys(json).length) {
			continue;
		}

		const locale = file.replace(/\.json$/, '');
		const humanOut = await finalizeLocale(cloneJson(json), locale, map);
		await writeFile(`./dist/i18n/${file}`, JSON.stringify(humanOut, null, '\t') + '\n');
		console.log('written', `./dist/i18n/${file}`);

		const ai = await loadAiLocale(locale);
		const complete = mergeHumanOverAi(ai, json);
		const completeOut = await finalizeLocale(complete, locale, map);
		const aiFile = `${locale}-ai.json`;
		await writeFile(`./dist/i18n/${aiFile}`, JSON.stringify(completeOut, null, '\t') + '\n');
		console.log('written', `./dist/i18n/${aiFile}`);
	}
};

const finalizeLocale = async (json: JsonObject, locale: string, map: Record<string, string>): Promise<JsonObject> => {
	const leftoverGlobal = stripMappedKeys(json.global ?? {}, map);
	let hsTerms: Record<string, string> = {};
	if (needsHsTerms(leftoverGlobal, json.global)) {
		hsTerms = await loadHsTerms(locale);
		const { global: constructed, missing } = buildConstructedGlobal(map, hsTerms);
		if (missing.length) {
			throw new Error(`Missing hs-terms for ${locale}:\n${missing.join('\n')}`);
		}
		json.global = mergeGlobal(constructed, leftoverGlobal);
	} else if (Object.keys(leftoverGlobal).length) {
		json.global = leftoverGlobal;
		hsTerms = await loadHsTerms(locale).catch(() => ({}));
	}

	resolveTermPlaceholders(json, hsTerms, locale);
	return removeEmpty(json);
};

const needsHsTerms = (leftoverGlobal: Record<string, any>, originalGlobal: Record<string, any> | undefined) => {
	return !!originalGlobal || Object.keys(leftoverGlobal).length > 0;
};

const loadHsTerms = async (locale: string): Promise<Record<string, string>> => {
	try {
		return JSON.parse(await readFile(`./hs-terms/${locale}.json`, 'utf8'));
	} catch (e) {
		throw new Error(`Missing hs-terms dictionary for ${locale}`);
	}
};

const loadAiLocale = async (locale: string): Promise<JsonObject> => {
	try {
		const content = await readFile(`./firestone-ai/${locale}.json`, 'utf8');
		if (!content?.length) {
			return {};
		}
		const json = JSON.parse(content);
		return json && typeof json === 'object' ? json : {};
	} catch {
		return {};
	}
};

process();
