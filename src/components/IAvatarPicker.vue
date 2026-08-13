<script setup lang="ts">
import {ref} from 'vue';

type Props = {
  src?: string
  initial?: string
  processing?: boolean
}

defineProps<Props>();

const emit = defineEmits<{
  select: [file: File]
}>();

const cameraInput = ref<HTMLInputElement | null>(null);
const galleryInput = ref<HTMLInputElement | null>(null);

const selectFile = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (file) {
    emit('select', file);
  }

  input.value = '';
};
</script>

<template>
  <input
    ref="cameraInput"
    accept="image/*"
    capture="user"
    class="avatar-input"
    type="file"
    @change="selectFile"
  >
  <input
    ref="galleryInput"
    accept="image/*"
    class="avatar-input"
    type="file"
    @change="selectFile"
  >

  <v-menu
    :close-on-content-click="true"
    :disabled="processing"
    location="bottom center"
    offset="8"
  >
    <template #activator="{props: activatorProps}">
      <v-avatar
        v-bind="activatorProps"
        :aria-label="processing ? 'Идёт подготовка изображения' : 'Изменить аватар'"
        class="avatar-picker"
        color="primary"
        role="button"
        size="112"
        tabindex="0"
      >
        <v-img
          v-if="src"
          :src="src"
          cover
        ></v-img>
        <span v-else class="text-h3">{{ initial }}</span>

        <div v-if="processing" class="avatar-picker__progress">
          <v-progress-circular
            color="white"
            indeterminate
            size="44"
            width="4"
          ></v-progress-circular>
        </div>
        <v-icon
          v-else
          class="avatar-picker__hint"
          color="white"
          icon="mdi-camera"
          size="18"
        ></v-icon>
      </v-avatar>
    </template>

    <v-card class="pa-1" rounded="lg">
      <v-list density="compact" nav>
        <v-list-item
          :disabled="processing"
          prepend-icon="mdi-camera"
          title="Камера"
          @click="cameraInput?.click()"
        ></v-list-item>
        <v-list-item
          :disabled="processing"
          prepend-icon="mdi-image-outline"
          title="Галерея"
          @click="galleryInput?.click()"
        ></v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

<style scoped>
.avatar-input {
  display: none;
}

.avatar-picker {
  cursor: pointer;
  position: relative;
}

.avatar-picker__progress {
  align-items: center;
  background: rgb(0 0 0 / 48%);
  display: flex;
  inset: 0;
  justify-content: center;
  position: absolute;
}

.avatar-picker__hint {
  background: rgb(0 0 0 / 54%);
  border-radius: 50%;
  bottom: 4px;
  padding: 4px;
  position: absolute;
  right: 4px;
}
</style>
