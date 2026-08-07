<script setup lang="ts">
  import {MIN_USER_NAME_LENGTH, useUserStore} from "@/stores/userStore.ts";
  import {computed, ref} from "vue";
  import useMessages from '@/use/messages';

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

  const saveProfile = async () => {

    console.log('saveProfile', {name: formData.value.name, avatar: formData.value.avatarFile});

    if (!!formData.value.name) {
      if (await userStore.updateUser({name: formData.value.name, avatar: formData.value.avatarFile})) {
        add('Сохранено');
      }
    }

  }


  const selectAvatar = (value: File | File[] | null) => {
    const file = Array.isArray(value) ? value[0] : value;

    formData.value.avatarFile = file ?? null;
    avatarError.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      avatarError.value = 'Выберите изображение';
      formData.value.avatarFile = null;
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      avatarError.value = 'Размер изображения не должен превышать 10 МБ';
      formData.value.avatarFile = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      avatarPreview.value = typeof reader.result === 'string'
        ? reader.result
        : props.avatar ?? '';
    };

    reader.onerror = () => {
      avatarError.value = 'Не удалось прочитать изображение';
      formData.value.avatarFile = null;
    };

    reader.readAsDataURL(file);
  }

  const userInitial = computed(() => userStore.getUserInitial(props.name));

  const submitDisabled = computed(() => {
    return (formData.value.name || '').length < MIN_USER_NAME_LENGTH
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

    <v-file-input
      :error-messages="avatarError"
      :model-value="formData.avatarFile"
      accept="image/*"
      label="Нажмите для смены аватара"
      prepend-icon=""
      prepend-inner-icon="mdi-camera"
      show-size
      variant="outlined"
      @update:model-value="selectAvatar"
    ></v-file-input>

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

</style>
