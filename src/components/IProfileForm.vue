<script setup lang="ts">
  import {MIN_USER_NAME_LENGTH, useUserStore} from "@/stores/userStore.ts";
  import {computed, onBeforeUnmount, ref} from "vue";
  import useMessages from '@/use/messages';
  import {prepareAvatar} from '@/utils/prepareAvatar';

  type Props = {
    name: string,
    avatar?: string
  }

  const props = defineProps<Props>();

  const userStore = useUserStore();

  const {add} = useMessages();

  const formData = ref<{name?: string, avatar?: string, avatarFile?: File|null}>({
    name: props.name,
    avatar: props.avatar,
    avatarFile: null
  });


  const avatarPreview = ref(props.avatar ?? '');
  const avatarError = ref('');
  const avatarName = ref('');
  const cameraInput = ref<HTMLInputElement | null>(null);
  const galleryInput = ref<HTMLInputElement | null>(null);
  let avatarPreviewUrl: string | null = null;

  const saveProfile = async () => {

    console.log('saveProfile', {name: formData.value.name, avatar: formData.value.avatarFile});

    if (!!formData.value.name) {
      if (await userStore.updateUser({name: formData.value.name, avatar: formData.value.avatarFile})) {
        add('Сохранено');
      }
    }

  }


  const selectAvatar = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    formData.value.avatarFile = null;
    avatarError.value = '';

    if (!file) {
      return;
    }

    try {
      const avatar = await prepareAvatar(file);
      formData.value.avatarFile = avatar;
      avatarName.value = `${avatar.name} · ${(avatar.size / 1024 / 1024).toFixed(1)} МБ`;
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      avatarPreviewUrl = URL.createObjectURL(avatar);
      avatarPreview.value = avatarPreviewUrl;
    } catch (error) {
      avatarError.value = error instanceof Error
        ? error.message
        : 'Не удалось обработать изображение';
    } finally {
      // Allow taking or selecting the same photo again.
      input.value = '';
    }
  }

  const userInitial = computed(() => userStore.getUserInitial(props.name));

  const submitDisabled = computed(() => {
    return (formData.value.name || '').length < MIN_USER_NAME_LENGTH
  });

  onBeforeUnmount(() => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
  });

</script>

<template>
  <v-form class="mb-8" @submit.prevent="saveProfile">

    <div class="d-flex justify-center mb-6">
      <v-avatar
        :key="avatarPreview"
        color="primary"
        size="112"
        aria-label="Аватар"
      >
        <v-img
          v-if="avatarPreview"
          :src="avatarPreview"
          cover
        ></v-img>
        <span v-else class="text-h3">{{ userInitial }}</span>

      </v-avatar>
    </div>

    <v-text-field
      v-model="formData.name"
      :rules="[
            value => value.trim().length > 0 || 'Поле обязательно',
            value => value.trim().length >= MIN_USER_NAME_LENGTH
              || `Минимум ${MIN_USER_NAME_LENGTH} символа`,
          ]"
      autocomplete="name"
      label="Имя"
      prepend-inner-icon="mdi-account-outline"
      validate-on="input"
      variant="outlined"
    ></v-text-field>

    <input
      ref="cameraInput"
      accept="image/*"
      capture="user"
      class="avatar-input"
      type="file"
      @change="selectAvatar"
    >
    <input
      ref="galleryInput"
      accept="image/*"
      class="avatar-input"
      type="file"
      @change="selectAvatar"
    >

    <div class="d-flex flex-wrap ga-2 mb-2">
      <v-btn
        prepend-icon="mdi-camera"
        variant="outlined"
        @click="cameraInput?.click()"
      >
        Сфотографировать
      </v-btn>
      <v-btn
        prepend-icon="mdi-image-outline"
        variant="outlined"
        @click="galleryInput?.click()"
      >
        Выбрать из галереи
      </v-btn>
    </div>
    <div v-if="avatarName" class="text-caption mb-2">{{ avatarName }}</div>
    <div v-if="avatarError" class="text-error text-caption mb-2">{{ avatarError }}</div>

    <div class="d-flex justify-end">
      <v-btn
        :disabled="submitDisabled"
        color="primary"
        type="submit"
        variant="outlined"
      >
        Сохранить
      </v-btn>
    </div>
  </v-form>

</template>

<style scoped>
  .avatar-input {
    display: none;
  }
</style>
