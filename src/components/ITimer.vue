<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';

type Props = {
  durationMs: number
  label: string
  isPaused?: boolean
  height?: number
  warningThresholdPercent?: number
  errorThresholdPercent?: number
  normalColor?: string
  warningColor?: string
  errorColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  isPaused: false,
  height: 48,
  warningThresholdPercent: 70,
  errorThresholdPercent: 90,
  normalColor: 'green-darken-3',
  warningColor: 'warning',
  errorColor: 'error',
});
const emit = defineEmits<{
  timeout: []
}>();

const timerStepMs = 100;
const elapsedMs = ref(0);
const hasTimedOut = ref(false);
let interval: ReturnType<typeof setInterval> | null = null;

const elapsedPercent = computed(() => {
  if (props.durationMs <= 0) {
    return 100;
  }

  return (elapsedMs.value / props.durationMs) * 100;
});
const progressColor = computed(() => {
  if (elapsedPercent.value > props.errorThresholdPercent) {
    return props.errorColor;
  }

  if (elapsedPercent.value > props.warningThresholdPercent) {
    return props.warningColor;
  }

  return props.normalColor;
});

const reset = (): void => {
  elapsedMs.value = 0;
  hasTimedOut.value = false;
};

const advance = (): void => {
  if (props.isPaused || hasTimedOut.value) {
    return;
  }

  elapsedMs.value = Math.min(
    elapsedMs.value + timerStepMs,
    Math.max(props.durationMs, 0),
  );

  if (elapsedMs.value >= props.durationMs) {
    hasTimedOut.value = true;
    emit('timeout');
  }
};

onMounted(() => {
  interval = setInterval(advance, timerStepMs);
});

onBeforeUnmount(() => {
  if (interval !== null) {
    clearInterval(interval);
  }
});

defineExpose({reset});
</script>

<template>
  <v-sheet>
    <div
      :aria-label="label"
      class="i-timer"
      :style="{minHeight: `${height}px`}"
    >
      <v-progress-linear
        :buffer-value="elapsedMs"
        :color="progressColor"
        :height="height"
        :max="durationMs"
        rounded="sm"
      ></v-progress-linear>
      <span class="i-timer__label">{{ label }}</span>
    </div>
  </v-sheet>
</template>

<style scoped>
.i-timer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.i-timer :deep(.v-progress-linear) {
  position: absolute;
  inset: 0;
}

.i-timer__label {
  position: relative;
  z-index: 1;
  padding: 0 8px;
  text-align: center;
  pointer-events: none;
}
</style>
