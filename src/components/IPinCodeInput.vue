<script setup lang="ts">
import {PIN_CODE_LENGTH} from '@/stores/userStore';

type Props = {
  autofocus?: boolean
  loading?: boolean
}

defineProps<Props>();

const model = defineModel<string>({
  default: '',
});

const updatePinCode = (value: string) => {
  model.value = value.replace(/\D/g, '').slice(0, PIN_CODE_LENGTH);
}
</script>

<template>
  <v-otp-input
    :autofocus="autofocus"
    :length="PIN_CODE_LENGTH"
    :loading="loading"
    :model-value="model"
    class="pin-code-input"
    divider="-"
    label="Цифра ПИН-кода"
    type="number"
    @update:model-value="updatePinCode"
  ></v-otp-input>
</template>

<style scoped>
.pin-code-input {
  width: 100%;
}

.pin-code-input :deep(.v-otp-input__content) {
  gap: 8px;
  width: 100%;
  max-width: none;
  padding-inline: 0;
}

.pin-code-input :deep(.v-field) {
  flex: 1 1 0;
  width: 0;
  min-width: 0;
}

.pin-code-input :deep(.v-otp-input__divider) {
  flex: 0 0 auto;
  margin-inline: 0;
}
</style>
