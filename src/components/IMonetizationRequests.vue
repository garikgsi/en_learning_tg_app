<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {httpEnCoinDriver} from '@/api/http/encoin';
import type {AdminMonetizationRequest, MonetizationStatus} from '@/api/types/encoin';
import {useUserStore} from '@/stores/userStore';
import {useMonetizationStore} from '@/stores/monetizationStore';
import {useNetwork} from '@/use/network';
import {getApiErrorMessage} from '@/api/errors';
import {formatEnCoinDate, formatRubles} from '@/use/encoin';
import useMessages from '@/use/messages';

const userStore = useUserStore();
const monetizationStore = useMonetizationStore();
const {isConnected} = useNetwork();
const {add} = useMessages();
const items = ref<AdminMonetizationRequest[]>([]);
const status = ref<MonetizationStatus>('all');
const filters = [{title: 'Все запросы', value: 'all'}, {title: 'Ожидают обработки', value: 'pending'}, {title: 'Обработанные', value: 'processed'}];
const page = ref(1);
const lastPage = ref(1);
const total = ref(0);
const isLoading = ref(false);
const processingId = ref<number | null>(null);
const error = ref('');
const rate = ref<number | null>(null);
const rateDraft = ref('');
const rateError = ref('');
const isRateLoading = ref(false);
const isRateSaving = ref(false);
let sequence = 0;
const normalizedRate = computed(() => rateDraft.value.trim().replace(',', '.'));
const canSaveRate = computed(() => userStore.isAdmin && isConnected.value && !isRateSaving.value && rate.value !== null && /^\d+(?:\.\d{1,2})?$/.test(normalizedRate.value) && Number(normalizedRate.value) >= 0.01 && Number(normalizedRate.value) <= 100000 && Number(normalizedRate.value) !== rate.value);

const load = async () => {
  if (!userStore.isAdmin) return;
  const current = ++sequence;
  isLoading.value = true;
  error.value = '';
  try {
    const response = await httpEnCoinDriver.getRequests(status.value, page.value);
    if (current === sequence) {
      items.value = response.items;
      lastPage.value = response.lastPage;
      total.value = response.total;
      if (status.value === 'pending') monetizationStore.pendingCount = response.total;
      else await monetizationStore.synchronize().catch(() => undefined);
    }
  } catch (cause) {
    if (current === sequence) error.value = getApiErrorMessage(cause, 'Не удалось загрузить запросы');
  } finally {
    if (current === sequence) isLoading.value = false;
  }
};
const changeStatus = () => { page.value = 1; void load(); };
const loadRate = async () => {
  if (!userStore.isAdmin) return;
  isRateLoading.value = true;
  rateError.value = '';
  try {
    const response = await httpEnCoinDriver.getRate();
    rate.value = response.rublesPerCoin;
    rateDraft.value = String(response.rublesPerCoin);
  } catch (cause) {
    rateError.value = getApiErrorMessage(cause, 'Не удалось загрузить курс');
  } finally {
    isRateLoading.value = false;
  }
};
const saveRate = async () => {
  if (!canSaveRate.value) return;
  isRateSaving.value = true;
  rateError.value = '';
  try {
    const response = await httpEnCoinDriver.updateRate(normalizedRate.value);
    rate.value = response.rublesPerCoin;
    rateDraft.value = String(response.rublesPerCoin);
    add('Курс EnCoin обновлён');
  } catch (cause) {
    rateError.value = getApiErrorMessage(cause, 'Не удалось обновить курс');
  } finally {
    isRateSaving.value = false;
  }
};
const process = async (request: AdminMonetizationRequest) => {
  if (!userStore.isAdmin || processingId.value !== null || request.isProcessed || !isConnected.value) return;
  processingId.value = request.id;
  error.value = '';
  try {
    const response = await httpEnCoinDriver.process(request.id);
    items.value = items.value.map(item => item.id === request.id ? response.item : item);
    add('Запрос отмечен обработанным');
    await load();
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Не удалось обработать запрос');
  } finally {
    processingId.value = null;
  }
};
onMounted(() => { if (userStore.isAdmin) void Promise.all([load(), loadRate()]); });
</script>

<template>
  <div class="monetization mx-auto">
    <v-alert v-if="!userStore.isAdmin" type="error" variant="tonal">Страница доступна только администраторам.</v-alert>
    <template v-else>
      <h1 class="text-h5 mb-5">Запросы на монетизацию</h1>
      <v-card variant="outlined" class="mb-5">
        <v-card-title class="pt-5 px-5">Курс EnCoin</v-card-title>
        <v-card-text class="pa-5 pt-2">
          <v-skeleton-loader v-if="isRateLoading" type="text" />
          <v-table v-else-if="rate !== null" density="compact" class="mb-4">
            <thead><tr><th>Монета</th><th>Текущий курс</th></tr></thead>
            <tbody><tr><td>1 EnCoin</td><td class="font-weight-medium">{{ formatRubles(rate) }}</td></tr></tbody>
          </v-table>
          <v-alert v-if="rateError" type="error" variant="tonal" class="mb-3">
            {{ rateError }}<v-btn v-if="rate === null" variant="tonal" @click="loadRate">Повторить</v-btn>
          </v-alert>
          <v-form v-if="rate !== null" class="monetization__rate-form" @submit.prevent="saveRate">
            <v-text-field v-model="rateDraft" label="Рублей за 1 EnCoin" type="number" min="0.01" max="100000" step="0.01" variant="outlined" density="compact" hide-details :disabled="isRateSaving" />
            <v-btn type="submit" color="primary" :disabled="!canSaveRate" :loading="isRateSaving">Сохранить курс</v-btn>
          </v-form>
          <p class="text-body-2 text-medium-emphasis mt-3">Новый курс применяется к новым начислениям и запросам на вывод. Сумма уже созданной заявки сохраняется.</p>
        </v-card-text>
      </v-card>
      <div class="d-flex align-center ga-3 mb-4">
        <v-select v-model="status" :items="filters" label="Статус" variant="outlined" density="compact" hide-details @update:model-value="changeStatus" />
        <v-btn aria-label="Обновить запросы" icon="mdi-refresh" variant="tonal" :disabled="!isConnected" :loading="isLoading" @click="load" />
      </div>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
      <v-progress-linear v-if="isLoading" indeterminate color="primary" class="mb-3" />
      <p v-if="!isLoading && !error && !items.length" class="text-body-1 text-medium-emphasis">Запросов пока нет.</p>
      <p class="text-body-2 text-medium-emphasis mb-3">Обработка фиксируется после перевода денег пользователю.</p>
      <v-card v-for="request in items" :key="request.id" variant="outlined" class="mb-3">
        <v-card-text class="pa-5">
          <div class="monetization__request-header mb-4">
            <div><div class="text-subtitle-1 font-weight-medium">{{ request.user.name }}</div><div class="text-caption text-medium-emphasis">{{ request.user.phone }}</div></div>
            <v-chip size="small" variant="tonal" :color="request.isProcessed ? 'success' : 'primary'">{{ request.isProcessed ? 'Обработан' : 'Ожидает обработки' }}</v-chip>
          </div>
          <div class="monetization__details">
            <div><div class="text-caption text-medium-emphasis">Актуальный баланс</div><div class="font-weight-medium">{{ request.user.balance }} EnCoin</div></div>
            <div><div class="text-caption text-medium-emphasis">Запрошено</div><div class="font-weight-medium">{{ request.coins }} EnCoin</div></div>
            <div><div class="text-caption text-medium-emphasis">К выплате</div><div class="font-weight-medium">{{ formatRubles(request.amountRubles) }}</div></div>
            <div><div class="text-caption text-medium-emphasis">Дата запроса</div><div>{{ formatEnCoinDate(request.createdAt) }}</div></div>
          </div>
          <div class="text-caption text-medium-emphasis mt-3">Курс заявки: 1 EnCoin = {{ formatRubles(request.rublesPerCoin) }} · В заявках пользователя: {{ request.user.reserved }} EnCoin</div>
          <div class="d-flex justify-end mt-4">
            <span v-if="request.processedAt" class="text-caption text-medium-emphasis">Обработан {{ formatEnCoinDate(request.processedAt) }}</span>
            <v-btn v-else color="primary" prepend-icon="mdi-check" :disabled="!isConnected || processingId !== null" :loading="processingId === request.id" @click="process(request)">Отметить обработанным</v-btn>
          </div>
        </v-card-text>
      </v-card>
      <v-pagination v-if="lastPage > 1" v-model="page" :length="lastPage" :total-visible="5" @update:model-value="load" />
      <p v-if="total" class="text-caption text-medium-emphasis mt-3">Всего запросов: {{ total }}</p>
    </template>
  </div>
</template>

<style scoped>
.monetization { max-width: 960px; }
.monetization__rate-form { display: flex; align-items: center; gap: 12px; }
.monetization__rate-form .v-input { flex: 1; min-width: 0; }
.monetization__request-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.monetization__details { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 599px) {
  .monetization__details { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .monetization__rate-form { flex-direction: column; align-items: stretch; }
}
</style>
