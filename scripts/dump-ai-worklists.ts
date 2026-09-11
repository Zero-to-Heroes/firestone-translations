import { mkdir, readFile, writeFile } from 'fs/promises';
import { flattenLeaves } from '../build-global';
import { collectLocaleGaps, listLocales } from './missing-ai-keys';

const run = async () => {
	const enJson = JSON.parse(await readFile('./firestone/enUS.json', 'utf8'));
	const en = flattenLeaves(enJson);
	await mkdir('./tmp-ai-work', { recursive: true });
	const locales = await listLocales();
	for (const locale of locales) {
		const gaps = await collectLocaleGaps(locale, en);
		const work: Record<string, string> = {};
		for (const key of gaps.missing) {
			work[key] = en[key];
		}
		for (const item of gaps.stale) {
			work[item.key] = item.newEn;
		}
		const path = `./tmp-ai-work/${locale}-en.json`;
		await writeFile(path, JSON.stringify(work, null, '\t') + '\n');
		console.log(locale, Object.keys(work).length, path);
	}
};

run();
