<script setup lang="ts">
import {ref} from 'vue';

type Props = {
  preview?: string
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

  <v-toolbar
    class="avatar-toolbar"
    color="surface-variant"
    density="compact"
    rounded="lg"
  >
    <v-avatar
      v-if="preview || processing"
      class="ml-2 mr-1"
      color="primary"
      size="36"
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

    <v-spacer></v-spacer>

    <v-btn
      :disabled="processing"
      prepend-icon="mdi-camera"
      size="small"
      type="button"
      variant="text"
      @click="cameraInput?.click()"
    >
      Камера
    </v-btn>
    <v-btn
      :disabled="processing"
      prepend-icon="mdi-image-outline"
      size="small"
      type="button"
      variant="text"
      @click="galleryInput?.click()"
    >
      Галерея
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

.avatar-toolbar__progress {
  align-items: center;
  background: rgb(0 0 0 / 48%);
  display: flex;
  inset: 0;
  justify-content: center;
  position: absolute;
}
</style>
