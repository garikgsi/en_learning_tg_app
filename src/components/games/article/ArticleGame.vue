<script setup lang="ts">
import {GrammarRaceGame} from '../grammar-race';
import {articleRace} from './articleRace';
</script>

<template>
  <GrammarRaceGame
    game-code="articles"
    :game="articleRace"
  ></GrammarRaceGame>
</template>
