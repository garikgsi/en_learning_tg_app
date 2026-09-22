<script setup lang="ts">
import {GrammarRaceGame} from '../grammar-race';
import {pronounRace} from './pronounRace';
</script>

<template>
  <GrammarRaceGame
    game-code="personal_pronouns"
    :game="pronounRace"
  ></GrammarRaceGame>
</template>
