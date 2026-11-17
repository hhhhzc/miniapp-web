/** 本地联合启动入口，统一管理本轮创建的 Java、H5 和后台子进程。 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const backend = path.resolve(
  process.env.MINIAPP_BACKEND_DIR || path.join(root, '..', 'miniapp-app')
);
const jar = path.join(backend, 'app', 'target', 'app.jar');
const java = process.env.JAVA_HOME
  ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
  : 'java';
if (!existsSync(jar)) throw new Error('请先在 miniapp-app 执行 Maven package 构建后端。');
if (
  !process.env.ADMIN_USERNAME ||
  !process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD.length < 12
) {
  throw new Error(
    '请先设置 ADMIN_USERNAME 和至少 12 位的 ADMIN_PASSWORD，或运行 scripts/start-local.ps1。'
  );
}
const children = [];
let stopping = false;

/** 只停止当前脚本创建的子进程，避免影响用户另行启动的服务。 */
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
}

/** 隐藏启动子进程；任一服务启动失败时收拢本轮进程并返回错误。 */
function start(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  children.push(child);
  child.on('error', error => {
    console.error(`启动失败：${error.message}`);
    process.exitCode = 1;
    stop();
  });
  child.on('exit', code => {
    if (!stopping) {
      process.exitCode = code || 0;
      stop();
    }
  });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
start(java, ['-jar', jar], backend);
start(
  process.execPath,
  [
    'node_modules/@dcloudio/vite-plugin-uni/bin/uni.js',
    '--host',
    '127.0.0.1',
    '--port',
    '5173',
    '--strictPort',
  ],
  root
);
start(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--config', 'admin-web/vite.config.js', '--strictPort'],
  root
);
console.log(
  '首页：http://127.0.0.1:5173/  后台：http://127.0.0.1:5174/admin/  Ctrl+C 停止本次启动的服务。'
);
