<script setup lang="ts">
  import {MIN_USER_NAME_LENGTH, useUserStore} from "@/stores/userStore.ts";
  import {computed, onBeforeUnmount, ref} from "vue";
  import useMessages from '@/use/messages';
  import {prepareAvatar} from '@/utils/prepareAvatar';
  import IAvatarPicker from '@/components/IAvatarPicker.vue';

  type Props = {
    name: string,
    avatar?: string
  }

  const props = defineProps<Props>();

  const userStore = useUserStore();

  const {add, addInfo, readMessage} = useMessages();

  const formData = ref<{name?: string, avatar?: string, avatarFile?: File|null}>({
    name: props.name,
    avatar: props.avatar,
    avatarFile: null
  });


  const avatarPreview = ref(props.avatar ?? '');
  const avatarError = ref('');
  const isPreparingAvatar = ref(false);
  let avatarPreviewUrl: string | null = null;

  const saveProfile = async () => {
    if (isPreparingAvatar.value) {
      avatarError.value = 'Подождите, фотография ещё обрабатывается';
      return;
    }

    if (!!formData.value.name) {
      if (await userStore.updateUser({name: formData.value.name, avatar: formData.value.avatarFile})) {
        add('Сохранено');
      }
    }

  }


  const selectAvatar = async (file: File) => {
    formData.value.avatarFile = null;
    avatarError.value = '';

    isPreparingAvatar.value = true;
    const processingMessage = addInfo('Идёт подготовка изображения…', 3);

    try {
      const avatar = await prepareAvatar(file);
      formData.value.avatarFile = avatar;
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
      isPreparingAvatar.value = false;
      readMessage(processingMessage.id);
    }
  }

  const userInitial = computed(() => userStore.getUserInitial(props.name));

  const submitDisabled = computed(() => {
    return isPreparingAvatar.value
      || (formData.value.name || '').length < MIN_USER_NAME_LENGTH
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
      <IAvatarPicker
        :initial="userInitial"
        :processing="isPreparingAvatar"
        :src="avatarPreview"
        @select="selectAvatar"
      ></IAvatarPicker>
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
