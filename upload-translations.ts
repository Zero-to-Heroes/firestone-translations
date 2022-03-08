import { readdir, readFile, writeFile } from 'fs/promises';

const process = async () => {
	const files = await readdir('./firestone/');
	console.log('all files', files);
	for (const file of files) {
		console.log('processing', file);
		const content = await readFile(`./firestone/${file}`, 'utf8');
		// console.log(content);
		if (!content?.length) {
			continue;
		}

		const json = JSON.parse(content);
		// console.log('json', json, 'test', json.test, 'other', json.other);
		const jsonWithoutEmpty = removeEmpty(json);
		// console.log('withoutEmptyStrings', jsonWithoutEmpty);
		const jsonWithoutEmptyStr = JSON.stringify(jsonWithoutEmpty, null, '\t');
		await writeFile(`./firestone/${file}`, jsonWithoutEmptyStr);
		// console.log('written');
	}
};

process();

const removeEmpty = (obj) => {
	Object.entries(obj).forEach(
		([key, val]) => (val && typeof val === 'object' && removeEmpty(val)) || ((val === null || val === '') && delete obj[key])
	);
	return obj;
};
