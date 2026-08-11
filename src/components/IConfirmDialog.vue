<script setup lang="ts">
type Props = {
  title: string
  text: string
  yesButtonText: string
  noButtonText: string
}

defineProps<Props>();

type Emits = {
  (event: 'yes'): void
  (event: 'no'): void
}

const emits = defineEmits<Emits>();
const model = defineModel<boolean>({default: false});

const answerYes = (): void => {
  model.value = false;
  emits('yes');
}

const answerNo = (): void => {
  model.value = false;
  emits('no');
}
</script>

<template>
  <v-dialog
    v-model="model"
    max-width="500"
    persistent
    scrollable
  >
    <v-card>
      <v-card-title>{{ title }}</v-card-title>

      <v-divider></v-divider>

      <v-card-text class="confirm-dialog__text">
        {{ text }}
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn
          color="primary"
          @click="answerYes"
        >
          {{ yesButtonText }}
        </v-btn>

        <v-btn
          color="secondary"
          @click="answerNo"
        >
          {{ noButtonText }}
        </v-btn>

      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.confirm-dialog__text {
  max-height: 300px;
  padding-top: 24px;
}
</style>
