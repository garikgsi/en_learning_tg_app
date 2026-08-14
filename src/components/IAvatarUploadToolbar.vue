<script setup lang="ts">
import {ref} from 'vue';
import {takeFrontCameraPhoto} from '@/api/frontCamera';
import {useDisplay} from 'vuetify';

type Props = {
  preview?: string
  processing?: boolean
}

defineProps<Props>();

const {smAndUp} = useDisplay();

const emit = defineEmits<{
  select: [file: File]
}>();

const cameraInput = ref<HTMLInputElement | null>(null);
const galleryInput = ref<HTMLInputElement | null>(null);

const openCamera = async () => {
  try {
    const file = await takeFrontCameraPhoto();
    if (file) {
      emit('select', file);
      return;
    }
  } catch {
    return;
  }

  cameraInput.value?.click();
};

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

  <v-toolbar
    class="avatar-toolbar mt-2 mb-8"
    color="transparent"
    height="70"
  >
    <v-avatar
      v-if="preview || processing"
      class="ma-4"
      color="primary"
      size="60"
    >
      <v-img v-if="preview" :src="preview" cover></v-img>
      <div v-if="processing" class="avatar-toolbar__progress">
        <v-progress-circular
          color="white"
          indeterminate
          size="22"
          width="3"
        ></v-progress-circular>
      </div>
    </v-avatar>

    <v-list-item
      v-else
      class="avatar-toolbar__prompt"
      subtitle="Загрузите аватар"
      title="Аватар"
    ></v-list-item>

    <v-spacer></v-spacer>

    <v-btn
      aria-label="Камера"
      :disabled="processing"
      :icon="!smAndUp"
      :prepend-icon="smAndUp ? 'mdi-camera' : undefined"
      size="x-large"
      type="button"
      variant="plain"
      @click="openCamera"
    >
      <v-icon v-if="!smAndUp" icon="mdi-camera"></v-icon>
      <span v-if="smAndUp">Камера</span>
    </v-btn>
    <v-btn
      aria-label="Галерея"
      :disabled="processing"
      :icon="!smAndUp"
      :prepend-icon="smAndUp ? 'mdi-image-outline' : undefined"
      size="x-large"
      type="button"
      variant="plain"
      @click="galleryInput?.click()"
    >
      <v-icon v-if="!smAndUp" icon="mdi-image-outline"></v-icon>
      <span v-if="smAndUp">Галерея</span>
    </v-btn>

  </v-toolbar>
</template>

<style scoped>
.avatar-input {
  display: none;
}

.avatar-toolbar {
  width: 100%;
}

.avatar-toolbar__prompt {
  min-width: 0;
}

.avatar-toolbar__progress {
  align-items: center;
  background: rgb(0 0 0 / 48%);
  display: flex;
  inset: 0;
  justify-content: center;
  position: absolute;
}
</style>
