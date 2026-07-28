<script setup lang="ts">
import {nextTick, onBeforeUnmount, ref} from 'vue';
import {PIN_CODE_LENGTH} from '@/stores/userStore';

type Props = {
  autofocus?: boolean
  loading?: boolean
}

defineProps<Props>();

const emit = defineEmits<{
  finish: [value: string]
}>();

const model = defineModel<string>({
  default: '',
});

type OtpInputExpose = {
  focus: () => void
  reset: () => void
}

const otpInput = ref<OtpInputExpose | null>(null);
let revealedInput: HTMLInputElement | null = null;
let maskTimer: ReturnType<typeof setTimeout> | null = null;

const maskRevealedInput = (): void => {
  if (maskTimer) {
    clearTimeout(maskTimer);
    maskTimer = null;
  }

  if (revealedInput) {
    revealedInput.type = 'password';
    revealedInput = null;
  }
}

const revealEnteredDigit = (event: Event): void => {
  const input = event.target;

  if (!(input instanceof HTMLInputElement) || !input.classList.contains('v-otp-input__field')) {
    return;
  }

  maskRevealedInput();

  if (!input.value) {
    return;
  }

  revealedInput = input;
  input.type = 'text';
  maskTimer = setTimeout(maskRevealedInput, 200);
}

const updatePinCode = (value: string) => {
  const pinCode = value.replace(/\D/g, '').slice(0, PIN_CODE_LENGTH);
  model.value = pinCode;

  if (pinCode.length === PIN_CODE_LENGTH) {
    emit('finish', pinCode);
  }
}

const clearAndFocus = async (): Promise<void> => {
  maskRevealedInput();
  model.value = '';
  otpInput.value?.reset();

  await nextTick();
  otpInput.value?.focus();
}

defineExpose({
  clearAndFocus,
});

onBeforeUnmount(maskRevealedInput);
</script>

<template>
  <div @input.capture="revealEnteredDigit">
  <v-otp-input
    ref="otpInput"
    :autofocus="autofocus"
    :length="PIN_CODE_LENGTH"
    :loading="loading"
    :model-value="model"
    class="pin-code-input"
    divider="-"
    label="Цифра ПИН-кода"
    type="password"
    @update:model-value="updatePinCode"
  ></v-otp-input>
  </div>
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

.pin-code-input :deep(.v-otp-input__field) {
  font-size: 1.35rem;
  font-weight: 900;
}

.pin-code-input :deep(.v-otp-input__divider) {
  flex: 0 0 auto;
  margin-inline: 0;
}
</style>
