<script setup lang="ts">
import {GrammarRaceGame} from '../grammar-race';
import {possessivePronounRace} from './possessivePronounRace';
</script>

<template>
  <GrammarRaceGame
    game-code="possessive_pronouns"
    :game="possessivePronounRace"
  ></GrammarRaceGame>
</template>
