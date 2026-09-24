<script setup lang="ts">
import {GrammarRaceGame} from '../grammar-race';
import {toBeRace} from './toBeRace';
</script>

<template>
  <GrammarRaceGame
    game-code="to_be"
    :game="toBeRace"
  ></GrammarRaceGame>
</template>
