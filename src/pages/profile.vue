<script setup lang="ts">
import {computed, ref} from 'vue';
import {storeToRefs} from 'pinia';
import {useRouter} from 'vue-router';
import IPinCodeInput from '@/components/IPinCodeInput.vue';
import {
  PIN_CODE_LENGTH,
  useUserStore,
} from '@/stores/userStore';
import IProfileForm from "@/components/IProfileForm.vue";

const userStore = useUserStore();
const router = useRouter();
const {user} = storeToRefs(userStore);

const name = ref(user.value?.name ?? '');
const currentPin = ref('');
const pinCode = ref('');
const pinCodeConfirmation = ref('');
const isPinCodeEditorOpen = ref(false);
const successMessage = ref('');

const isPinCodeValid = computed(() => {
  return new RegExp(`^\\d{${PIN_CODE_LENGTH}}$`).test(pinCode.value);
});

const isPinCodeConfirmed = computed(() => {
  return isPinCodeValid.value
    && pinCodeConfirmation.value === pinCode.value;
});

const savePinCode = async () => {
  successMessage.value = '';

  const isUpdated = await userStore.updatePinCode({
    currentPin: currentPin.value,
    pinCode: pinCode.value,
    pinCodeConfirmation: pinCodeConfirmation.value,
  });

  if (isUpdated) {
    currentPin.value = '';
    pinCode.value = '';
    pinCodeConfirmation.value = '';
    await router.replace('/login');
    successMessage.value = 'ПИН-код изменён';
  }
}

const closePinCodeEditor = () => {
  currentPin.value = '';
  pinCode.value = '';
  pinCodeConfirmation.value = '';
  isPinCodeEditorOpen.value = false;
}

const logout = async () => {
  await userStore.logout();
  await router.replace('/login');
}

</script>

<template>
  <v-card class="mx-auto" max-width="720">
    <v-card-title>{{name}}</v-card-title>
    <v-card-subtitle>{{ user?.phone }}</v-card-subtitle>

    <v-card-text>

      <IProfileForm v-if="user" :name="user.name" :avatar="user.avatar"></IProfileForm>

      <div v-if="!isPinCodeEditorOpen" class="d-flex justify-end">
        <v-btn
          color="primary"
          variant="plain"
          :ripple="false"
          prepend-icon="mdi-lock-reset"
          @click="isPinCodeEditorOpen = true"
        >
          Изменить ПИН-код
        </v-btn>
      </div>

      <v-expand-transition>
        <v-form
          v-if="isPinCodeEditorOpen"
          @submit.prevent="savePinCode"
        >

          <IPinCodeInput
            v-model="currentPin"
            label="Текущий ПИН-код"
            autofocus
            class="mb-6"
          ></IPinCodeInput>

          <IPinCodeInput
            v-model="pinCode"
            label="Новый ПИН-код"
          ></IPinCodeInput>

          <IPinCodeInput
            v-model="pinCodeConfirmation"
            label="ПИН-код ещё раз"
          ></IPinCodeInput>

          <v-alert
            v-if="pinCodeConfirmation.length === PIN_CODE_LENGTH && !isPinCodeConfirmed"
            class="mb-4"
            density="compact"
            type="error"
            variant="tonal"
          >
            ПИН-коды не совпадают
          </v-alert>

          <div class="d-flex justify-end ga-3">
            <v-btn
              @click="closePinCodeEditor"
              color="secondary"
              variant="tonal"
            >
              Оставить старый пин-код
            </v-btn>

            <v-btn
              :disabled="currentPin.length !== PIN_CODE_LENGTH || !isPinCodeConfirmed"
              color="primary"
              type="submit"
              variant="elevated"
            >
              Сохранить ПИН-код
            </v-btn>
          </div>
        </v-form>
      </v-expand-transition>

      <v-divider class="my-8"></v-divider>

      <div class="d-flex justify-end">
        <v-btn
          color="secondary"
          variant="plain"
          prepend-icon="mdi-logout"
          @click="logout"
        >
          Выйти
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>
