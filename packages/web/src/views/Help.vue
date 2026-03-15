<template>
  <AppLayout :title="$t('help.title')" :show-back="true">
    <div class="help-page">

      <section class="help-section card">
        <h2>🏠 {{ $t('help.quick_start') }}</h2>
        <ol>
          <li><strong>{{ $t('help.qs_1_title') }}</strong>：{{ $t('help.qs_1_desc') }}</li>
          <li><strong>{{ $t('help.qs_2_title') }}</strong>：{{ $t('help.qs_2_desc') }}</li>
          <li><strong>{{ $t('help.qs_3_title') }}</strong>：{{ $t('help.qs_3_desc') }}</li>
          <li><strong>{{ $t('help.qs_4_title') }}</strong>：{{ $t('help.qs_4_desc') }}</li>
          <li><strong>{{ $t('help.qs_5_title') }}</strong>：{{ $t('help.qs_5_desc') }}</li>
        </ol>
      </section>

      <section class="help-section card">
        <h2>📋 {{ $t('help.menu_flow') }}</h2>
        <div class="flow-steps">
          <div class="flow-step">
            <span class="step-badge">1</span>
            <div>
              <strong>{{ $t('help.flow_1_title') }}</strong>
              <p>{{ $t('help.flow_1_desc') }}</p>
            </div>
          </div>
          <div class="flow-step">
            <span class="step-badge">2</span>
            <div>
              <strong>{{ $t('help.flow_2_title') }}</strong>
              <p>{{ $t('help.flow_2_desc') }}</p>
            </div>
          </div>
          <div class="flow-step">
            <span class="step-badge">3</span>
            <div>
              <strong>{{ $t('help.flow_3_title') }}</strong>
              <p>{{ $t('help.flow_3_desc') }}</p>
            </div>
          </div>
          <div class="flow-step">
            <span class="step-badge">4</span>
            <div>
              <strong>{{ $t('help.flow_4_title') }}</strong>
              <p>{{ $t('help.flow_4_desc') }}</p>
            </div>
          </div>
          <div class="flow-step">
            <span class="step-badge">5</span>
            <div>
              <strong>{{ $t('help.flow_5_title') }}</strong>
              <p>{{ $t('help.flow_5_desc') }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="help-section card">
        <h2>🍽 {{ $t('help.dish_mgmt') }}</h2>
        <ul>
          <li><strong>{{ $t('dishes.create_dish') }}</strong>：{{ $t('help.dish_create') }}</li>
          <li><strong>{{ $t('dishes.search') }}</strong>：{{ $t('help.dish_search') }}</li>
          <li><strong>{{ $t('dishes.upload_photo') }}</strong>：{{ $t('help.dish_photo') }}</li>
          <li><strong>{{ $t('dishes.clone') }}</strong>：{{ $t('help.dish_clone') }}</li>
        </ul>
      </section>

      <section class="help-section card">
        <h2>❤️ {{ $t('help.pref_title') }}</h2>
        <p>{{ $t('help.pref_desc') }}</p>
      </section>

      <section class="help-section card">
        <h2>🔔 {{ $t('help.notif_title') }}</h2>
        <ul>
          <li>{{ $t('help.notif_1') }}</li>
          <li>{{ $t('help.notif_2') }}</li>
          <li>{{ $t('help.notif_3') }}</li>
        </ul>
      </section>

      <section class="help-section card">
        <h2>👤 {{ $t('help.settings_title') }}</h2>
        <ul>
          <li><strong>{{ $t('profile.edit') }}</strong>：{{ $t('help.settings_edit') }}</li>
          <li><strong>{{ $t('profile.change_password') }}</strong>：{{ $t('help.settings_password') }}</li>
        </ul>
      </section>

      <section class="help-section card">
        <h2>🔧 {{ $t('help.admin_title') }}</h2>
        <p>{{ $t('help.admin_desc') }}</p>
        <ul>
          <li><strong>{{ $t('profile.admin') }}</strong>：{{ $t('help.admin_users') }}</li>
          <li><strong>{{ $t('dishes.tags') }}</strong>：{{ $t('help.admin_tags') }}</li>
          <li><strong>{{ $t('dishes.cooking_methods') }}</strong>：{{ $t('help.admin_methods') }}</li>
          <li><strong>{{ $t('dishes.ingredients') }}</strong>：{{ $t('help.admin_ingredients') }}</li>
        </ul>
      </section>

      <section class="help-section card">
        <h2>📱 {{ $t('help.pwa_title') }}</h2>
        <p>{{ $t('help.pwa_desc') }}</p>
        <ul>
          <li><strong>iOS</strong>：{{ $t('help.pwa_ios') }}</li>
          <li><strong>Android</strong>：{{ $t('help.pwa_android') }}</li>
        </ul>
      </section>

      <section class="help-section card">
        <h2>💡 {{ $t('help.faq_title') }}</h2>
        <dl>
          <dt>Q：{{ $t('help.faq_q1') }}</dt>
          <dd>A：{{ $t('help.faq_a1') }}</dd>
          <dt>Q：{{ $t('help.faq_q2') }}</dt>
          <dd>A：{{ $t('help.faq_a2') }}</dd>
          <dt>Q：{{ $t('help.faq_q3') }}</dt>
          <dd>A：{{ $t('help.faq_a3') }}</dd>
          <dt>Q：{{ $t('help.faq_q4') }}</dt>
          <dd>A：{{ $t('help.faq_a4') }}</dd>
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
