/** 管理项目专用 MySQL 实例，只操作该实例配置指向的数据目录，不接触旧数据库。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const action = (process.argv[2] || 'status').toLowerCase();
if (!['start', 'stop', 'status'].includes(action)) throw new Error('支持 start / stop / status。');
const directory = path.resolve(process.env.MINIAPP_MYSQL_DIR || 'D:/config/miniapp-mysql');
const info = JSON.parse(fs.readFileSync(path.join(directory, 'instance.json'), 'utf8'));
const client = path.join(info.base, 'bin', 'mysql.exe');
const credentialsFile = `--defaults-extra-file=${directory}/root.cnf`;

function inspect() {
  return spawnSync(
    client,
    [
      credentialsFile,
      '--batch',
      '--raw',
      '--skip-column-names',
      '-e',
      'SELECT @@datadir; SELECT VERSION();',
    ],
    {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5000,
    }
  );
}

/** 连接后再次核对数据目录，保证停止操作不会误伤同端口的其他数据库。 */
function requireOwnInstance(result) {
  const expected = path
    .resolve(directory, 'data')
    .replaceAll('\\', '/')
    .replace(/\/+$/, '')
    .toLowerCase();
  const actual = result.stdout
    .split(/\r?\n/)[0]
    .replaceAll('\\', '/')
    .replace(/\/+$/, '')
    .toLowerCase();
  if (actual !== expected) throw new Error('端口上的数据库不属于本项目实例，已停止操作。');
}

let result = inspect();
if (action === 'stop') {
  if (result.status !== 0) {
    console.log('项目 MySQL 当前未运行或凭据不可用。');
    process.exit(1);
  }
  requireOwnInstance(result);
  result = spawnSync(path.join(info.base, 'bin', 'mysqladmin.exe'), [credentialsFile, 'shutdown'], {
    windowsHide: true,
    encoding: 'utf8',
    timeout: 10000,
  });
  if (result.status !== 0) throw new Error('MySQL 停止失败，请检查实例日志。');
  console.log('项目 MySQL 已正常停止，数据保留。');
} else {
  if (result.status !== 0 && action === 'start') {
    const log = fs.openSync(path.join(directory, 'logs', 'console.log'), 'a');
    const child = spawn(
      path.join(info.base, 'bin', 'mysqld.exe'),
      [`--defaults-file=${directory}/my.ini`, '--no-monitor', '--console'],
      {
        detached: true,
        windowsHide: true,
        stdio: ['ignore', log, log],
      }
    );
    child.on('error', error => {
      console.error(`MySQL 启动失败：${error.message}`);
      process.exitCode = 1;
    });
    child.unref();
    fs.closeSync(log);
    for (let attempt = 0; attempt < 40; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 250));
      result = inspect();
      if (result.status === 0) break;
    }
  }
  if (result.status !== 0) {
    console.log('项目 MySQL 未运行，请执行 node scripts/mysql-local.mjs start。');
    process.exit(1);
  }
  requireOwnInstance(result);
  console.log(
    `MySQL ${result.stdout.trim().split(/\r?\n/).at(-1)} 正在 ${info.host}:${info.port} 运行。`
  );
}
