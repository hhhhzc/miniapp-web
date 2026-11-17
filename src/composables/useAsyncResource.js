import { getCurrentScope, onScopeDispose, ref } from 'vue';

export function useAsyncResource(loader, { initialValue = () => null } = {}) {
  const data = ref(initialValue());
  const loading = ref(false);
  const error = ref('');
  let generation = 0;

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

  function reset(value = initialValue()) {
    generation++;
    data.value = value;
    loading.value = false;
    error.value = '';
  }

  if (getCurrentScope()) onScopeDispose(() => { generation++; });
  return { data, loading, error, load, reset };
}
