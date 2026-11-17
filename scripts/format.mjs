/** 前后端统一格式化入口，只处理源码、测试和构建配置，跳过产物及运行数据。 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as prettier from 'prettier';
import javaPlugin from 'prettier-plugin-java';
import xmlPlugin from '@prettier/plugin-xml';
import { format as formatSql } from 'sql-formatter';

const frontend = fileURLToPath(new URL('..', import.meta.url));
const backend = path.resolve(
  process.env.MINIAPP_BACKEND_DIR || path.join(frontend, '..', 'miniapp-app')
);
const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const stageBackend = args.has('--stage-backend');
const config = JSON.parse(await fs.readFile(path.join(frontend, '.prettierrc.json'), 'utf8'));
const plugins = [javaPlugin, xmlPlugin];
const supported = new Set([
  '.js',
  '.mjs',
  '.vue',
  '.css',
  '.html',
  '.json',
  '.java',
  '.xml',
  '.yml',
  '.yaml',
  '.sql',
]);

/** 从明确的源码目录收集可格式化文件，避免跟随符号链接或进入缓存目录。 */
async function collect(root, relative) {
  const absolute = path.join(root, relative);
  const stat = await fs.stat(absolute).catch(() => null);
  if (!stat) return [];
  if (stat.isFile()) return supported.has(path.extname(absolute)) ? [relative] : [];
  const entries = await fs.readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (
      entry.isSymbolicLink() ||
      ['node_modules', 'target', 'dist', '.cache', '.git'].includes(entry.name)
    )
      continue;
    files.push(...(await collect(root, path.join(relative, entry.name))));
  }
  return files;
}

/** 仅拆分普通 JDBC 长字符串，保留每一个原始字符，SQL 在运行时仍完全一致。 */
function wrapSqlLiterals(source) {
  return source.replace(/"(?:\\.|[^"\\\r\n])*"/g, literal => {
    const value = literal.slice(1, -1);
    if (
      value.length <= 100 ||
      value.includes('\\') ||
      !/^(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b/i.test(value)
    )
      return literal;
    const parts = [];
    let rest = value;
    while (rest.length > 85) {
      const split = rest.lastIndexOf(' ', 85);
      if (split < 1) break;
      parts.push(rest.slice(0, split + 1));
      rest = rest.slice(split + 1);
    }
    parts.push(rest);
    return parts.map(part => `"${part}"`).join(' +\n');
  });
}

/** 按文件类型应用格式规则；后台静态模板使用 HTML 标记交给 Prettier 展开。 */
async function formatted(root, relative, original) {
  const extension = path.extname(relative);
  if (extension === '.sql') {
    return (
      formatSql(original, {
        language: 'mysql',
        tabWidth: 2,
        keywordCase: 'preserve',
        linesBetweenQueries: 1,
      }).trimEnd() + '\n'
    );
  }
  let source = extension === '.java' ? wrapSqlLiterals(original) : original;
  if (root === frontend && relative.replaceAll('\\', '/') === 'admin-web/src/main.js') {
    source = source.replace(/template:\s*`/, 'template: /* HTML */ `');
  }
  const options = await prettier.resolveConfig(path.join(root, relative), { editorconfig: true });
  return prettier.format(source, {
    ...config,
    ...options,
    plugins,
    filepath: path.join(root, relative),
  });
}

const jobs = [];
if (!args.has('--backend-only') && !stageBackend) {
  const names = [
    'src',
    'admin-web',
    'tests',
    'scripts',
    'package.json',
    'package-lock.json',
    'vite.config.js',
    '.prettierrc.json',
  ];
  jobs.push({
    root: frontend,
    label: 'frontend',
    files: (await Promise.all(names.map(name => collect(frontend, name)))).flat(),
  });
}
if (!args.has('--frontend-only')) {
  await fs.access(path.join(backend, 'pom.xml'));
  const files = ['pom.xml'];
  for (const module of ['api', 'app', 'domain', 'infrastructure', 'trigger', 'types']) {
    files.push(
      ...(await collect(backend, `${module}/pom.xml`)),
      ...(await collect(backend, `${module}/src`))
    );
  }
  jobs.push({ root: backend, label: 'backend', files });
}

const stageRoot = path.join(frontend, '.cache', 'formatted-backend');
const manifest = [];
let total = 0;
let changed = 0;
for (const job of jobs) {
  let count = 0;
  for (const relative of job.files) {
    const filename = path.join(job.root, relative);
    const original = await fs.readFile(filename, 'utf8');
    const output = await formatted(job.root, relative, original);
    total++;
    if (output === original) continue;
    count++;
    changed++;
    if (stageBackend) {
      const destination = path.join(stageRoot, relative);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, output);
      manifest.push({
        path: relative,
        original: createHash('sha256').update(original).digest('hex'),
      });
    } else if (write) {
      await fs.writeFile(filename, output);
    } else {
      console.log(`${job.label}: ${relative}`);
    }
  }
  console.log(
    `${job.label}: ${job.files.length} files checked, ${count} ${write || stageBackend ? 'formatted' : 'need formatting'}.`
  );
}
if (stageBackend) {
  await fs.mkdir(stageRoot, { recursive: true });
  await fs.writeFile(path.join(stageRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
}
console.log(`Total: ${total} files checked, ${changed} changed.`);
if (!write && !stageBackend && changed) process.exitCode = 1;
