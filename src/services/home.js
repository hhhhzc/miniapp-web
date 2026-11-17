/** 首页展示辅助逻辑，统一安全图片地址和已发布模块的搜索规则。 */
import { getBaseUrl } from '../config.js';

/** 只接受 HTTPS 图片和受限的本站上传路径；相对路径补全当前 API 地址。 */
export function resolveImageUrl(value) {
  if (typeof value !== 'string' || !value) return '';
  if (/^https:\/\//i.test(value)) return value;
  if (/^\/media\/[a-f0-9-]+\.(png|jpg)$/.test(value)) return getBaseUrl() + value;
  return '';
}

/** 过滤停用或空模块，并按入口标题、说明和模块标题进行本地搜索。 */
export function filterModules(modules, keyword) {
  const query = String(keyword || '')
    .trim()
    .toLocaleLowerCase();
  return (Array.isArray(modules) ? modules : [])
    .filter(module => module.enabled && ['GRID', 'CARD', 'BANNER'].includes(module.layout))
    .map(module => ({
      ...module,
      entries: (module.entries || []).filter(
        entry =>
          entry.enabled &&
          (!query ||
            `${entry.title} ${entry.subtitle} ${module.title}`.toLocaleLowerCase().includes(query))
      ),
    }))
    .filter(module => module.entries.length);
}
