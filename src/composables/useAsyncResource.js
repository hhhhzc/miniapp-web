/** 共享异步资源状态，使用请求代次保证只有最新请求能够更新页面。 */
import { getCurrentScope, onScopeDispose, ref } from 'vue';

/** 封装数据、加载与错误状态，页面统一使用 load 和 reset 管理请求生命周期。 */
export function useAsyncResource(loader, { initialValue = () => null } = {}) {
  const data = ref(initialValue());
  const loading = ref(false);
  const error = ref('');
  let generation = 0;

  /** 每次加载递增代次，旧请求的成功、失败和结束通知都会被丢弃。 */
  async function load() {
    const current = ++generation;
    data.value = initialValue();
    loading.value = true;
    error.value = '';
    try {
      const value = await loader();
      if (current === generation) data.value = value;
    } catch (failure) {
      if (current === generation) error.value = failure.message || '加载失败，请重试';
    } finally {
      if (current === generation) loading.value = false;
    }
  }

  /** 重置或退出时递增代次，让尚未结束的请求失去更新页面的资格。 */
  function reset(value = initialValue()) {
    generation++;
    data.value = value;
    loading.value = false;
    error.value = '';
  }

  if (getCurrentScope())
    onScopeDispose(() => {
      generation++;
    });
  return { data, loading, error, load, reset };
}
