<template>
  <AppLayout title="使用帮助" :show-back="true">
    <div class="help-page">

      <section class="help-section card">
        <h2>🏠 快速入门</h2>
        <ol>
          <li><strong>注册账号</strong>：在登录页点击"去注册"，填写用户名、邮箱和密码。注册后需要管理员审批才能使用。</li>
          <li><strong>登录</strong>：使用用户名或邮箱 + 密码登录。</li>
          <li><strong>添加菜品</strong>：在"菜品"页面点击"+ 新增"，输入菜名和做法。</li>
          <li><strong>创建菜单</strong>：在首页点击"+ 创建新菜单"，设置菜单标题、用餐时间、邀请家人，添加菜品。</li>
          <li><strong>选菜投票</strong>：收到邀请后，在菜单详情页选择自己想吃的菜品。</li>
        </ol>
      </section>

      <section class="help-section card">
        <h2>📋 菜单流程</h2>
        <div class="flow-steps">
          <div class="flow-step">
            <span class="step-badge">1</span>
            <div>
              <strong>创建草稿</strong>
              <p>菜单创建后为"草稿"状态，可以随意编辑标题、菜品和邀请人。</p>
            </div>
          </div>
          <div class="flow-step">
            <span class="step-badge">2</span>
            <div>
              <strong>发布选菜</strong>
              <p>确认菜品和邀请人后，点击"发布"。被邀请的家人会收到通知，可以开始选菜。</p>
            </div>
          </div>
          <div class="flow-step">
            <span class="step-badge">3</span>
            <div>
              <strong>截止选菜</strong>
              <p>到达截止时间或手动关闭选菜，不再接受新的选择。</p>
            </div>
          </div>
          <div class="flow-step">
            <span class="step-badge">4</span>
            <div>
              <strong>开始烹饪</strong>
              <p>选菜结束后进入"烹饪中"状态。可以打印菜单清单。</p>
            </div>
          </div>
          <div class="flow-step">
            <span class="step-badge">5</span>
            <div>
              <strong>完成</strong>
              <p>用餐结束后标记为"已完成"，归档保存。</p>
            </div>
          </div>
        </div>
      </section>

      <section class="help-section card">
        <h2>🍽 菜品管理</h2>
        <ul>
          <li><strong>创建菜品</strong>：输入菜名（必填），可添加描述（支持 Markdown 格式）、标签、烹饪方式、食材。</li>
          <li><strong>搜索菜品</strong>：支持中文名、拼音全拼、拼音首字母搜索。例如搜索"hsr"可找到"红烧肉"。</li>
          <li><strong>上传照片</strong>：在菜品详情页上传 JPG/PNG/WebP 格式照片，单张不超过 5MB。</li>
          <li><strong>克隆菜品</strong>：可以基于已有菜品快速创建变体。</li>
        </ul>
      </section>

      <section class="help-section card">
        <h2>❤️ 偏好统计</h2>
        <p>在"偏好"页面可以查看家庭成员的菜品偏好统计，了解每个人最喜欢的菜品。</p>
      </section>

      <section class="help-section card">
        <h2>🔔 通知系统</h2>
        <ul>
          <li>有新菜单邀请时会收到通知。</li>
          <li>菜单状态变更（发布、截止、开始烹饪等）会通知相关人员。</li>
          <li>底部导航栏的通知图标会显示未读数量。</li>
        </ul>
      </section>

      <section class="help-section card">
        <h2>👤 个人设置</h2>
        <ul>
          <li><strong>编辑资料</strong>：可修改显示名称、家庭角色等信息。</li>
          <li><strong>修改密码</strong>：在"我的"→"修改密码"中更改。</li>
        </ul>
      </section>

      <section class="help-section card">
        <h2>🔧 管理员功能</h2>
        <p>管理员可在"我的"→"管理后台"中进行以下操作：</p>
        <ul>
          <li><strong>用户管理</strong>：审批新注册用户、创建用户、重置密码。</li>
          <li><strong>标签管理</strong>：添加和管理菜品标签（如"辣"、"素食"等）。</li>
          <li><strong>烹饪方式管理</strong>：添加烹饪方式（如"炒"、"蒸"、"煮"等）。</li>
          <li><strong>食材管理</strong>：管理食材及食材分类。</li>
        </ul>
      </section>

      <section class="help-section card">
        <h2>📱 PWA 支持</h2>
        <p>本应用支持 PWA（渐进式网页应用），可以添加到手机主屏幕像原生 App 一样使用。</p>
        <ul>
          <li><strong>iOS</strong>：Safari 中点击分享按钮 → "添加到主屏幕"。</li>
          <li><strong>Android</strong>：Chrome 中点击菜单 → "添加到主屏幕"或"安装应用"。</li>
        </ul>
      </section>

      <section class="help-section card">
        <h2>💡 常见问题</h2>
        <dl>
          <dt>Q：注册后无法登录？</dt>
          <dd>A：新注册的账号需要管理员审批后才能使用。请联系管理员。</dd>
          <dt>Q：如何邀请家人？</dt>
          <dd>A：先让家人注册账号并通过审批，然后在创建菜单时勾选要邀请的人。</dd>
          <dt>Q：菜品搜索没有结果？</dt>
          <dd>A：试试用拼音首字母搜索，例如输入"hsr"搜索"红烧肉"。</dd>
          <dt>Q：如何打印菜单？</dt>
          <dd>A：在菜单管理页面点击"打印"按钮，会打开打印友好的页面。</dd>
        </dl>
      </section>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue';
</script>

<style scoped>
.help-page { padding-bottom: var(--spacing-lg); }

.help-section {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
}

.help-section h2 {
  font-size: var(--font-size-lg);
  margin-bottom: var(--spacing-sm);
}

.help-section ol, .help-section ul {
  padding-left: var(--spacing-lg);
}

.help-section li {
  margin-bottom: var(--spacing-xs);
  line-height: 1.6;
}

.flow-steps {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.flow-step {
  display: flex;
  gap: var(--spacing-sm);
  align-items: flex-start;
}

.step-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: var(--font-size-sm);
  flex-shrink: 0;
}

.flow-step p {
  margin: var(--spacing-xxs) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

dl {
  margin: 0;
}

dt {
  font-weight: 600;
  margin-top: var(--spacing-sm);
}

dd {
  margin-left: var(--spacing-md);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}
</style>
