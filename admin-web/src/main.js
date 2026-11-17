/** 网页内容管理后台：维护独立管理会话、模块与入口表单及图片上传流程。 */
import { createApp, ref, computed, onMounted } from 'vue';
import './style.css';

createApp({
  setup() {
    let stored;
    try {
      stored = JSON.parse(sessionStorage.getItem('coupon-admin') || 'null');
    } catch {
      stored = null;
    }
    const session = ref(stored && Date.parse(stored.expiresAt) > Date.now() ? stored : null);
    const username = ref('admin'),
      password = ref(''),
      busy = ref(false),
      error = ref(''),
      notice = ref('');
    const modules = ref([]),
      selected = ref(''),
      search = ref(''),
      modal = ref(''),
      form = ref({});
    const labels = { GRID: '图标宫格', CARD: '双列卡片', BANNER: '轮播横幅' };
    const themes = {
      yellow: '明黄',
      orange: '暖橙',
      blue: '晴蓝',
      red: '珊瑚',
      green: '薄荷',
      purple: '淡紫',
    };
    const current = computed(() => modules.value.find(x => x.id === selected.value));
    const entries = computed(() =>
      (current.value?.entries || []).filter(x =>
        `${x.title} ${x.subtitle}`.includes(search.value.trim())
      )
    );
    const entryCount = computed(() => modules.value.reduce((n, x) => n + x.entries.length, 0));
    const liveCount = computed(() =>
      modules.value
        .filter(m => m.enabled)
        .reduce(
          (n, m) => n + m.entries.filter(e => e.enabled && e.targetType === 'MINIPROGRAM').length,
          0
        )
    );

    /** 清理管理身份与当前编辑状态；与小程序用户会话完全分离。 */
    function clearSession() {
      session.value = null;
      modules.value = [];
      modal.value = '';
      sessionStorage.removeItem('coupon-admin');
    }

    /** 统一管理 API 请求和超时；只有对应当前 Token 的 401 才会清除管理身份。 */
    async function api(url, options = {}) {
      const token = session.value?.token;
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`/api/v1${url}`, {
          ...options,
          signal: controller.signal,
          headers: {
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
          },
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || data?.code !== '0000') {
          if (response.status === 401 && token === session.value?.token) clearSession();
          throw new Error(data?.message || `请求失败（${response.status}），请检查后端是否启动`);
        }
        return data.data;
      } catch (e) {
        throw new Error(e.name === 'AbortError' ? '请求超时，请重试' : e.message || '网络连接失败');
      } finally {
        clearTimeout(timer);
      }
    }

    /** 集中处理互斥操作、提示与错误，避免重复提交表单。 */
    async function perform(action, message = '') {
      if (busy.value) return;
      busy.value = true;
      error.value = '';
      notice.value = '';
      try {
        await action();
        notice.value = message;
      } catch (e) {
        error.value = e.message;
      } finally {
        busy.value = false;
      }
    }

    /** 重新拉取完整配置，同时保留仍存在的模块选择。 */
    async function load() {
      modules.value = await api('/admin/modules');
      if (!modules.value.some(x => x.id === selected.value))
        selected.value = modules.value[0]?.id || '';
    }

    /** 校验管理账号后保存当前标签页的临时会话，再加载后台配置。 */
    function login() {
      return perform(async () => {
        const value = await api('/admin/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: username.value, password: password.value }),
        });
        session.value = value;
        sessionStorage.setItem('coupon-admin', JSON.stringify(value));
        password.value = '';
        await load();
      });
    }

    /** 先在服务端注销 Token，再清理当前浏览器标签页的状态。 */
    function logout() {
      return perform(async () => {
        await api('/admin/auth/logout', { method: 'POST' });
        clearSession();
      });
    }

    /** 复制现有模块或创建独立表单，取消编辑时不影响已加载数据。 */
    function editModule(value) {
      error.value = '';
      form.value = value
        ? { ...value }
        : {
            title: '',
            subtitle: '',
            layout: 'GRID',
            sortOrder: (modules.value.length + 1) * 10,
            enabled: true,
          };
      modal.value = 'module';
    }

    /** 复制入口配置，并将附加参数转换为便于编辑的 JSON 文本。 */
    function editEntry(value) {
      if (!current.value) return;
      error.value = '';
      form.value = value
        ? { ...value, extraJson: JSON.stringify(value.extraData || {}, null, 2) }
        : {
            moduleId: current.value.id,
            title: '',
            subtitle: '',
            imageUrl: '',
            iconText: '券',
            theme: 'yellow',
            badge: '',
            targetType: 'NONE',
            appId: '',
            path: '',
            extraJson: '{}',
            sortOrder: (current.value.entries.length + 1) * 10,
            enabled: true,
          };
      modal.value = 'entry';
    }
    function close() {
      if (!busy.value) modal.value = '';
    }

    /** 校验附加参数并保存完整配置，成功后重新读取后台状态。 */
    function save() {
      return perform(async () => {
        const body = { ...form.value, sortOrder: Number(form.value.sortOrder) };
        if (modal.value === 'entry') {
          try {
            body.extraData = JSON.parse(body.extraJson || '{}');
          } catch {
            throw new Error('附加参数必须是有效 JSON 对象');
          }
          if (
            !body.extraData ||
            typeof body.extraData !== 'object' ||
            Array.isArray(body.extraData)
          )
            throw new Error('附加参数必须是 JSON 对象');
        }
        delete body.entries;
        delete body.extraJson;
        const kind = modal.value === 'module' ? 'modules' : 'entries';
        await api(`/admin/${kind}${body.id ? `/${encodeURIComponent(body.id)}` : ''}`, {
          method: body.id ? 'PUT' : 'POST',
          body: JSON.stringify(body),
        });
        if (modal.value === 'entry') selected.value = body.moduleId;
        modal.value = '';
        await load();
      }, '已保存。小程序重新进入首页或下拉刷新后生效。');
    }

    /** 用户确认删除范围后再提交，删除模块时会同时移除下属入口。 */
    function remove(kind, value) {
      if (
        !window.confirm(
          kind === 'modules'
            ? `删除“${value.title}”及其中所有入口？此操作无法撤销。`
            : `删除入口“${value.title}”？`
        )
      )
        return;
      return perform(async () => {
        await api(`/admin/${kind}/${encodeURIComponent(value.id)}`, { method: 'DELETE' });
        await load();
      }, '已删除');
    }

    /** 以完整对象更新启用状态，随后刷新列表以展示服务端结果。 */
    function toggle(kind, value) {
      return perform(
        async () => {
          await api(`/admin/${kind}/${encodeURIComponent(value.id)}`, {
            method: 'PUT',
            body: JSON.stringify({ ...value, enabled: !value.enabled }),
          });
          await load();
        },
        value.enabled ? '已停用，首页刷新后隐藏。' : '已启用，首页刷新后展示。'
      );
    }

    /** 前端先检查类型与大小，服务端仍负责真实格式校验和重新编码。 */
    function upload(event) {
      const file = event.target.files[0];
      if (!file) return;
      if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) {
        error.value = '请选择 2MB 以内的 PNG/JPEG 图片';
        event.target.value = '';
        return;
      }
      const data = new FormData();
      data.append('file', file);
      return perform(async () => {
        const result = await api('/admin/files', { method: 'POST', body: data });
        form.value.imageUrl = result.url;
        event.target.value = '';
      }, '图片已上传，保存入口后生效。');
    }
    onMounted(() => {
      if (session.value) perform(load);
    });
    return {
      session,
      username,
      password,
      busy,
      error,
      notice,
      modules,
      selected,
      current,
      entries,
      entryCount,
      liveCount,
      search,
      modal,
      form,
      labels,
      themes,
      login,
      logout,
      refresh: () => perform(load),
      editModule,
      editEntry,
      close,
      save,
      remove,
      toggle,
      upload,
    };
  },
  template: /* HTML */ `
    <!-- 管理登录使用独立账号，与微信用户会话分开。 -->
    <div
      v-if="!session"
      class="login-shell"
    >
      <section class="login-story">
        <a
          class="wordmark"
          href="#"
        >
          券
          <span>小站</span>
          <i>CONSOLE</i>
        </a>
        <div class="story-copy">
          <div class="overline">A LITTLE MORE, EVERY DAY</div>
          <h1>
            让每一个入口，
            <br />
            连接更好的生活。
          </h1>
          <p>
            从一张好看的图标开始。
            <br />
            在这里，管理你的小程序首页。
          </p>
        </div>
        <div class="story-art">
          <span>券</span>
          <b>
            好好生活
            <br />
            每天都值得
          </b>
        </div>
        <div class="story-footer">生活好券 · 一站直达</div>
      </section>
      <main class="login-panel">
        <form
          @submit.prevent="login"
          class="login-form"
        >
          <div class="eyebrow">欢迎回来</div>
          <h2>登录管理后台</h2>
          <p class="muted">管理首页模块、服务入口与活动图片。</p>
          <label>
            管理账号
            <input
              v-model="username"
              autocomplete="username"
              maxlength="40"
              required
              :disabled="busy"
            />
          </label>
          <label>
            登录密码
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              maxlength="128"
              required
              :disabled="busy"
              placeholder="请输入管理密码"
            />
          </label>
          <div
            v-if="error"
            role="alert"
            class="alert error"
          >
            {{ error }}
          </div>
          <button
            class="primary full"
            :disabled="busy"
          >
            {{ busy ? '正在登录…' : '登录后台 →' }}
          </button>
          <p class="login-help">
            首次使用请先在后端配置管理员账号。
            <br />
            账号由部署人员创建，不开放公开注册。
          </p>
        </form>
      </main>
    </div>
    <!-- 工作台包含模块选择、入口列表和操作反馈。 -->
    <div
      v-else
      class="workspace"
    >
      <aside class="sidebar">
        <div class="wordmark">
          券
          <span>小站</span>
          <i>CONSOLE</i>
        </div>
        <div class="sidebar-label">内容工作台</div>
        <button class="sidebar-active">
          ▦
          <span>首页配置</span>
          <small>HOME</small>
        </button>
        <div class="sidebar-bottom">
          <span class="avatar">{{ session.username.slice(0, 1).toUpperCase() }}</span>
          <div>
            <strong>{{ session.username }}</strong>
            <small>内容管理员</small>
          </div>
          <button
            @click="logout"
            :disabled="busy"
            title="退出登录"
          >
            ↗
          </button>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div>
            <span class="eyebrow">CONTENT WORKSPACE</span>
            <h1>
              首页配置
              <span class="tag">微信小程序</span>
            </h1>
            <p class="muted">把生活好去处，放在用户触手可及的地方。</p>
          </div>
          <button
            class="outline"
            :disabled="busy"
            @click="refresh"
          >
            ↻ 刷新配置
          </button>
        </header>
        <div
          v-if="error"
          role="alert"
          class="alert error"
        >
          {{ error }}
        </div>
        <div
          v-if="notice"
          role="status"
          class="alert success"
        >
          {{ notice }}
        </div>
        <section class="stats">
          <div>
            <span>首页模块</span>
            <strong>
              {{ modules.length }}
              <small>个</small>
            </strong>
          </div>
          <div>
            <span>服务入口</span>
            <strong>
              {{ entryCount }}
              <small>个</small>
            </strong>
          </div>
          <div>
            <span>可跳转入口</span>
            <strong>
              {{ liveCount }}
              <small>个</small>
            </strong>
          </div>
          <p>
            保存即生效
            <span>用户重新进入首页或下拉刷新后获取最新内容</span>
          </p>
        </section>
        <div class="editor-layout">
          <section class="module-panel panel">
            <div class="panel-heading">
              <h2>首页模块</h2>
              <button
                class="text-button"
                :disabled="busy"
                @click="editModule(null)"
              >
                ＋ 新建
              </button>
            </div>
            <p class="small muted">按排序值从小到大展示</p>
            <button
              v-for="m in modules"
              :key="m.id"
              class="module-item"
              :class="{selected: selected === m.id}"
              @click="selected = m.id; search = ''"
            >
              <span class="layout-icon">
                {{ m.layout === 'GRID' ? '▦' : m.layout === 'CARD' ? '▤' : '▰' }}
              </span>
              <span class="module-info">
                <strong>{{ m.title }}</strong>
                <small>{{ labels[m.layout] }} · {{ m.entries.length }} 个入口</small>
              </span>
              <span
                v-if="!m.enabled"
                class="off-dot"
                title="已停用"
              />
              <span class="chevron">›</span>
            </button>
            <div
              v-if="!modules.length"
              class="empty"
            >
              从新建一个模块开始
            </div>
          </section>
          <section class="entry-panel panel">
            <div v-if="current">
              <div class="panel-heading">
                <div>
                  <h2>
                    {{ current.title }}
                    <span
                      class="status"
                      :class="{off:!current.enabled}"
                    >
                      {{ current.enabled ? '展示中' : '已停用' }}
                    </span>
                  </h2>
                  <p class="small muted">
                    {{ labels[current.layout] }} · 排序 {{ current.sortOrder }} · {{
                    current.subtitle || '让好内容被看见' }}
                  </p>
                </div>
                <div class="actions">
                  <button
                    class="outline compact"
                    :disabled="busy"
                    @click="editModule(current)"
                  >
                    编辑模块
                  </button>
                  <button
                    class="primary compact"
                    :disabled="busy"
                    @click="editEntry(null)"
                  >
                    ＋ 新增入口
                  </button>
                </div>
              </div>
              <div class="list-toolbar">
                <input
                  v-model="search"
                  class="list-search"
                  placeholder="⌕  搜索当前模块的入口"
                  aria-label="搜索入口"
                />
                <div class="actions">
                  <button
                    class="text-button"
                    :disabled="busy"
                    @click="toggle('modules', current)"
                  >
                    {{ current.enabled ? '停用模块' : '启用模块' }}
                  </button>
                  <button
                    class="text-button danger"
                    :disabled="busy"
                    @click="remove('modules', current)"
                  >
                    删除模块
                  </button>
                </div>
              </div>
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>入口内容</th>
                      <th>跳转方式</th>
                      <th>排序</th>
                      <th>状态</th>
                      <th class="align-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="entry in entries"
                      :key="entry.id"
                    >
                      <td>
                        <div class="entry-info">
                          <div
                            class="entry-thumb"
                            :class="'theme-' + entry.theme"
                          >
                            <img
                              v-if="entry.imageUrl"
                              :src="entry.imageUrl"
                              alt=""
                            />
                            <span v-else>{{ entry.iconText || entry.title.slice(0,1) }}</span>
                          </div>
                          <div>
                            <strong>{{ entry.title }}</strong>
                            <small>{{ entry.subtitle || '—' }}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          class="target-tag"
                          :class="{pending:entry.targetType !== 'MINIPROGRAM'}"
                        >
                          {{ entry.targetType === 'MINIPROGRAM' ? '小程序' : '仅展示' }}
                        </span>
                      </td>
                      <td class="muted">{{ entry.sortOrder }}</td>
                      <td>
                        <button
                          class="switch"
                          :class="{on:entry.enabled}"
                          role="switch"
                          :aria-checked="entry.enabled"
                          :aria-label="entry.title + '的展示状态'"
                          :disabled="busy"
                          @click="toggle('entries',entry)"
                        >
                          <i />
                        </button>
                      </td>
                      <td class="align-right">
                        <button
                          class="text-button"
                          :disabled="busy"
                          @click="editEntry(entry)"
                        >
                          编辑
                        </button>
                        <button
                          class="text-button danger"
                          :disabled="busy"
                          @click="remove('entries',entry)"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div
                v-if="!entries.length"
                class="empty"
              >
                {{ search ? '没有找到相关入口' : '还没有入口，点击“新增入口”添加第一条内容' }}
              </div>
              <div class="panel-foot">
                共 {{ current.entries.length }} 个入口 · 图片、标题、跳转目标均可独立配置
              </div>
            </div>
            <div
              v-else
              class="empty large-empty"
            >
              <span>▦</span>
              <h2>为首页添加第一个模块</h2>
              <p>图标宫格、双列卡片或轮播横幅，由你决定。</p>
              <button
                class="primary"
                @click="editModule(null)"
              >
                ＋ 新建模块
              </button>
            </div>
          </section>
        </div>
        <footer class="workspace-footer">
          券小站 · 内容管理
          <span>每个入口，都是生活里的小惊喜。</span>
        </footer>
      </main>
      <div
        v-if="modal"
        class="modal-backdrop"
        @click.self="close"
        @keydown.esc="close"
      >
        <section
          class="modal"
          role="dialog"
          aria-modal="true"
          :aria-label="modal === 'module' ? '编辑模块' : '编辑入口'"
        >
          <div class="modal-heading">
            <div>
              <span class="eyebrow">
                {{ modal === 'module' ? 'HOME MODULE' : 'SERVICE ENTRY' }}
              </span>
              <h2>
                {{ form.id ? '编辑' : '新建' }}{{ modal === 'module' ? '首页模块' : '服务入口' }}
              </h2>
            </div>
            <button
              class="close-button"
              :disabled="busy"
              @click="close"
              aria-label="关闭"
            >
              ×
            </button>
          </div>
          <form @submit.prevent="save">
            <div class="form-body">
              <div
                v-if="error"
                class="alert error"
                role="alert"
              >
                {{ error }}
              </div>
              <template v-if="modal === 'module'">
                <label>
                  模块名称
                  <input
                    v-model="form.title"
                    maxlength="40"
                    required
                    placeholder="例如：今日精选"
                  />
                </label>
                <label>
                  模块说明
                  <input
                    v-model="form.subtitle"
                    maxlength="80"
                    placeholder="显示在模块标题旁的简短说明"
                  />
                </label>
                <label>
                  展示布局
                  <select v-model="form.layout">
                    <option
                      v-for="(name,key) in labels"
                      :value="key"
                    >
                      {{ name }}
                    </option>
                  </select>
                </label>
              </template>
              <template v-else>
                <div class="form-columns">
                  <label>
                    所属模块
                    <select v-model="form.moduleId">
                      <option
                        v-for="m in modules"
                        :value="m.id"
                      >
                        {{ m.title }}
                      </option>
                    </select>
                  </label>
                  <label>
                    入口名称
                    <input
                      v-model="form.title"
                      maxlength="40"
                      required
                      placeholder="例如：美团外卖"
                    />
                  </label>
                </div>
                <label>
                  入口说明
                  <input
                    v-model="form.subtitle"
                    maxlength="100"
                    placeholder="简短介绍这项服务"
                  />
                </label>
                <div class="image-field">
                  <div
                    class="image-preview"
                    :class="'theme-' + form.theme"
                  >
                    <img
                      v-if="form.imageUrl"
                      :src="form.imageUrl"
                      alt="入口图片预览"
                    />
                    <span v-else>{{ form.iconText || '券' }}</span>
                  </div>
                  <div>
                    <strong>入口图片</strong>
                    <p class="small muted">PNG / JPEG，≤ 2MB，最长边 ≤ 4096px</p>
                    <label class="upload-button">
                      ↑ 上传图片
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        @change="upload"
                        :disabled="busy"
                      />
                    </label>
                    <button
                      v-if="form.imageUrl"
                      type="button"
                      class="text-button danger"
                      :disabled="busy"
                      @click="form.imageUrl = ''"
                    >
                      移除
                    </button>
                  </div>
                </div>
                <label>
                  图片地址
                  <input
                    v-model="form.imageUrl"
                    maxlength="1000"
                    placeholder="上传生成的地址，或 HTTPS 图片地址"
                  />
                </label>
                <div class="form-columns">
                  <label>
                    备用图标文字
                    <input
                      v-model="form.iconText"
                      maxlength="8"
                      placeholder="美 / 滴 / ☕"
                    />
                  </label>
                  <label>
                    主题颜色
                    <select v-model="form.theme">
                      <option
                        v-for="(name,key) in themes"
                        :value="key"
                      >
                        {{ name }}
                      </option>
                    </select>
                  </label>
                  <label>
                    角标
                    <input
                      v-model="form.badge"
                      maxlength="12"
                      placeholder="可不填写"
                    />
                  </label>
                </div>
                <div class="form-divider">点击后打开哪里？</div>
                <label>
                  跳转方式
                  <select v-model="form.targetType">
                    <option value="NONE">仅展示（敬请期待）</option>
                    <option value="MINIPROGRAM">打开微信小程序</option>
                  </select>
                </label>
                <template v-if="form.targetType === 'MINIPROGRAM'">
                  <label>
                    目标 AppID
                    <input
                      v-model="form.appId"
                      pattern="wx[a-fA-F0-9]{16}"
                      maxlength="18"
                      required
                      placeholder="wx 开头的 18 位小程序 AppID"
                    />
                  </label>
                  <label>
                    页面路径
                    <input
                      v-model="form.path"
                      maxlength="2048"
                      placeholder="留空打开首页，例如 pages/index/index?key=value"
                    />
                  </label>
                  <details>
                    <summary>附加参数（可选）</summary>
                    <label>
                      <textarea
                        v-model="form.extraJson"
                        rows="4"
                        spellcheck="false"
                        maxlength="4096"
                        aria-label="附加参数 JSON"
                      />
                    </label>
                  </details>
                </template>
              </template>
              <div class="form-columns bottom-fields">
                <label>
                  排序值
                  <input
                    v-model.number="form.sortOrder"
                    type="number"
                    min="0"
                    max="99999"
                    required
                  />
                  <small>数值越小越靠前</small>
                </label>
                <label class="checkbox-label">
                  <input
                    v-model="form.enabled"
                    type="checkbox"
                  />
                  启用并展示
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <span>保存后，首页刷新即可生效</span>
              <button
                type="button"
                class="outline"
                :disabled="busy"
                @click="close"
              >
                取消
              </button>
              <button
                class="primary"
                :disabled="busy"
              >
                {{ busy ? '处理中…' : '保存配置' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  `,
}).mount('#app');
