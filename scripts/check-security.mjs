import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const rules = JSON.parse(await readFile(path.join(projectRoot, 'database.rules.json'), 'utf8'));

assert.equal(rules.rules['.read'], false, 'Root database read must be denied');
assert.equal(rules.rules['.write'], false, 'Root database write must be denied');
assert.match(rules.rules.config['.write'], /admins/, 'Config writes must require the admin allowlist');
assert.match(rules.rules.results['.read'], /admins/, 'Results reads must require the admin allowlist');
assert.match(rules.rules.results.$resultId['.write'], /!data\.exists\(\)/, 'Public result writes must be create-only');
assert.equal(rules.rules.admins.$uid['.write'], false, 'The client must not edit the admin allowlist');

const collectFiles = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(entry => {
        const entryPath = path.join(directory, entry.name);
        return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
    }));
    return nested.flat();
};

const sourceFiles = (await collectFiles(path.join(projectRoot, 'src')))
    .filter(file => /\.(js|jsx)$/.test(file));
const source = (await Promise.all(sourceFiles.map(file => readFile(file, 'utf8')))).join('\n');

assert.doesNotMatch(source, /\bADMIN_PASSWORD\b/, 'A fixed production admin password must not exist in source code');

const distDirectory = path.join(projectRoot, 'dist');
const distFiles = await collectFiles(distDirectory);
const productionBundle = (await Promise.all(distFiles
    .filter(file => /\.(html|js|css)$/.test(file))
    .map(file => readFile(file, 'utf8')))).join('\n');

assert.doesNotMatch(productionBundle, /admin123/, 'The local test password leaked into the production bundle');

console.log('Security checks passed.');
