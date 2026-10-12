import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import {
	buildConstructedGlobal,
	cloneJson,
	deepMerge,
	deletePath,
	findBareTermTokens,
	JsonObject,
	mechanicsFromKeywords,
	mergeGlobal,
	mergeHumanOverAi,
	mergeTermMaps,
	removeEmpty,
	splitTermMap,
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
		const bareTerms = findBareTermTokens(json);
		if (bareTerms.length) {
			throw new Error(
				`Source string is only a TERM token for ${locale} (map the key in hs-terms/global-map.json instead):\n${bareTerms.join('\n')}`,
			);
		}
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

const finalizeLocale = async (
	json: JsonObject,
	locale: string,
	explicitMap: Record<string, string>,
): Promise<JsonObject> => {
	const rootKeys = new Set(Object.keys(json));
	let hsTerms: Record<string, string> = {};
	if (needsHsTerms(json.global ?? {}, json.global) || hasRootMappedPath(explicitMap, rootKeys)) {
		hsTerms = await loadHsTerms(locale);
	}

	const map = mergeTermMaps(explicitMap, mechanicsFromKeywords(hsTerms, new Set(Object.keys(explicitMap))));
	const { globalRelative, fromRoot } = splitTermMap(map, rootKeys);
	const leftoverGlobal = stripMappedKeys(json.global ?? {}, globalRelative);
	for (const path of Object.keys(fromRoot)) {
		deletePath(json, path);
	}

	if (Object.keys(hsTerms).length) {
		const { global: constructed, missing } = buildConstructedGlobal(globalRelative, hsTerms);
		const { global: constructedRoot, missing: missingRoot } = buildConstructedGlobal(fromRoot, hsTerms);
		const allMissing = [...missing, ...missingRoot];
		if (allMissing.length) {
			throw new Error(`Missing hs-terms for ${locale}:\n${allMissing.join('\n')}`);
		}
		json.global = mergeGlobal(constructed, leftoverGlobal);
		deepMerge(json, constructedRoot);
	} else if (Object.keys(leftoverGlobal).length) {
		json.global = leftoverGlobal;
		hsTerms = await loadHsTerms(locale).catch(() => ({}));
	}

	resolveTermPlaceholders(json, hsTerms, locale);
	return removeEmpty(json);
};

const hasRootMappedPath = (map: Record<string, string>, rootKeys: ReadonlySet<string>): boolean => {
	return Object.keys(map).some((path) => rootKeys.has(path.split('.')[0]));
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
