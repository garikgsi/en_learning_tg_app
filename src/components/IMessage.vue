<script setup lang="ts">
  import useMessages from "@/use/messages";
  import {computed, onBeforeUnmount, ref, watch} from "vue";
  const {hasMessage, last:message, readMessage} = useMessages();


  const timeout = computed(() => (message.value?.timeout || 0) * 1000);

  const withTimer = computed(() => timeout.value > 0)

  const timer = ref(0);

  const timerBuff = computed(() => timeout.value / 100);
  const closeMsg = (id: number) => readMessage(id);

  const timerInterval = ref();

  watch(timeout, (value) => {

    clearInterval(timerInterval.value);

    timer.value = 0;

    if (value <= 0) {
      timerInterval.value = undefined;
      return;
    }

    timerInterval.value = setInterval(() => {

      let newTimer = timer.value + timerBuff.value;

      if (newTimer > value) {
        newTimer = timeout.value;
      }

      if (newTimer === value) {
        if (message.value?.id) {
          closeMsg(message.value.id)
        }
      }

      timer.value = newTimer;

      }, timerBuff.value
    );

  });

  onBeforeUnmount(() => {
    clearInterval(timerInterval.value);
  });



</script>

<template>
  <!-- i-message -->
  <div class="appMessage">
    <v-alert
      v-if="hasMessage && message"
      closable
      :type="message.type"
      :rounded="false"
      @click:close="closeMsg(message.id)"
    >

      {{ message.text }}

    </v-alert>

    <v-progress-linear
      v-if="withTimer && message"
      v-model="timer"
      :max="timeout"
      :color="message.type"
    ></v-progress-linear>

  </div>


  <!-- i-message end -->
</template>

<style>
  .appMessage {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10000;
    width: 100%;
  }
</style>
