import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { buildConstructedGlobal, mergeGlobal, removeEmpty, stripMappedKeys } from './build-global';

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
		const leftoverGlobal = stripMappedKeys(json.global ?? {}, map);
		if (needsHsTerms(leftoverGlobal, json.global)) {
			const hsTerms = await loadHsTerms(locale);
			const { global: constructed, missing } = buildConstructedGlobal(map, hsTerms);
			if (missing.length) {
				throw new Error(`Missing hs-terms for ${locale}:\n${missing.join('\n')}`);
			}
			json.global = mergeGlobal(constructed, leftoverGlobal);
		} else if (Object.keys(leftoverGlobal).length) {
			json.global = leftoverGlobal;
		}

		const jsonWithoutEmpty = removeEmpty(json);
		await writeFile(`./dist/i18n/${file}`, JSON.stringify(jsonWithoutEmpty, null, '\t') + '\n');
		console.log('written', `./dist/i18n/${file}`);
	}
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

process();
