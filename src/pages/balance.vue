<script setup lang="ts">
import {computed, nextTick, onMounted, ref} from 'vue';
import {httpEnCoinDriver} from '@/api/http/encoin';
import type {EnCoinBalance} from '@/api/types/encoin';
import {getApiErrorMessage} from '@/api/errors';
import {useNetwork} from '@/use/network';
import {formatEnCoinDate, formatRubles} from '@/use/encoin';
import useMessages from '@/use/messages';

const {isConnected} = useNetwork();
const {add} = useMessages();
const balance = ref<EnCoinBalance | null>(null);
const isLoading = ref(false);
const isWithdrawing = ref(false);
const isWithdrawOpen = ref(false);
const coins = ref('');
const error = ref('');
const withdrawalError = ref('');
let clientRequestId: string | null = null;
const canWithdraw = computed(() => !!balance.value
  && balance.value.available >= balance.value.withdrawalThreshold
  && balance.value.hasCompletedDailyThisWeek
  && isConnected.value
  && !isLoading.value
  && !isWithdrawing.value);
const validCoins = computed(() => /^\d+$/.test(coins.value) && Number.isSafeInteger(Number(coins.value)) && Number(coins.value) > 0 && Number(coins.value) <= (balance.value?.available ?? 0));

const load = async () => {
  isLoading.value = true;
  error.value = '';
  try {
    balance.value = await httpEnCoinDriver.getBalance();
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Не удалось загрузить баланс');
  } finally {
    isLoading.value = false;
  }
};
const changeCoins = async (value: string) => {
  const available = balance.value?.available ?? 0;
  coins.value = value;
  clientRequestId = null;
  withdrawalError.value = '';
  if (/^\d+$/.test(value) && Number(value) > available) {
    await nextTick();
    if (coins.value === value) coins.value = String(available);
  }
};
const withdraw = async () => {
  if (!canWithdraw.value || !validCoins.value) return;
  isWithdrawing.value = true;
  withdrawalError.value = '';
  clientRequestId ??= crypto.randomUUID();
  try {
    await httpEnCoinDriver.withdraw(Number(coins.value), clientRequestId);
  } catch (cause) {
    withdrawalError.value = getApiErrorMessage(cause, 'Не удалось отправить запрос на вывод');
    return;
  } finally {
    isWithdrawing.value = false;
  }
  isWithdrawOpen.value = false;
  coins.value = '';
  clientRequestId = null;
  add('Запрос на вывод отправлен. Монеты зарезервированы до обработки.');
  await load();
};
onMounted(load);
</script>

<template>
  <div class="encoin-balance mx-auto">
    <div class="d-flex align-center justify-space-between mb-5">
      <h1 class="text-h5">Баланс</h1>
      <v-btn aria-label="Обновить баланс" icon="mdi-refresh" variant="tonal" :loading="isLoading" :disabled="!isConnected || isWithdrawing" @click="load" />
    </div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-alert v-if="!isConnected" type="info" variant="tonal" class="mb-4">Для обновления баланса и вывода монет нужно подключение к интернету.</v-alert>
    <v-skeleton-loader v-if="!balance && isLoading" type="card" />
    <v-card v-if="balance" variant="tonal" color="primary" class="mb-5">
      <v-card-text class="pa-5 pa-sm-6">
        <div class="text-overline">Ваш баланс</div>
        <div class="text-h3 font-weight-medium mt-2">{{ balance.balance }} <span class="text-h6">EnCoin</span></div>
        <div class="text-h6 mt-2">{{ formatRubles(balance.balance * balance.rublesPerCoin) }}</div>
        <v-chip class="mt-4" variant="outlined">1 EnCoin = {{ formatRubles(balance.rublesPerCoin) }}</v-chip>
        <div class="encoin-balance__summary mt-5">
          <div><div class="text-caption">Доступно для вывода</div><div class="text-subtitle-1 font-weight-medium">{{ balance.available }} EnCoin</div></div>
          <div><div class="text-caption">В заявках на вывод</div><div class="text-subtitle-1 font-weight-medium">{{ balance.reserved }} EnCoin</div></div>
        </div>
        <v-menu v-model="isWithdrawOpen" :close-on-content-click="false" location="bottom end" max-width="360">
          <template #activator="{props}">
            <v-btn v-bind="props" class="mt-5" color="primary" variant="elevated" prepend-icon="mdi-cash-fast" :disabled="!canWithdraw">Вывести</v-btn>
          </template>
          <v-card class="pa-4" min-width="280">
            <h2 class="text-h6 mb-3">Вывод EnCoin</h2>
            <v-form @submit.prevent="withdraw">
              <v-text-field
                :model-value="coins"
                label="Количество монет"
                type="number"
                min="1"
                step="1"
                :max="balance.available"
                variant="outlined"
                :disabled="isWithdrawing"
                autofocus
                :hint="`Доступно: ${balance.available} EnCoin`"
                persistent-hint
                :error-messages="coins && !validCoins ? 'Введите целое количество монет от 1 до ' + balance.available : []"
                @update:model-value="changeCoins"
              />
              <p v-if="validCoins" class="text-body-2 mb-3">К зачислению: {{ formatRubles(Number(coins) * balance.rublesPerCoin) }}</p>
              <v-alert v-if="withdrawalError" type="error" variant="tonal" class="mb-3">{{ withdrawalError }}</v-alert>
              <div class="d-flex justify-end ga-2">
                <v-btn variant="tonal" :disabled="isWithdrawing" @click="isWithdrawOpen = false">Отмена</v-btn>
                <v-btn type="submit" color="primary" :disabled="!validCoins || !canWithdraw" :loading="isWithdrawing">Отправить</v-btn>
              </div>
            </v-form>
          </v-card>
        </v-menu>
        <p v-if="balance.available < balance.withdrawalThreshold" class="text-body-2 mt-3">Вывод доступен при доступном балансе от {{ balance.withdrawalThreshold }} EnCoin.</p>
        <p v-else-if="!balance.hasCompletedDailyThisWeek" class="text-body-2 mt-3">Для вывода пройдите хотя бы одно ежедневное задание на текущей неделе.</p>
      </v-card-text>
    </v-card>

    <v-card v-if="balance" variant="tonal" color="success" class="mb-5">
      <v-card-text class="pa-5 pa-sm-6">
        <div v-if="balance.totalEarnedCoins > 0" class="text-subtitle-1 font-weight-medium mb-3">Заработано за всё время</div>
        <div v-if="balance.totalEarnedCoins === 0" class="encoin-balance__start">
          <v-avatar class="encoin-balance__coin" size="56"><v-icon icon="mdi-hand-coin-outline" size="32" /></v-avatar>
          <div class="encoin-balance__start-content">
            <h2 class="text-h6 font-weight-medium">Начните зарабатывать деньги просто проходя упражнения и играя в игры</h2>
            <div class="encoin-balance__start-action mt-4">
              <v-btn color="success" variant="flat" prepend-icon="mdi-play-circle-outline" to="/exercises">К упражнениям</v-btn>
              <v-btn color="success" variant="flat" prepend-icon="mdi-gamepad-variant-outline" to="/games">К играм</v-btn>
            </div>
          </div>
        </div>
        <template v-else>
          <div class="d-flex flex-wrap align-baseline ga-3">
            <div class="text-h5">{{ balance.totalEarnedCoins }} <span class="text-body-1">EnCoin</span></div>
            <div class="text-h5">{{ formatRubles(balance.totalEarnedRubles) }}</div>
          </div>
          <div class="text-caption text-medium-emphasis mt-3">Включая бонусы и уже выведенные монеты. Сумма в рублях — по курсу на момент начисления.</div>
        </template>
      </v-card-text>
    </v-card>

    <v-card variant="outlined" class="mb-5">
      <v-card-title class="pt-5 px-5">Правила монетизации</v-card-title>
      <v-card-text class="pa-5 pt-3 encoint-rules">
        <p>За прохождение ежедневного задания вы получаете 1 монету, за прохождение еженедельного задания - 5 монет. Если задание выполнено без просрочки - начисляются бонусы. Бонус также начисляется за прохождение всех заданий за неделю.</p>
        <div class="d-flex flex-wrap ga-2 my-4">
          <v-chip size="small" variant="tonal">Daily: 1 + 1 без просрочки</v-chip>
          <v-chip size="small" variant="tonal">Weekly: 5</v-chip>
          <v-chip size="small" variant="tonal">Все задания недели: +5</v-chip>
        </div>
        <p>Дополнительно можно зарабатывать монеты в играх. Правила начисления определяются в каждой игре.</p>
        <p>Каждая монета может быть обменена на рубли по текущему курсу, указанному на странице баланса.</p>
        <p>Вывод монет доступен после достижения баланса в 50 и прохождения хотя бы одного ежедневного задания на текущей неделе. Для вывода нажмите на кнопку Вывести и укажите количество монет - деньги будут зачислены на карту в течение суток.</p>
        <p class="text-medium-emphasis">Награда начисляется один раз за упражнение. Бонус недели — один раз, сразу после прохождения всех назначенных на эту неделю ежедневных и еженедельных заданий. Монеты в заявках недоступны для повторного вывода.</p>
      </v-card-text>
    </v-card>
    <v-card v-if="balance?.requests.length" variant="outlined">
      <v-card-title class="pt-5 px-5">Запросы на вывод</v-card-title>
      <v-list>
        <v-list-item v-for="request in balance.requests" :key="request.id" :title="`${request.coins} EnCoin · ${formatRubles(request.amountRubles)}`" :subtitle="formatEnCoinDate(request.createdAt)">
          <template #append><v-chip size="small" :color="request.isProcessed ? 'success' : 'primary'" variant="tonal">{{ request.isProcessed ? 'Обработан' : 'Ожидает' }}</v-chip></template>
        </v-list-item>
      </v-list>
    </v-card>
  </div>
</template>

<style scoped>
.encoin-balance { max-width: 760px; }
.encoin-balance__summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.encoin-balance__start { display: flex; align-items: flex-start; gap: 16px; }
.encoin-balance__start-content { flex: 1; min-width: 0; }
.encoin-balance__start-action { display: flex; justify-content: space-between; gap: 12px; }
.encoin-balance__coin { background: rgba(var(--v-theme-success), 0.12); }
@media (max-width: 599px) {
  .encoin-balance__start { display: flow-root; }
  .encoin-balance__coin { float: left; margin: 0 12px 8px 0; }
  .encoin-balance__start-action { clear: both; }
}
.encoint-rules p + p { margin-top: 16px; }
</style>
