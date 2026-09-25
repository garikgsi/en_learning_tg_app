<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {Capacitor, type PluginListenerHandle} from '@capacitor/core';
import {Haptics} from '@capacitor/haptics';
import {Motion} from '@capacitor/motion';
import {httpDachshundGameDriver} from '@/api/http/dachshundGame';
import beanstalkPlatformLeft from '@/assets/games/dachshund/beanstalk/beanstalk-platform-left.png';
import beanstalkPlatformLeftVariant from '@/assets/games/dachshund/beanstalk/beanstalk-platform-left-variant.png';
import beanstalkPlatformLeftVariant2 from '@/assets/games/dachshund/beanstalk/beanstalk-platform-left-variant-2.png';
import beanstalkPlatformRight from '@/assets/games/dachshund/beanstalk/beanstalk-platform-right.png';
import beanstalkPlatformRightVariant from '@/assets/games/dachshund/beanstalk/beanstalk-platform-right-variant.png';
import beanstalkPlatformRightVariant2 from '@/assets/games/dachshund/beanstalk/beanstalk-platform-right-variant-2.png';
import beanstalkStartLeaf from '@/assets/games/dachshund/beanstalk/beanstalk-start-leaf.png';
import beanstalkTrunkSegment from '@/assets/games/dachshund/beanstalk/beanstalk-trunk-segment.png';
import dachshundJump from '@/assets/games/dachshund/dachshund-jump.png';
import dachshundSad from '@/assets/games/dachshund/dachshund-sad.png';
import dachshundSitting from '@/assets/games/dachshund/dachshund-sitting.png';
import dachshundSpriteSheet from '@/assets/games/dachshund/dachshund-sprite-sheet.png';
import dogBoneGoal from '@/assets/games/dachshund/dog-bone-goal.png';

type ChoiceLane = 'left' | 'right';
type Lane = ChoiceLane | 'center';
type LeafVariant = 0 | 1 | 2;

type GameStatus = 'playing' | 'over' | 'level-transition';
type GameOverReason = 'missed' | 'wrong' | null;
type ControlMode = 'buttons' | 'tilt';
type EnvironmentId = 'forest' | 'troposphere' | 'stratosphere' | 'mesosphere' | 'thermosphere' | 'exosphere' | 'space';

type EnvironmentDefinition = {
  id: EnvironmentId
  title: string
  icon: string
};

type Fork = {
  id: number
  y: number
  targetIndex: number
  targetLetter: string
  distractorLetter: string
  correctLane: ChoiceLane
  leftLetter: string
  rightLetter: string
  visualVariant: LeafVariant
  collectedLane?: ChoiceLane
};

type JumpState = {
  startedAt: number
  fromWorldY: number
  toWorldY: number
  nextLane: ChoiceLane
  targetFork: Fork
  correct: boolean
  collected: boolean
};

type TrunkLayer = {
  y: number
  shift: number
  rotate: number
  mirrored: boolean
};

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const wrongAnswerVibrationDurationMs = 180;
const fallVibrationDurationMs = 700;
const personalBestStorageKey = 'dachshund-game-personal-best';
const audioCachePrefix = 'dachshund-letter-audio';
const environments: EnvironmentDefinition[] = [
  {id: 'forest', title: 'Лес', icon: 'mdi-tree'},
  {id: 'troposphere', title: 'Тропосфера', icon: 'mdi-cloud'},
  {id: 'stratosphere', title: 'Стратосфера', icon: 'mdi-weather-sunset-up'},
  {id: 'mesosphere', title: 'Мезосфера', icon: 'mdi-meteor'},
  {id: 'thermosphere', title: 'Термосфера', icon: 'mdi-aurora'},
  {id: 'exosphere', title: 'Экзосфера', icon: 'mdi-satellite-variant'},
  {id: 'space', title: 'Космос', icon: 'mdi-star-four-points'},
];
const vowels = new Set(['A', 'E', 'I', 'O', 'U']);
const leftLeafAssets = [
  beanstalkPlatformLeft,
  beanstalkPlatformLeftVariant,
  beanstalkPlatformLeftVariant2,
] as const;
const rightLeafAssets = [
  beanstalkPlatformRight,
  beanstalkPlatformRightVariant,
  beanstalkPlatformRightVariant2,
] as const;
const lane = ref<Lane>('center');
const facing = ref<ChoiceLane>('right');
const score = ref(0);
const scoreGain = ref(0);
const scorePulseKey = ref(0);
const personalBest = ref(0);
const globalBest = ref(0);
const recordsLoaded = ref(false);
const isNewPersonalBest = ref(false);
const isNewGlobalBest = ref(false);
const isAudioReady = ref(false);
const currentLevel = ref(1);
const levelCountdown = ref(0);
const currentIndex = ref(-1);
const forks = ref<Fork[]>([]);
const pastForks = ref<Fork[]>([]);
const isJumping = ref(false);
const isFalling = ref(false);
const gameStatus = ref<GameStatus>('playing');
const gameOverReason = ref<GameOverReason>(null);
const worldOffset = ref(0);
const hasReturnedToNeutral = ref(false);
const hasRoundStarted = ref(false);
const tiltGamma = ref(0);
const controlMode = ref<ControlMode>('buttons');
const landingForkId = ref<number | null>(null);
let animationFrame: number | undefined;
let landingAnimationTimer: number | undefined;
let levelTransitionTimer: number | undefined;
let previousFrameTime: number | undefined;
let forkSequence = 0;
let jumpState: JumpState | undefined;
let motionListener: PluginListenerHandle | undefined;
let activeLetterAudio: HTMLAudioElement | undefined;
let audioDatabasePromise: Promise<IDBDatabase | undefined> | undefined;
const letterAudio = new Map<string, HTMLAudioElement>();

const visibleForkCount = 4;
const neutralAngle = 7;
const jumpAngle = 18;
const initialLeafY = 14;
const initialDogStandOffset = 30;
const branchLeafSurfaceOffset = 48;
const branchLift: Record<ChoiceLane, number> = {left: -10, right: 16};
const forkSpacing = 118;
const firstForkY = initialLeafY + forkSpacing;
const baseScrollSpeed = 36;
const scrollSpeedStep = 6;
const jumpDurationMs = 760;
const jumpArcHeight = 82;
const dogPawOffset = 11;
const trunkLoopHeight = 1560;

const trunkLayers: TrunkLayer[] = Array.from({length: 9}, (_, index) => ({
  y: -60 + (index * 185),
  shift: [-7, 5, -4, 7, -5, 6, -6, 4, -3][index],
  rotate: [-1.5, 1.2, -0.8, 1.5, -1.1, 0.9, -1.3, 0.7, -0.6][index],
  mirrored: index % 2 === 1,
}));

const dogWorldY = ref(initialLeafY + initialDogStandOffset);
const currentLetter = computed(() => currentIndex.value >= 0 ? alphabet[currentIndex.value] : '');
const recentLetters = computed(() => {
  if (currentIndex.value < 0) {
    return [];
  }

  return alphabet.slice(Math.max(0, currentIndex.value - 3), currentIndex.value + 1);
});
const targetLetter = computed(() => forks.value[0]?.targetLetter ?? alphabet[0]);
const environmentIndex = computed(() => Math.min(
  currentLevel.value - 1,
  environments.length - 1,
));
const currentEnvironment = computed(() => environments[environmentIndex.value]);
const scoreMultiplier = computed(() => currentLevel.value);
const scorePointWord = computed(() => {
  const lastTwoDigits = scoreMultiplier.value % 100;
  const lastDigit = scoreMultiplier.value % 10;

  if (lastTwoDigits !== 11 && lastDigit === 1) {
    return 'очку';
  }

  if (![12, 13, 14].includes(lastTwoDigits) && lastDigit >= 2 && lastDigit <= 4) {
    return 'очка';
  }

  return 'очков';
});
const scrollSpeed = computed(() => (
  baseScrollSpeed + ((currentLevel.value - 1) * scrollSpeedStep)
));
const letterPlaybackRate = computed(() => Math.min(
  1.28,
  1 + ((currentLevel.value - 1) * 0.06),
));
const renderedForks = computed(() => [...pastForks.value, ...forks.value]);
const pathTransform = computed(() => `translateY(${Math.round(worldOffset.value)}px)`);
const trunkTransform = computed(() => `translateY(${Math.round(worldOffset.value % trunkLoopHeight)}px)`);
const dogScreenBottom = computed(() => dogWorldY.value - worldOffset.value);
const controlMessage = computed(() => {
  if (!isAudioReady.value && gameStatus.value === 'playing') {
    return 'Готовим звуки букв…';
  }

  if (gameStatus.value === 'level-transition') {
    return `Уровень ${currentLevel.value} начнётся через ${levelCountdown.value}`;
  }

  if (gameStatus.value === 'over') {
    return 'Игра окончена';
  }

  if (isJumping.value) {
    return 'Прыжок!';
  }

  if (controlMode.value === 'buttons') {
    return hasRoundStarted.value
      ? 'Нажмите стрелку для прыжка'
      : 'Выберите направление — игра начнётся';
  }

  if (!hasRoundStarted.value && hasReturnedToNeutral.value) {
    return 'Наклоните — первый прыжок начнёт игру';
  }

  return hasReturnedToNeutral.value
    ? 'Теперь наклоните в сторону'
    : 'Сначала держите телефон ровно';
});
const gameOverTitle = computed(() => {
  return gameOverReason.value === 'wrong' ? 'Не та буква!' : 'Альфа не успела!';
});

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function isVowel(letter: string) {
  return vowels.has(letter);
}

function platformAsset(side: ChoiceLane, variant: LeafVariant) {
  if (side === 'left') {
    return leftLeafAssets[variant];
  }

  const pairedVariant = ((variant + 1) % rightLeafAssets.length) as LeafVariant;
  return rightLeafAssets[pairedVariant];
}

function createFork(targetIndex: number, y: number, excludedLetters: Set<string>): Fork {
  const id = forkSequence++;
  const targetLetter = alphabet[targetIndex];
  const distractorPool = alphabet.filter(letter => !excludedLetters.has(letter) && letter !== targetLetter);
  const distractorLetter = randomItem(distractorPool);
  const correctLane: ChoiceLane = Math.random() < 0.5 ? 'left' : 'right';

  excludedLetters.add(targetLetter);
  excludedLetters.add(distractorLetter);

  return {
    id,
    y,
    targetIndex,
    targetLetter,
    distractorLetter,
    correctLane,
    leftLetter: correctLane === 'left' ? targetLetter : distractorLetter,
    rightLetter: correctLane === 'right' ? targetLetter : distractorLetter,
    visualVariant: (id % 3) as LeafVariant,
  };
}

function buildInitialForks(startY = firstForkY): Fork[] {
  const targetIndices = Array.from(
    {length: visibleForkCount},
    (_, index) => index % alphabet.length,
  );
  const protectedTargetCount = (visibleForkCount * 2) - 1;
  const excludedLetters = new Set(
    alphabet.slice(0, protectedTargetCount),
  );

  return targetIndices.map((targetIndex, index) => createFork(
    targetIndex,
    startY + (index * forkSpacing),
    excludedLetters,
  ));
}

function appendForkAfter(rows: Fork[], collectedIndex: number): Fork[] {
  const lastFork = rows[rows.length - 1];
  const nextTargetIndex = lastFork
    ? (lastFork.targetIndex + 1) % alphabet.length
    : (collectedIndex + 1) % alphabet.length;
  const nextY = lastFork ? lastFork.y + forkSpacing : dogWorldY.value + forkSpacing;
  const excludedLetters = new Set<string>();

  if (currentLetter.value) {
    excludedLetters.add(currentLetter.value);
  }

  rows.forEach((row) => {
    excludedLetters.add(row.leftLetter);
    excludedLetters.add(row.rightLetter);
  });

  alphabet
    .slice(nextTargetIndex, nextTargetIndex + visibleForkCount)
    .forEach(letter => excludedLetters.add(letter));

  return [...rows, createFork(nextTargetIndex, nextY, excludedLetters)];
}

async function loadRecords() {
  personalBest.value = Math.max(personalBest.value, readLocalPersonalBest());

  try {
    const records = await httpDachshundGameDriver.getRecords();
    personalBest.value = Math.max(personalBest.value, records.personalBest);
    globalBest.value = records.globalBest;
    recordsLoaded.value = true;
  } catch {
    recordsLoaded.value = false;
  }
}

async function saveResult(finalScore: number) {
  try {
    await httpDachshundGameDriver.saveResult(finalScore);
  } catch {
    // The game remains playable offline; the next start will load server records again.
  }
}

function registerFinishedGame() {
  isNewGlobalBest.value = recordsLoaded.value && score.value > globalBest.value;
  isNewPersonalBest.value = score.value > personalBest.value;

  personalBest.value = Math.max(personalBest.value, score.value);
  writeLocalPersonalBest(personalBest.value);

  if (recordsLoaded.value) {
    globalBest.value = Math.max(globalBest.value, score.value);
  }

  void saveResult(score.value);
}

function vibrateOnGameOver(reason: Exclude<GameOverReason, null>) {
  const duration = reason === 'wrong'
    ? wrongAnswerVibrationDurationMs
    : fallVibrationDurationMs;

  void Haptics.vibrate({duration}).catch(() => {
    navigator.vibrate?.(duration);
  });
}

function endGame(reason: Exclude<GameOverReason, null>) {
  if (gameStatus.value === 'over') {
    return;
  }

  gameStatus.value = 'over';
  gameOverReason.value = reason;
  isJumping.value = false;
  isFalling.value = true;
  hasReturnedToNeutral.value = false;
  vibrateOnGameOver(reason);
  registerFinishedGame();
}

function readLocalPersonalBest(): number {
  try {
    const value = Number.parseInt(localStorage.getItem(personalBestStorageKey) ?? '0', 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function writeLocalPersonalBest(value: number) {
  try {
    localStorage.setItem(personalBestStorageKey, String(value));
  } catch {
    // The server record remains authoritative when browser storage is unavailable.
  }
}

function announceLetterWithSystemVoice(letter: string) {
  if (!('speechSynthesis' in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(letter);
  utterance.lang = 'en-GB';
  utterance.rate = letterPlaybackRate.value;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function announceLetter(letter: string) {
  const audio = letterAudio.get(letter);

  if (!audio) {
    announceLetterWithSystemVoice(letter);
    return;
  }

  window.speechSynthesis?.cancel();
  activeLetterAudio?.pause();
  activeLetterAudio = audio;
  audio.currentTime = 0;
  audio.playbackRate = letterPlaybackRate.value;
  audio.preservesPitch = true;
  void audio.play().catch(() => announceLetterWithSystemVoice(letter));
}

function openAudioDatabase(): Promise<IDBDatabase | undefined> {
  if (audioDatabasePromise) {
    return audioDatabasePromise;
  }

  audioDatabasePromise = new Promise(resolve => {
    if (!('indexedDB' in window)) {
      resolve(undefined);
      return;
    }

    const request = indexedDB.open('dachshund-letter-audio', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('recordings')) {
        request.result.createObjectStore('recordings');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });

  return audioDatabasePromise;
}

async function readAudioBlobFromDatabase(key: string): Promise<Blob | undefined> {
  const database = await openAudioDatabase();

  if (!database) {
    return undefined;
  }

  return new Promise(resolve => {
    const request = database
      .transaction('recordings', 'readonly')
      .objectStore('recordings')
      .get(key);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : undefined);
    request.onerror = () => resolve(undefined);
  });
}

async function writeAudioBlobToDatabase(key: string, blob: Blob): Promise<void> {
  const database = await openAudioDatabase();

  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction('recordings', 'readwrite');
    transaction.objectStore('recordings').put(blob, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

async function preloadLetterAudio() {
  try {
    const manifest = await httpDachshundGameDriver.getAudioManifest();
    const cache = 'caches' in window
      ? await caches.open(`${audioCachePrefix}-${manifest.version}`)
      : undefined;

    await Promise.allSettled(Object.entries(manifest.letters).map(async ([letter, path]) => {
      const databaseKey = `${manifest.version}/${letter}`;
      const cacheKey = cache
        ? new Request(`${window.location.origin}/__dachshund_audio__/${manifest.version}/${letter}.mp3`)
        : undefined;
      const cachedResponse = cache && cacheKey ? await cache.match(cacheKey) : undefined;
      const databaseBlob = cachedResponse
        ? undefined
        : await readAudioBlobFromDatabase(databaseKey);
      const blob = cachedResponse
        ? await cachedResponse.blob()
        : (databaseBlob ?? await httpDachshundGameDriver.getLetterAudio(path));

      if (!cachedResponse && !databaseBlob) {
        if (cache && cacheKey) {
          await cache.put(cacheKey, new Response(blob, {
            headers: {'Content-Type': 'audio/mpeg'},
          }));
        } else {
          await writeAudioBlobToDatabase(databaseKey, blob);
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      audio.preload = 'auto';
      audio.load();
      letterAudio.set(letter, audio);
    }));
  } catch {
    // System speech remains available if the recorded audio pack cannot load.
  } finally {
    isAudioReady.value = true;
  }
}

function collectJumpLetter(activeJump: JumpState) {
  if (activeJump.collected || !activeJump.correct) {
    return;
  }

  activeJump.collected = true;
  activeJump.targetFork.collectedLane = activeJump.nextLane;
  announceLetter(activeJump.targetFork.targetLetter);
}

function prepareNextLevel() {
  const finalLevelLeaf = pastForks.value[pastForks.value.length - 1];
  const nextLevelFirstForkY = (finalLevelLeaf?.y ?? dogWorldY.value) + forkSpacing;

  currentIndex.value = -1;
  scoreGain.value = 0;
  forks.value = buildInitialForks(nextLevelFirstForkY);
  gameStatus.value = 'playing';
  gameOverReason.value = null;
  isJumping.value = false;
  isFalling.value = false;
  hasReturnedToNeutral.value = false;
  hasRoundStarted.value = true;
  landingForkId.value = null;
  levelCountdown.value = 0;
  jumpState = undefined;
  previousFrameTime = undefined;
}

function runLevelCountdown() {
  if (gameStatus.value !== 'level-transition') {
    return;
  }

  if (levelCountdown.value > 1) {
    levelCountdown.value -= 1;
    levelTransitionTimer = window.setTimeout(runLevelCountdown, 1000);
    return;
  }

  prepareNextLevel();
}

function completeAlphabet() {
  currentLevel.value += 1;
  gameStatus.value = 'level-transition';
  hasRoundStarted.value = true;
  levelCountdown.value = 3;
  previousFrameTime = undefined;
  window.clearTimeout(levelTransitionTimer);
  levelTransitionTimer = window.setTimeout(runLevelCountdown, 1000);
}

function finishSuccessfulJump(activeJump: JumpState) {
  const landedFork = activeJump.targetFork;
  const earnedPoints = scoreMultiplier.value;
  currentIndex.value = landedFork.targetIndex;
  dogWorldY.value = activeJump.toWorldY;
  score.value += earnedPoints;
  scoreGain.value = earnedPoints;
  scorePulseKey.value += 1;
  pastForks.value.push(landedFork);
  landingForkId.value = landedFork.id;

  window.clearTimeout(landingAnimationTimer);
  landingAnimationTimer = window.setTimeout(() => {
    landingForkId.value = null;
  }, 880);

  isJumping.value = false;

  if (landedFork.targetIndex === alphabet.length - 1) {
    forks.value = [];
    completeAlphabet();
    return;
  }

  const remainingForks = forks.value.slice(1);
  forks.value = appendForkAfter(remainingForks, landedFork.targetIndex);
}

function attemptJump(nextLane: ChoiceLane) {
  if (
    gameStatus.value !== 'playing'
    || !isAudioReady.value
    || isJumping.value
    || (controlMode.value === 'tilt' && !hasReturnedToNeutral.value)
  ) {
    return;
  }

  const nextFork = forks.value[0];
  hasReturnedToNeutral.value = false;
  hasRoundStarted.value = true;
  lane.value = nextLane;
  facing.value = nextLane;
  isJumping.value = true;
  jumpState = {
    startedAt: performance.now(),
    fromWorldY: dogWorldY.value,
    toWorldY: nextFork.y + branchLift[nextLane] + branchLeafSurfaceOffset,
    nextLane,
    targetFork: nextFork,
    correct: nextLane === nextFork.correctLane,
    collected: false,
  };
}

function handleTiltGamma(gamma: number | null) {
  if (gamma === null) {
    return;
  }

  controlMode.value = 'tilt';
  tiltGamma.value = gamma;

  if (gameStatus.value !== 'playing' || isJumping.value) {
    return;
  }

  if (Math.abs(gamma) <= neutralAngle) {
    hasReturnedToNeutral.value = true;
    return;
  }

  if (hasReturnedToNeutral.value && Math.abs(gamma) >= jumpAngle) {
    attemptJump(gamma < 0 ? 'left' : 'right');
  }
}

function handleWebOrientation(event: DeviceOrientationEvent) {
  handleTiltGamma(event.gamma);
}

async function setupMotionControl() {
  if (Capacitor.getPlatform() === 'android') {
    try {
      motionListener = await Motion.addListener('orientation', event => handleTiltGamma(event.gamma));
    } catch {
      controlMode.value = 'buttons';
    }
    return;
  }

  if (navigator.maxTouchPoints > 0) {
    window.addEventListener('deviceorientation', handleWebOrientation);
  }
}

function restartGame() {
  activeLetterAudio?.pause();
  window.speechSynthesis?.cancel();
  currentLevel.value = 1;
  currentIndex.value = -1;
  score.value = 0;
  scoreGain.value = 0;
  scorePulseKey.value = 0;
  isNewPersonalBest.value = false;
  isNewGlobalBest.value = false;
  lane.value = 'center';
  facing.value = 'right';
  forks.value = buildInitialForks();
  pastForks.value = [];
  worldOffset.value = 0;
  dogWorldY.value = initialLeafY + initialDogStandOffset;
  gameStatus.value = 'playing';
  gameOverReason.value = null;
  isJumping.value = false;
  isFalling.value = false;
  hasReturnedToNeutral.value = false;
  hasRoundStarted.value = false;
  landingForkId.value = null;
  levelCountdown.value = 0;
  window.clearTimeout(landingAnimationTimer);
  window.clearTimeout(levelTransitionTimer);
  jumpState = undefined;
  previousFrameTime = undefined;
}

function updateGame(timestamp: number) {
  if (gameStatus.value === 'playing' && hasRoundStarted.value) {
    if (previousFrameTime !== undefined) {
      const elapsed = Math.min(timestamp - previousFrameTime, 80);
      worldOffset.value += (elapsed / 1000) * scrollSpeed.value;
    }

    previousFrameTime = timestamp;

    if (jumpState) {
      const activeJump = jumpState;
      const progress = Math.min(1, (timestamp - activeJump.startedAt) / jumpDurationMs);
      const easedProgress = 1 - ((1 - progress) ** 3);
      const baseY = activeJump.fromWorldY
        + ((activeJump.toWorldY - activeJump.fromWorldY) * easedProgress);
      dogWorldY.value = baseY + (Math.sin(Math.PI * progress) * jumpArcHeight);

      if (progress >= 0.58) {
        collectJumpLetter(activeJump);
      }

      if (progress >= 1) {
        jumpState = undefined;

        if (activeJump.correct) {
          finishSuccessfulJump(activeJump);
        } else {
          endGame('wrong');
        }
      }
    } else if ((dogScreenBottom.value + dogPawOffset) <= 0) {
      endGame('missed');
    }

    if (pastForks.value[0] && (pastForks.value[0].y - worldOffset.value) < -260) {
      pastForks.value = pastForks.value.filter(row => (row.y - worldOffset.value) >= -260);
    }
  } else {
    previousFrameTime = undefined;
  }

  animationFrame = window.requestAnimationFrame(updateGame);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    attemptJump('left');
  }

  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    attemptJump('right');
  }
}

forks.value = buildInitialForks();

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  void setupMotionControl();
  void loadRecords();
  void preloadLetterAudio();

  animationFrame = window.requestAnimationFrame(updateGame);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('deviceorientation', handleWebOrientation);
  void motionListener?.remove();

  if (animationFrame !== undefined) {
    window.cancelAnimationFrame(animationFrame);
  }

  window.clearTimeout(landingAnimationTimer);
  window.clearTimeout(levelTransitionTimer);

  window.speechSynthesis?.cancel();
  activeLetterAudio?.pause();
  letterAudio.forEach(audio => URL.revokeObjectURL(audio.src));
  letterAudio.clear();
});
</script>

<template>
  <section class="beanstalk-prototype">
    <header class="prototype-heading">
      <div>
        <div class="text-overline text-primary">Прототип новой игры</div>
        <h1 class="text-h4 font-weight-black">Такса и алфавит</h1>
        <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
          Помоги таксе Альфе добраться по алфавиту до косточки.
        </p>
      </div>
      <v-chip color="success" prepend-icon="mdi-sprout" variant="tonal">
        Живой макет
      </v-chip>
    </header>

    <div class="game-shell">
      <div
        class="game-scene"
        :class="`game-scene--${currentEnvironment.id}`"
        role="application"
        aria-label="Прототип игры Такса и алфавит"
      >
        <div class="forest-light" aria-hidden="true"></div>
        <div class="clouds clouds--far" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <div class="clouds clouds--near" aria-hidden="true">
          <span></span><span></span>
        </div>
        <div class="distant-hills" aria-hidden="true"></div>
        <div
          class="ground-grass"
          :class="{'ground-grass--hidden': hasRoundStarted || currentLevel !== 1}"
          aria-hidden="true"
        >
          <i
            v-for="blade in 168"
            :key="`grass-${blade}`"
            :style="{
              animationDelay: `${(blade % 9) * 0.07}s`,
              height: `${20 + ((blade * 13) % 43)}px`,
              left: `${(blade * 47) % 101}%`,
              rotate: `${-13 + ((blade * 17) % 27)}deg`,
            }"
          ></i>
        </div>

        <div class="sparkles" aria-hidden="true">
          <i v-for="sparkle in 12" :key="sparkle"></i>
        </div>

        <div class="environment-effects" aria-hidden="true">
          <v-icon class="level-object level-object--plane" icon="mdi-airplane" size="34"></v-icon>
          <v-icon class="level-object level-object--balloon" icon="mdi-airballoon" size="38"></v-icon>
          <span class="ozone-band"></span>
          <div class="meteor-shower">
            <i
              v-for="meteor in 7"
              :key="`meteor-${meteor}`"
              :style="{
                animationDelay: `-${meteor * 0.38}s`,
                left: `${(meteor * 23) % 92}%`,
                top: `${8 + ((meteor * 17) % 58)}%`,
              }"
            ></i>
          </div>
          <div class="aurora-ribbons"><i></i><i></i><i></i></div>
          <v-icon class="level-object level-object--station" icon="mdi-space-station" size="42"></v-icon>
          <v-icon class="level-object level-object--satellite" icon="mdi-satellite-variant" size="40"></v-icon>
          <div class="space-stars">
            <i
              v-for="star in 18"
              :key="`star-${star}`"
              :style="{
                animationDelay: `-${star * 0.23}s`,
                left: `${(star * 37) % 96}%`,
                top: `${5 + ((star * 53) % 88)}%`,
              }"
            ></i>
          </div>
        </div>

        <div
          class="goal-bone"
          :class="{
            'goal-bone--rising': currentLevel === 1 && !hasRoundStarted,
          }"
          aria-hidden="true"
        >
          <img alt="" :src="dogBoneGoal">
        </div>

        <div class="game-hud">
          <div
            class="hud-card hud-card--level"
            :class="`hud-card--${currentEnvironment.id}`"
          >
            <v-icon :icon="currentEnvironment.icon" size="19"></v-icon>
            <span>
              <b>{{ currentEnvironment.title }} · {{ currentLevel }} уровень</b>
            </span>
          </div>
          <div class="hud-card hud-card--score">
            <strong>{{ score }}</strong>
            <span
              v-if="scorePulseKey && scoreGain > 0"
              :key="scorePulseKey"
              class="score-gain"
            >+{{ scoreGain }}</span>
          </div>
        </div>

        <div class="beanstalk-window" aria-hidden="true">
          <div
            class="beanstalk-track"
            :style="{
              height: `${trunkLoopHeight * 2}px`,
              top: `-${trunkLoopHeight}px`,
              transform: trunkTransform,
            }"
          >
            <div
              v-for="copyIndex in 2"
              :key="copyIndex"
              class="beanstalk-copy"
              :style="{
                height: `${trunkLoopHeight}px`,
                top: `${(copyIndex - 1) * trunkLoopHeight}px`,
              }"
            >
              <div class="vine-shadow"></div>
              <img
                v-for="(trunkLayer, layerIndex) in trunkLayers"
                :key="`trunk-layer-${layerIndex}`"
                alt=""
                class="trunk-layer"
                :src="beanstalkTrunkSegment"
                :style="{
                  bottom: `${trunkLayer.y}px`,
                  transform: `translateX(calc(-50% + ${trunkLayer.shift}px)) rotate(${trunkLayer.rotate}deg) scaleX(${trunkLayer.mirrored ? -1 : 1})`,
                }"
              >
            </div>
          </div>

          <div class="dynamic-path" :style="{transform: pathTransform}">
            <div class="start-platform" :style="{bottom: `${initialLeafY}px`}">
              <img alt="" :src="beanstalkStartLeaf">
            </div>

            <div
              v-for="fork in renderedForks"
              :key="fork.id"
              class="fork-row"
              :class="{
                'fork-row--next': fork.id === forks[0]?.id,
                'fork-row--past': Boolean(fork.collectedLane),
              }"
              :style="{bottom: `${fork.y}px`}"
            >
              <div
                class="asset-platform asset-platform--left"
                :class="[
                  `asset-platform--variant-${fork.visualVariant}`,
                  {'asset-platform--landed': landingForkId === fork.id && fork.collectedLane === 'left'},
                ]"
                :style="{'--leaf-breathe-delay': `${-0.6 - fork.id}s`}"
              >
                <img alt="" :src="platformAsset('left', fork.visualVariant)">
                <span
                  class="asset-platform__letter"
                  :class="{
                    'asset-platform__letter--vowel': isVowel(fork.leftLetter),
                    'asset-platform__letter--consonant': !isVowel(fork.leftLetter),
                    'asset-platform__letter--collected': fork.collectedLane === 'left',
                  }"
                >{{ fork.leftLetter }}</span>
              </div>
              <div
                class="asset-platform asset-platform--right"
                :class="[
                  `asset-platform--variant-${fork.visualVariant}`,
                  {'asset-platform--landed': landingForkId === fork.id && fork.collectedLane === 'right'},
                ]"
                :style="{'--leaf-breathe-delay': `${-1.4 - fork.id}s`}"
              >
                <img alt="" :src="platformAsset('right', fork.visualVariant)">
                <span
                  class="asset-platform__letter"
                  :class="{
                    'asset-platform__letter--vowel': isVowel(fork.rightLetter),
                    'asset-platform__letter--consonant': !isVowel(fork.rightLetter),
                    'asset-platform__letter--collected': fork.collectedLane === 'right',
                  }"
                >{{ fork.rightLetter }}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          class="dog-position"
          :class="[
            `dog-position--${lane}`,
            {
              'dog-position--jumping': isJumping,
              'dog-position--falling': isFalling,
            },
          ]"
          :style="{bottom: `min(${dogScreenBottom}px, calc(100% - var(--dog-size) - 10px))`}"
        >
          <div class="dog-visual" :class="{'dog-visual--left': facing === 'left'}">
            <div
              class="dachshund-sprite"
              :class="{
                'dachshund-sprite--sitting': !hasRoundStarted,
                'dachshund-sprite--jumping': isJumping,
              }"
              :style="{
                backgroundImage: `url(${!hasRoundStarted
                  ? dachshundSitting
                  : (isJumping ? dachshundJump : dachshundSpriteSheet)})`,
              }"
            ></div>
          </div>
          <span class="dog-shadow"></span>
        </div>

        <div class="scene-vignette" aria-hidden="true"></div>

        <div
          v-if="recentLetters.length && gameStatus !== 'over'"
          class="letter-progress"
          :aria-label="`Пройденные буквы: ${recentLetters.join(' ')}`"
        >
          <span
            v-for="letter in recentLetters"
            :key="`${currentLevel}-${letter}`"
            :class="{'letter-progress__active': letter === currentLetter}"
          >{{ letter }}</span>
        </div>

        <div
          v-if="controlMode === 'tilt' && gameStatus === 'playing'"
          class="tilt-status"
          :class="{
            'tilt-status--armed': hasReturnedToNeutral,
            'tilt-status--sensor': true,
          }"
        >
          <v-icon
            :icon="hasReturnedToNeutral ? 'mdi-phone-rotate-landscape' : 'mdi-cellphone'"
            size="19"
          ></v-icon>
          <span>{{ controlMessage }}</span>
        </div>

        <div v-if="controlMode === 'buttons' && gameStatus === 'playing'" class="game-controls">
          <v-btn
            aria-label="Прыгнуть влево"
            class="direction-button"
            color="success"
            :disabled="!isAudioReady || isJumping || gameStatus !== 'playing'"
            icon="mdi-arrow-left-bold"
            size="large"
            variant="flat"
            @click="attemptJump('left')"
          ></v-btn>
          <v-btn
            aria-label="Прыгнуть вправо"
            class="direction-button"
            color="success"
            :disabled="!isAudioReady || isJumping || gameStatus !== 'playing'"
            icon="mdi-arrow-right-bold"
            size="large"
            variant="flat"
            @click="attemptJump('right')"
          ></v-btn>
        </div>

        <div
          v-if="gameStatus === 'level-transition'"
          class="level-transition-panel"
          aria-live="assertive"
        >
          <v-icon color="success" icon="mdi-trophy-award" size="48"></v-icon>
          <h2>Отлично!</h2>
          <p>Ты перешел на <b>{{ currentLevel }}-й уровень.</b></p>
          <p>
            Теперь каждая правильная буква будет приносить
            <strong>по {{ scoreMultiplier }} {{ scorePointWord }}.</strong>
          </p>
          <p class="level-transition-panel__start">Начинай с буквы A!</p>
          <div :key="levelCountdown" class="level-countdown">
            {{ levelCountdown }}
          </div>
        </div>

        <div v-if="gameStatus === 'over'" class="game-over-panel">
          <img
            v-if="gameOverReason === 'missed'"
            alt="Грустная такса Альфа"
            class="game-over-panel__sad-dog"
            :src="dachshundSad"
          >
          <v-icon
            v-else
            icon="mdi-alpha-x-circle"
            size="46"
          ></v-icon>
          <h2>{{ gameOverTitle }}</h2>
          <p v-if="gameOverReason === 'wrong'">Нужна была буква {{ targetLetter }}</p>
          <strong>Счёт: {{ score }}</strong>
          <p v-if="isNewGlobalBest" class="record-message record-message--global">
            Твой рекорд лучший за всю историю игры среди всех пользователей!
          </p>
          <p v-else-if="isNewPersonalBest" class="record-message">
            Поздравляем! Это твой лучший результат за все игры!
          </p>
          <v-btn color="success" prepend-icon="mdi-replay" variant="flat" @click="restartGame">
            Ещё раз
          </v-btn>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.beanstalk-prototype {
  margin: 0 auto;
  max-width: 920px;
}

.prototype-heading {
  align-items: flex-start;
  display: flex;
  gap: 24px;
  justify-content: space-between;
  margin-bottom: 20px;
}

.game-shell {
  background: linear-gradient(145deg, #236248, #123d33);
  border-radius: 34px;
  box-shadow:
    0 26px 60px rgba(25, 63, 48, 0.24),
    0 8px 20px rgba(15, 44, 34, 0.18);
  padding: 7px;
}

.game-scene {
  background:
    radial-gradient(circle at 50% -12%, rgba(255, 225, 218, 0.94), transparent 34%),
    linear-gradient(180deg, #ecdafa 0%, #d9efe6 42%, #76bb8f 73%, #287451 100%);
  border: 2px solid rgba(255, 255, 255, 0.66);
  border-radius: 28px;
  height: min(780px, calc(100dvh - 190px));
  min-height: 600px;
  overflow: hidden;
  overflow: clip;
  position: relative;
  isolation: isolate;
  transition: background 700ms ease;
}

.game-scene--forest {
  background:
    radial-gradient(circle at 50% -12%, rgba(255, 225, 218, 0.94), transparent 34%),
    linear-gradient(180deg, #ecdafa 0%, #d9efe6 42%, #76bb8f 73%, #287451 100%);
}

.game-scene--troposphere {
  background: linear-gradient(180deg, #e8fbff 0%, #a9e7f5 42%, #61c4e1 72%, #318dbf 100%);
}

.game-scene--stratosphere {
  background: linear-gradient(180deg, #8fe9ff 0%, #37bce8 36%, #188dcc 69%, #0c65ad 100%);
}

.game-scene--mesosphere {
  background: linear-gradient(180deg, #276abe 0%, #16458e 42%, #0c2b6d 73%, #06194e 100%);
}

.game-scene--thermosphere {
  background: linear-gradient(180deg, #173b8e 0%, #152d72 38%, #0a1d54 70%, #050d32 100%);
}

.game-scene--exosphere {
  background: linear-gradient(180deg, #101f55 0%, #09163e 42%, #050d29 74%, #020719 100%);
}

.game-scene--space {
  background: radial-gradient(circle at 72% 16%, #182047 0%, #080c22 30%, #02040d 68%, #000 100%);
}

.game-scene:not(.game-scene--forest) .distant-hills {
  opacity: 0;
}

.game-scene:not(.game-scene--forest):not(.game-scene--troposphere) .clouds {
  opacity: 0;
}

.game-scene:not(.game-scene--forest) .sparkles {
  opacity: 0;
}

.forest-light {
  background:
    linear-gradient(72deg, transparent 18%, rgba(255, 255, 255, 0.28) 30%, transparent 43%),
    linear-gradient(108deg, transparent 50%, rgba(255, 226, 218, 0.23) 63%, transparent 76%);
  inset: 0;
  opacity: 0.74;
  position: absolute;
  z-index: -5;
}

.clouds {
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: -4;
}

.clouds span {
  background: rgba(255, 255, 255, 0.48);
  border-radius: 999px;
  filter: blur(0.3px);
  height: 26px;
  position: absolute;
  width: 94px;
}

.clouds span::before,
.clouds span::after {
  background: inherit;
  border-radius: 50%;
  content: '';
  position: absolute;
}

.clouds span::before {
  height: 44px;
  left: 17px;
  top: -22px;
  width: 44px;
}

.clouds span::after {
  height: 34px;
  right: 12px;
  top: -14px;
  width: 34px;
}

.clouds--far {
  animation: clouds-drift 28s linear infinite;
  opacity: 0.64;
}

.clouds--far span:nth-child(1) { left: 4%; top: 14%; }
.clouds--far span:nth-child(2) { left: 63%; top: 25%; transform: scale(0.72); }
.clouds--far span:nth-child(3) { left: 35%; top: 48%; transform: scale(0.48); }

.clouds--near {
  animation: clouds-drift 17s linear infinite reverse;
  opacity: 0.5;
}

.clouds--near span:nth-child(1) { left: -8%; top: 34%; transform: scale(1.12); }
.clouds--near span:nth-child(2) { left: 78%; top: 8%; transform: scale(0.84); }

.distant-hills {
  background:
    radial-gradient(ellipse at 10% 100%, #4f9871 0 24%, transparent 25%),
    radial-gradient(ellipse at 34% 100%, #579d75 0 30%, transparent 31%),
    radial-gradient(ellipse at 70% 100%, #478c68 0 28%, transparent 29%),
    radial-gradient(ellipse at 94% 100%, #397b5b 0 26%, transparent 27%);
  bottom: 0;
  height: 35%;
  left: 0;
  opacity: 0.78;
  position: absolute;
  right: 0;
  z-index: -3;
}

.ground-grass {
  background: radial-gradient(
    ellipse 138% 72% at 50% 126%,
    rgba(23, 102, 51, 0.96) 0 68%,
    rgba(40, 126, 61, 0.82) 69%,
    transparent 71%
  );
  bottom: -2px;
  height: 88px;
  left: -2%;
  opacity: 1;
  pointer-events: none;
  position: absolute;
  right: -2%;
  transition: opacity 600ms ease, transform 700ms ease;
  z-index: 2;
}

.ground-grass i {
  animation: grass-grow 1.15s cubic-bezier(0.18, 0.82, 0.28, 1.2) both;
  background: linear-gradient(90deg, #1e713d, #78b948 58%, #2a7d42);
  border-radius: 90% 15% 80% 12%;
  bottom: 10px;
  box-shadow: inset 1px 0 rgba(216, 240, 139, 0.24);
  position: absolute;
  transform-origin: bottom center;
  width: 6px;
}

.ground-grass i:nth-child(3n) {
  background: linear-gradient(90deg, #185d37, #5ea33f 62%, #276c3e);
  width: 5px;
}

.ground-grass i:nth-child(4n) {
  background: linear-gradient(90deg, #276f39, #90c653 58%, #347f3e);
  bottom: 7px;
  width: 4px;
}

.ground-grass i:nth-child(5n) {
  background: linear-gradient(90deg, #174f31, #70ad46 55%, #225f35);
  bottom: 4px;
  width: 5px;
}

.ground-grass--hidden {
  opacity: 0;
  transform: translateY(32px);
}

.sparkles {
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  position: absolute;
  z-index: 3;
}

.sparkles i {
  animation: sparkle-float 4.8s ease-in-out infinite;
  background: rgba(255, 238, 235, 0.94);
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(255, 218, 210, 0.88);
  height: 5px;
  left: calc(8% + (var(--sparkle-index, 1) * 7%));
  position: absolute;
  top: calc(9% + (var(--sparkle-index, 1) * 6%));
  width: 5px;
}

.sparkles i:nth-child(1) { left: 8%; top: 18%; }
.sparkles i:nth-child(2) { animation-delay: -1s; left: 19%; top: 42%; }
.sparkles i:nth-child(3) { animation-delay: -2.1s; left: 31%; top: 11%; }
.sparkles i:nth-child(4) { animation-delay: -0.5s; left: 43%; top: 53%; }
.sparkles i:nth-child(5) { animation-delay: -3.4s; left: 57%; top: 24%; }
.sparkles i:nth-child(6) { animation-delay: -1.7s; left: 72%; top: 46%; }
.sparkles i:nth-child(7) { animation-delay: -2.8s; left: 88%; top: 17%; }
.sparkles i:nth-child(8) { animation-delay: -0.7s; left: 13%; top: 66%; }
.sparkles i:nth-child(9) { animation-delay: -2.4s; left: 82%; top: 69%; }
.sparkles i:nth-child(10) { animation-delay: -3.8s; left: 66%; top: 83%; }
.sparkles i:nth-child(11) { animation-delay: -1.4s; left: 37%; top: 77%; }
.sparkles i:nth-child(12) { animation-delay: -3s; left: 93%; top: 54%; }

.environment-effects {
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  position: absolute;
  z-index: 0;
}

.level-object,
.meteor-shower,
.aurora-ribbons,
.ozone-band,
.space-stars {
  opacity: 0;
  position: absolute;
  transition: opacity 500ms ease;
}

.level-object {
  color: rgba(255, 255, 255, 0.82);
  filter: drop-shadow(0 5px 7px rgba(8, 47, 84, 0.24));
}

.level-object--plane {
  animation: plane-cross 9s linear infinite;
  left: -16%;
  top: 22%;
}

.game-scene--troposphere .level-object--plane,
.game-scene--stratosphere .level-object--balloon,
.game-scene--stratosphere .ozone-band,
.game-scene--mesosphere .meteor-shower,
.game-scene--thermosphere .aurora-ribbons,
.game-scene--thermosphere .level-object--station,
.game-scene--exosphere .level-object--satellite,
.game-scene--exosphere .space-stars,
.game-scene--space .space-stars {
  opacity: 1;
}

.level-object--balloon {
  animation: balloon-drift 7s ease-in-out infinite;
  color: rgba(255, 245, 180, 0.9);
  right: 11%;
  top: 19%;
}

.ozone-band {
  animation: ozone-pulse 4.6s ease-in-out infinite;
  background: linear-gradient(90deg, transparent, rgba(128, 255, 236, 0.58), transparent);
  filter: blur(5px);
  height: 18px;
  left: -10%;
  top: 38%;
  transform: rotate(-7deg);
  width: 120%;
}

.meteor-shower {
  inset: 0;
}

.meteor-shower i {
  animation: meteor-fall 2.8s linear infinite;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), #fff 72%, #ffd87b);
  border-radius: 999px;
  height: 3px;
  position: absolute;
  transform: rotate(-28deg);
  width: 72px;
}

.aurora-ribbons {
  inset: 7% -15% auto;
  height: 46%;
}

.aurora-ribbons i {
  animation: aurora-wave 6s ease-in-out infinite alternate;
  border: 13px solid rgba(87, 255, 196, 0.32);
  border-bottom-color: transparent;
  border-left-color: transparent;
  border-radius: 50%;
  filter: blur(7px);
  inset: 0;
  position: absolute;
  transform: rotate(-8deg);
}

.aurora-ribbons i:nth-child(2) {
  animation-delay: -2s;
  border-color: rgba(101, 168, 255, 0.26) transparent transparent rgba(101, 168, 255, 0.26);
  inset: 13% -5%;
}

.aurora-ribbons i:nth-child(3) {
  animation-delay: -4s;
  border-color: rgba(182, 112, 255, 0.22) rgba(182, 112, 255, 0.22) transparent transparent;
  inset: 27% 6%;
}

.level-object--station {
  animation: station-drift 10s ease-in-out infinite;
  right: 12%;
  top: 18%;
}

.level-object--satellite {
  animation: satellite-orbit 8s ease-in-out infinite;
  color: rgba(215, 231, 255, 0.88);
  left: 12%;
  top: 18%;
}

.space-stars {
  inset: 0;
}

.space-stars i {
  animation: star-twinkle 2.6s ease-in-out infinite;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(176, 210, 255, 0.82);
  height: 3px;
  position: absolute;
  width: 3px;
}

.goal-bone {
  animation: bone-hover 2.2s ease-in-out infinite alternate;
  filter: drop-shadow(0 7px 12px rgba(255, 196, 63, 0.42));
  left: 50%;
  pointer-events: none;
  position: absolute;
  top: -23px;
  transform: translateX(-50%);
  width: clamp(76px, 13vw, 98px);
  z-index: 19;
}

.goal-bone img {
  display: block;
  height: auto;
  width: 100%;
}

.goal-bone--rising {
  animation: bone-rise 2.8s cubic-bezier(0.2, 0.84, 0.3, 1) both;
}

.game-hud {
  align-items: flex-start;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  left: 14px;
  position: absolute;
  right: 14px;
  top: 14px;
  z-index: 20;
}

.hud-card {
  align-items: center;
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 16px;
  box-shadow: 0 7px 20px rgba(34, 77, 58, 0.14);
  color: #194b39;
  display: flex;
  font-weight: 800;
  gap: 8px;
  min-height: 46px;
  padding: 8px 13px;
}

.hud-card--level {
  max-width: calc(100% - 82px);
}

.hud-card--forest { color: #196642; }
.hud-card--troposphere { color: #11799f; }
.hud-card--stratosphere { color: #0965ad; }
.hud-card--mesosphere { color: #2452b5; }
.hud-card--thermosphere { color: #5146a8; }
.hud-card--exosphere { color: #46358e; }
.hud-card--space { color: #18224a; }

.hud-card--level span {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
}

.hud-card--level b {
  font-size: 13px;
  white-space: nowrap;
}

.hud-card--score {
  flex-direction: column;
  gap: 0;
  justify-content: center;
  min-width: 70px;
  padding-block: 5px;
  position: relative;
}

.hud-card--score strong {
  font-size: 22px;
  line-height: 1;
}

.score-gain {
  animation: score-gain-pop 820ms cubic-bezier(0.2, 0.82, 0.32, 1) forwards;
  color: #1a8a50;
  font-size: 19px;
  font-weight: 1000;
  right: calc(100% + 7px);
  pointer-events: none;
  position: absolute;
  text-shadow: 0 2px 0 #fff, 0 5px 12px rgba(18, 106, 63, 0.32);
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
}

.hud-caption {
  font-size: 10px;
  letter-spacing: 0.06em;
  opacity: 0.7;
  text-transform: uppercase;
}

.beanstalk-window {
  inset: 0;
  overflow: hidden;
  position: absolute;
  z-index: 1;
}

.beanstalk-track {
  left: 0;
  position: absolute;
  will-change: transform;
  width: 100%;
}

.beanstalk-copy {
  left: 0;
  position: absolute;
  width: 100%;
}

.vine-shadow {
  background: rgba(8, 42, 29, 0.24);
  border-radius: 50%;
  bottom: 18px;
  filter: blur(18px);
  left: 50%;
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  width: clamp(62px, 11.5vw, 95px);
}

.trunk-layer {
  filter: drop-shadow(0 10px 12px rgba(7, 42, 28, 0.28));
  height: auto;
  left: 50%;
  position: absolute;
  transform-origin: center;
  width: clamp(115px, 21vw, 158px);
  z-index: 3;
}

.dynamic-path {
  inset: 0;
  pointer-events: none;
  position: absolute;
  will-change: transform;
  z-index: 7;
}

.fork-row {
  height: 1px;
  left: 0;
  position: absolute;
  right: 0;
}

.start-platform {
  left: 50%;
  position: absolute;
  transform: translateX(-50%);
  width: min(58%, 300px);
  z-index: 8;
}

.start-platform img {
  display: block;
  filter: drop-shadow(0 14px 12px rgba(7, 48, 30, 0.28));
  height: auto;
  width: 100%;
}

.asset-platform {
  animation: leaf-breathe 4.8s ease-in-out infinite;
  animation-delay: var(--leaf-breathe-delay, 0s);
  position: absolute;
  width: clamp(190px, 32vw, 250px);
  will-change: filter, transform;
  z-index: 6;
}

.asset-platform--left {
  right: 50%;
  transform-origin: right 54%;
}

.asset-platform--right {
  left: 50%;
  transform-origin: left 54%;
}

.asset-platform--center {
  left: 50%;
  right: auto;
  transform: translateX(-35%) scale(0.94);
  transform-origin: 35% center;
}

.asset-platform--current {
  animation-duration: 4.1s;
  bottom: 0;
}

.fork-row .asset-platform--left {
  bottom: -10px;
}

.fork-row .asset-platform--right {
  bottom: 16px;
}

.fork-row--next .asset-platform {
  filter: saturate(1.06);
}

.asset-platform--landed.asset-platform--left {
  animation: leaf-land-left 820ms cubic-bezier(0.22, 0.86, 0.34, 1);
  animation-delay: 0s !important;
}

.asset-platform--landed.asset-platform--right {
  animation: leaf-land-right 820ms cubic-bezier(0.22, 0.86, 0.34, 1);
  animation-delay: 0s !important;
}

.asset-platform img {
  display: block;
  filter: drop-shadow(0 14px 12px rgba(7, 48, 30, 0.28));
  height: auto;
  pointer-events: none;
  width: 100%;
}

.asset-platform--variant-1 img {
  filter: brightness(0.97) saturate(1.08) drop-shadow(0 14px 12px rgba(7, 48, 30, 0.28));
}

.asset-platform--variant-2 img {
  filter: brightness(1.03) saturate(0.94) drop-shadow(0 14px 12px rgba(7, 48, 30, 0.28));
}

.asset-platform__letter {
  color: #3272c8;
  display: block;
  font-size: clamp(28px, 5.5vw, 42px);
  font-weight: 1000;
  line-height: 1;
  position: absolute;
  text-shadow:
    -3px -3px 0 rgba(255, 255, 255, 0.94),
    3px -3px 0 rgba(255, 255, 255, 0.94),
    -3px 3px 0 rgba(255, 255, 255, 0.94),
    3px 3px 0 rgba(255, 255, 255, 0.94),
    0 7px 12px rgba(31, 73, 129, 0.24);
  top: 2px;
  transform: translate(-50%, -86%);
  transition: opacity 180ms ease, transform 220ms ease, filter 180ms ease;
}

.asset-platform__letter--vowel {
  color: #d64161;
  text-shadow:
    -3px -3px 0 rgba(255, 255, 255, 0.94),
    3px -3px 0 rgba(255, 255, 255, 0.94),
    -3px 3px 0 rgba(255, 255, 255, 0.94),
    3px 3px 0 rgba(255, 255, 255, 0.94),
    0 7px 12px rgba(150, 37, 69, 0.24);
}

.asset-platform__letter--consonant {
  color: #3272c8;
}

.asset-platform--left .asset-platform__letter {
  left: 35%;
  transform: translate(-50%, -86%) rotate(-4deg);
}

.asset-platform--right .asset-platform__letter {
  left: 65%;
  transform: translate(-50%, -86%) rotate(4deg);
}

.asset-platform--center .asset-platform__letter {
  left: 35%;
  transform: translate(-50%, -86%);
}

.asset-platform__letter--collected {
  filter: blur(5px);
  opacity: 0;
  transform: translate(-50%, -122%) scale(0.42) !important;
}

.fork-row--past .asset-platform__letter {
  opacity: 0;
  transform: translate(-50%, -112%) scale(0.72);
}

.trunk-backbone {
  background:
    repeating-linear-gradient(100deg, transparent 0 24px, rgba(181, 226, 145, 0.09) 25px 28px, transparent 29px 48px),
    linear-gradient(90deg, #17492f, #4c9553 43%, #286d43 70%, #123f2d);
  border: 4px solid rgba(15, 63, 40, 0.58);
  border-radius: 46% 54% 42% 58% / 4% 5% 4% 5%;
  bottom: -30px;
  box-shadow: inset 15px 0 22px rgba(7, 41, 27, 0.38), inset -10px 0 16px rgba(7, 39, 26, 0.3);
  left: 50%;
  position: absolute;
  top: -30px;
  transform: translateX(-50%);
  width: clamp(86px, 16vw, 126px);
  z-index: 1;
}

.trunk-segment {
  background:
    radial-gradient(ellipse at 66% 16%, rgba(174, 240, 151, 0.3) 0 8%, transparent 9%),
    radial-gradient(ellipse at 24% 68%, rgba(18, 77, 48, 0.5) 0 11%, transparent 12%),
    repeating-linear-gradient(101deg, transparent 0 19px, rgba(159, 222, 128, 0.1) 20px 23px, transparent 24px 42px),
    linear-gradient(90deg, #174d35 0%, #2b7548 17%, #5aa85d 43%, #3d874c 66%, #123f2d 100%);
  border: 4px solid rgba(16, 65, 41, 0.72);
  border-radius: 43% 57% 38% 62% / 18% 24% 20% 16%;
  bottom: 0;
  box-shadow:
    inset 18px 0 24px rgba(6, 45, 29, 0.46),
    inset -13px 0 20px rgba(7, 39, 27, 0.38),
    inset 0 7px 9px rgba(197, 240, 165, 0.13),
    0 8px 13px rgba(12, 55, 37, 0.24);
  height: 272px;
  left: 50%;
  position: absolute;
  z-index: 4;
}

.trunk-segment--1 {
  border-radius: 58% 42% 61% 39% / 21% 17% 23% 18%;
}

.trunk-segment--2 {
  border-radius: 39% 61% 46% 54% / 16% 24% 18% 22%;
}

.trunk-segment::before,
.trunk-segment::after {
  border: 3px solid rgba(199, 239, 170, 0.16);
  border-bottom-color: transparent;
  border-left-color: transparent;
  border-radius: 50%;
  content: '';
  height: 82px;
  position: absolute;
  transform: rotate(18deg);
  width: 28px;
}

.trunk-segment::before { left: 20px; top: 58px; }
.trunk-segment::after { bottom: 28px; right: 17px; transform: rotate(199deg); }

.trunk-knot {
  background: radial-gradient(circle at 38% 33%, #6bb56a, #265f3e 58%, #123d2c 100%);
  border: 3px solid rgba(12, 59, 38, 0.72);
  border-radius: 50%;
  box-shadow: inset 0 0 0 5px rgba(155, 215, 133, 0.12);
  height: 27px;
  position: absolute;
  right: 15px;
  top: 91px;
  transform: rotate(-12deg);
  width: 38px;
}

.moss-patch {
  background:
    radial-gradient(circle at 12% 55%, #73ae52 0 10%, transparent 11%),
    radial-gradient(circle at 31% 35%, #79b556 0 14%, transparent 15%),
    radial-gradient(circle at 54% 60%, #4b8e43 0 16%, transparent 17%),
    radial-gradient(circle at 76% 34%, #6eaa4d 0 13%, transparent 14%);
  bottom: 44px;
  filter: drop-shadow(0 3px 2px rgba(9, 48, 30, 0.3));
  height: 31px;
  left: 19px;
  position: absolute;
  transform: rotate(-8deg);
  width: 72px;
}

.spiral-vine {
  border: 9px solid transparent;
  border-radius: 50%;
  height: 96px;
  left: 50%;
  position: absolute;
  width: clamp(144px, 24vw, 202px);
}

.spiral-vine--front {
  border-top-color: #66ad58;
  box-shadow: inset 0 7px 4px rgba(202, 239, 166, 0.2);
  filter: drop-shadow(0 7px 4px rgba(10, 52, 33, 0.32));
  z-index: 7;
}

.spiral-vine--back {
  border-bottom-color: #2c7645;
  filter: brightness(0.78);
  z-index: 2;
}

.branch {
  background: linear-gradient(180deg, #5daa5c, #276f45 64%, #154c35);
  border: 3px solid rgba(15, 71, 43, 0.6);
  border-radius: 58% 78% 58% 74%;
  box-shadow: inset 0 6px 6px rgba(192, 237, 158, 0.2), 0 6px 8px rgba(15, 57, 38, 0.23);
  height: clamp(23px, 3.8vw, 34px);
  position: absolute;
  width: var(--branch-reach);
  z-index: 3;
}

.branch--left {
  border-radius: 78% 58% 74% 58%;
  right: calc(50% - 24px);
  transform-origin: right center;
}

.branch--right {
  left: calc(50% - 24px);
  transform-origin: left center;
}

.branch-bud {
  background: linear-gradient(135deg, #83c86e, #2b7f4b);
  border: 2px solid rgba(18, 85, 49, 0.5);
  border-radius: 80% 15% 75% 25%;
  height: 33px;
  position: absolute;
  width: 20px;
}

.branch-bud--one { left: 38%; top: -23px; transform: rotate(-25deg); }
.branch-bud--two { left: 67%; top: 22px; transform: rotate(145deg); }
.branch--right .branch-bud--one { left: 47%; transform: rotate(28deg) scaleX(-1); }
.branch--right .branch-bud--two { left: 72%; transform: rotate(212deg) scaleX(-1); }

.leaf-platform {
  animation: leaf-breathe 4.6s ease-in-out infinite;
  background:
    radial-gradient(ellipse at 31% 17%, rgba(211, 243, 178, 0.48), transparent 25%),
    repeating-radial-gradient(ellipse at 50% 76%, transparent 0 17px, rgba(24, 92, 51, 0.08) 18px 20px),
    linear-gradient(155deg, #80c96a 0%, #49a956 38%, #226f45 74%, #124f37 100%);
  border: 4px solid #1a6541;
  box-shadow:
    inset 13px 12px 17px rgba(222, 246, 190, 0.18),
    inset -14px -17px 20px rgba(5, 57, 35, 0.28),
    0 15px 20px rgba(10, 55, 36, 0.28);
  height: clamp(90px, 15vw, 124px);
  position: absolute;
  width: clamp(162px, 35vw, 270px);
  z-index: 5;
}

.leaf-platform--left {
  border-radius: 92% 18% 74% 34% / 66% 24% 76% 38%;
  transform-origin: right center;
}

.leaf-platform--right {
  border-radius: 18% 92% 34% 74% / 24% 66% 38% 76%;
  transform-origin: left center;
}

.leaf-shine {
  background: rgba(223, 255, 229, 0.62);
  border-radius: 50%;
  filter: blur(1px);
  height: 10px;
  left: 24%;
  position: absolute;
  top: 18%;
  transform: rotate(-12deg);
  width: 32%;
}

.leaf-vein {
  background: rgba(22, 91, 51, 0.68);
  border-radius: 999px;
  height: 4px;
  left: 11%;
  position: absolute;
  top: 54%;
  transform: rotate(-5deg);
  width: 80%;
}

.leaf-platform--right .leaf-vein { transform: rotate(5deg); }

.leaf-vein::before,
.leaf-vein::after {
  border-bottom: 2px solid rgba(22, 91, 51, 0.52);
  content: '';
  height: 28px;
  position: absolute;
  top: -12px;
  width: 36%;
}

.leaf-vein::before { left: 18%; transform: rotate(30deg); }
.leaf-vein::after { right: 15%; transform: rotate(-30deg); }

.letter-token {
  align-items: center;
  background: linear-gradient(145deg, #fffaf7, #f6dfe9);
  border: 3px solid rgba(153, 47, 97, 0.55);
  border-radius: 50%;
  box-shadow: 0 6px 0 rgba(104, 38, 71, 0.2), 0 8px 14px rgba(24, 70, 48, 0.2);
  color: #a43568;
  display: flex;
  font-size: clamp(22px, 4.5vw, 34px);
  font-weight: 1000;
  height: clamp(46px, 7vw, 62px);
  justify-content: center;
  left: 50%;
  line-height: 1;
  position: absolute;
  top: 40%;
  transform: translate(-50%, -50%) rotate(4deg);
  width: clamp(46px, 7vw, 62px);
}

.leaf-platform--right .letter-token { transform: translate(-50%, -50%) rotate(-4deg); }

.bean-pod {
  background:
    radial-gradient(circle at 35% 35%, rgba(214, 242, 183, 0.62) 0 11%, transparent 12%),
    radial-gradient(circle at 58% 52%, rgba(214, 242, 183, 0.52) 0 12%, transparent 13%),
    linear-gradient(135deg, #75bd61, #286f45);
  border: 3px solid #185b3d;
  border-radius: 75% 25% 70% 30% / 35% 60% 40% 65%;
  box-shadow: inset -5px -6px 8px rgba(3, 65, 41, 0.27), 0 6px 10px rgba(13, 57, 39, 0.18);
  height: 38px;
  position: absolute;
  width: 78px;
  z-index: 6;
}

.bean-pod--left { left: 24%; transform: rotate(24deg); }
.bean-pod--right { right: 22%; transform: rotate(156deg); }

.tendril {
  border: 4px solid #168857;
  border-left-color: transparent;
  border-radius: 50%;
  height: 54px;
  position: absolute;
  width: 54px;
  z-index: 2;
}

.tendril::after {
  border: 3px solid #168857;
  border-bottom-color: transparent;
  border-radius: 50%;
  content: '';
  height: 27px;
  left: 8px;
  position: absolute;
  top: 9px;
  width: 27px;
}

.tendril--left { left: 31%; transform: rotate(-38deg); }
.tendril--right { right: 31%; transform: rotate(142deg); }

.dog-position {
  --dog-size: clamp(94px, 17vw, 136px);
  bottom: 120px;
  height: var(--dog-size);
  position: absolute;
  transition:
    left 620ms cubic-bezier(0.3, 1.45, 0.48, 1),
    filter 240ms ease;
  will-change: transform;
  width: var(--dog-size);
  z-index: 10;
}

.dog-position--left { left: 10%; }
.dog-position--center { left: calc(50% - (var(--dog-size) / 2)); }
.dog-position--right { left: calc(90% - var(--dog-size)); }

.dog-visual {
  height: 100%;
  position: relative;
  transform-origin: center bottom;
  transition: transform 160ms ease;
  width: 100%;
  z-index: 2;
}

.dog-visual--left {
  transform: scaleX(-1);
}

.dachshund-sprite {
  background-position: 0 0;
  background-repeat: no-repeat;
  background-size: 200% 300%;
  height: 100%;
  position: relative;
  width: 100%;
}

.dachshund-sprite--sitting {
  background-position: center bottom;
  background-size: 88% auto;
}

.dachshund-sprite--jumping {
  animation: dog-hop 760ms cubic-bezier(0.25, 0.74, 0.32, 1);
  background-position: center bottom;
  background-size: 92% auto;
}

.dog-shadow {
  background: rgba(8, 44, 30, 0.28);
  border-radius: 50%;
  bottom: 10px;
  filter: blur(5px);
  height: 17px;
  left: 18%;
  position: absolute;
  transition: opacity 220ms ease, transform 220ms ease;
  width: 66%;
  z-index: 1;
}

.dog-position--jumping .dog-shadow {
  opacity: 0.34;
  transform: scale(0.58);
}

.dog-position--falling {
  animation: dog-fall 900ms cubic-bezier(0.55, 0.02, 0.8, 0.34) forwards;
  pointer-events: none;
}

.scene-vignette {
  border-radius: 26px;
  box-shadow: inset 0 -90px 100px rgba(5, 47, 31, 0.28), inset 0 0 46px rgba(31, 74, 55, 0.12);
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 12;
}

.game-controls {
  align-items: center;
  bottom: 16px;
  display: flex;
  justify-content: space-between;
  left: 22px;
  position: absolute;
  right: 22px;
  z-index: 20;
}

.letter-progress {
  align-items: baseline;
  backdrop-filter: blur(9px);
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.88);
  border-radius: 999px;
  bottom: 23px;
  box-shadow: 0 6px 16px rgba(6, 48, 31, 0.2);
  color: #286549;
  display: flex;
  font-size: 14px;
  font-weight: 900;
  gap: 4px;
  height: 34px;
  justify-content: center;
  left: 50%;
  min-width: 104px;
  padding: 5px 13px;
  position: absolute;
  transform: translateX(-50%);
  z-index: 22;
}

.letter-progress span {
  line-height: 22px;
  opacity: 0.68;
  transition: color 180ms ease, font-size 180ms ease, opacity 180ms ease, transform 180ms ease;
}

.letter-progress .letter-progress__active {
  color: #df477b;
  font-size: 24px;
  opacity: 1;
  text-shadow: 0 2px 0 #fff, 0 4px 9px rgba(154, 42, 85, 0.22);
  transform: translateY(1px);
}

.direction-button {
  border: 3px solid rgba(255, 255, 255, 0.76);
  box-shadow: 0 8px 18px rgba(6, 48, 31, 0.28);
}

.tilt-status {
  align-items: center;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 999px;
  color: #24533f;
  display: flex;
  font-size: 12px;
  font-weight: 700;
  gap: 6px;
}

.tilt-status {
  bottom: 82px;
  box-shadow: 0 7px 18px rgba(6, 48, 31, 0.2);
  display: flex;
  left: 50%;
  max-width: calc(100% - 32px);
  padding: 8px 13px;
  position: absolute;
  text-align: center;
  transform: translateX(-50%);
  white-space: nowrap;
  z-index: 21;
}

.tilt-status--sensor {
  bottom: 20px;
}

.tilt-status--armed {
  background: rgba(224, 250, 230, 0.9);
  color: #17633e;
}

.game-over-panel,
.level-transition-panel {
  align-items: center;
  backdrop-filter: blur(16px);
  background: rgba(249, 244, 247, 0.93);
  border: 2px solid rgba(255, 255, 255, 0.88);
  border-radius: 26px;
  box-shadow: 0 22px 50px rgba(12, 48, 34, 0.34);
  color: #214c3b;
  display: flex;
  flex-direction: column;
  gap: 9px;
  left: 50%;
  padding: 24px;
  position: absolute;
  text-align: center;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(84%, 340px);
  z-index: 30;
}

.level-transition-panel {
  background:
    radial-gradient(circle at 50% 0, rgba(230, 255, 213, 0.98), transparent 44%),
    rgba(249, 252, 244, 0.95);
  border-color: rgba(238, 255, 222, 0.96);
  box-shadow:
    0 22px 50px rgba(12, 48, 34, 0.34),
    0 0 42px rgba(141, 219, 96, 0.22);
}

.level-transition-panel h2,
.level-transition-panel p,
.game-over-panel h2,
.game-over-panel p {
  margin: 0;
}

.level-transition-panel h2,
.game-over-panel h2 {
  font-size: 24px;
  font-weight: 900;
}

.level-transition-panel p,
.game-over-panel p {
  font-size: 14px;
  opacity: 0.8;
}

.game-over-panel .record-message {
  background: rgba(220, 249, 224, 0.82);
  border-radius: 14px;
  color: #17633e;
  font-weight: 850;
  opacity: 1;
  padding: 9px 11px;
}

.game-over-panel .record-message--global {
  background: linear-gradient(135deg, rgba(255, 246, 184, 0.94), rgba(222, 250, 207, 0.94));
  color: #5f5715;
}

.game-over-panel__sad-dog {
  display: block;
  filter: drop-shadow(0 8px 12px rgba(35, 62, 50, 0.18));
  height: 118px;
  margin: -18px auto -7px;
  object-fit: contain;
  width: 150px;
}

.level-transition-panel__start {
  color: #17633e;
  font-size: 16px !important;
  font-weight: 900;
  opacity: 1 !important;
}

.level-countdown {
  align-items: center;
  animation: level-countdown-pulse 1s ease-out both;
  background: linear-gradient(145deg, #55bb68, #278b51);
  border: 4px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  box-shadow: 0 8px 20px rgba(33, 117, 68, 0.28);
  color: #fff;
  display: flex;
  font-size: 31px;
  font-weight: 1000;
  height: 62px;
  justify-content: center;
  line-height: 1;
  margin-top: 3px;
  width: 62px;
}

@keyframes clouds-drift {
  from { transform: translateX(-7%); }
  to { transform: translateX(7%); }
}

@keyframes grass-grow {
  0% { opacity: 0; transform: scaleY(0) rotate(-5deg); }
  72% { opacity: 1; transform: scaleY(1.08) rotate(2deg); }
  100% { opacity: 1; transform: scaleY(1) rotate(0); }
}

@keyframes plane-cross {
  from { transform: translate(-20px, 18px) rotate(8deg); }
  to { transform: translate(calc(116vw + 40px), -24px) rotate(8deg); }
}

@keyframes balloon-drift {
  0%, 100% { transform: translate(0, 0) rotate(-3deg); }
  50% { transform: translate(-24px, -18px) rotate(4deg); }
}

@keyframes ozone-pulse {
  0%, 100% { opacity: 0.38; transform: rotate(-7deg) scaleY(0.75); }
  50% { opacity: 0.86; transform: rotate(-7deg) scaleY(1.15); }
}

@keyframes meteor-fall {
  0% { opacity: 0; translate: 90px -70px; }
  18% { opacity: 1; }
  100% { opacity: 0; translate: -170px 190px; }
}

@keyframes aurora-wave {
  from { opacity: 0.5; transform: rotate(-9deg) scaleY(0.86); }
  to { opacity: 0.92; transform: rotate(-4deg) scaleY(1.14); }
}

@keyframes station-drift {
  0%, 100% { transform: translate(0, 0) rotate(-8deg); }
  50% { transform: translate(-52px, 30px) rotate(7deg); }
}

@keyframes satellite-orbit {
  0%, 100% { transform: translate(0, 0) rotate(-12deg); }
  50% { transform: translate(128px, 44px) rotate(15deg); }
}

@keyframes star-twinkle {
  0%, 100% { opacity: 0.22; transform: scale(0.65); }
  50% { opacity: 1; transform: scale(1.45); }
}

@keyframes score-gain-pop {
  0% { opacity: 0; transform: translateY(-34%) scale(0.72); }
  24% { opacity: 1; transform: translateY(-56%) scale(1.18); }
  70% { opacity: 1; transform: translateY(-96%) scale(1); }
  100% { opacity: 0; transform: translateY(-132%) scale(0.92); }
}

@keyframes bone-rise {
  0% { opacity: 0; top: 68%; transform: translateX(-50%) scale(0.68) rotate(-9deg); }
  72% { opacity: 1; }
  100% { opacity: 1; top: -23px; transform: translateX(-50%) scale(1) rotate(0); }
}

@keyframes bone-hover {
  from { transform: translateX(-50%) translateY(0) rotate(-2deg); }
  to { transform: translateX(-50%) translateY(5px) rotate(2deg); }
}

@keyframes level-countdown-pulse {
  0% { opacity: 0; transform: scale(1.34); }
  18% { opacity: 1; transform: scale(0.92); }
  38% { transform: scale(1); }
  82% { opacity: 1; transform: scale(1); }
  100% { opacity: 0.52; transform: scale(0.82); }
}

@keyframes leaf-breathe {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.08); }
}

@keyframes leaf-land-left {
  0% { filter: brightness(1); transform: rotate(0); }
  28% { filter: brightness(1.1); transform: rotate(-3.35deg); }
  56% { filter: brightness(1.05); transform: rotate(1.68deg); }
  78% { transform: rotate(-0.72deg); }
  100% { filter: brightness(1); transform: rotate(0); }
}

@keyframes leaf-land-right {
  0% { filter: brightness(1); transform: rotate(0); }
  28% { filter: brightness(1.1); transform: rotate(3.35deg); }
  56% { filter: brightness(1.05); transform: rotate(-1.68deg); }
  78% { transform: rotate(0.72deg); }
  100% { filter: brightness(1); transform: rotate(0); }
}

@keyframes dog-hop {
  0% { transform: translateY(0) rotate(0); }
  38% { transform: translateY(-16px) rotate(-4deg) scale(1.04); }
  68% { transform: translateY(-8px) rotate(3deg) scale(1.02); }
  100% { transform: translateY(0) rotate(0); }
}

@keyframes dog-fall {
  0% { opacity: 1; transform: translateY(0) rotate(0); }
  34% { transform: translateY(-24px) rotate(-8deg); }
  100% { opacity: 0; transform: translateY(520px) rotate(68deg); }
}

@keyframes sparkle-float {
  0%, 100% { opacity: 0.18; transform: translateY(0) scale(0.7); }
  50% { opacity: 0.92; transform: translateY(-18px) scale(1.15); }
}

@media (max-width: 600px) {
  .prototype-heading {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .prototype-heading :deep(.v-chip) {
    align-self: flex-start;
  }

  .game-shell {
    border-radius: 25px;
    margin-inline: -8px;
    padding: 5px;
  }

  .game-scene {
    border-radius: 21px;
    height: calc(100dvh - 214px);
    min-height: 570px;
  }

  .game-hud {
    gap: 6px;
    left: 8px;
    right: 8px;
    top: 8px;
  }

  .hud-card {
    border-radius: 13px;
    min-height: 42px;
    padding: 6px 9px;
  }

  .hud-card--level span {
    min-width: 0;
  }

  .hud-card--level b {
    font-size: 11px;
  }

  .hud-card--score {
    min-width: 56px;
  }

  .dog-position {
    bottom: 113px;
  }

  .dog-position--left {
    left: 6%;
  }

  .dog-position--right {
    left: calc(94% - var(--dog-size));
  }

  .asset-platform {
    width: clamp(184px, 49vw, 205px);
  }

  .asset-platform--left {
    right: 49%;
  }

  .asset-platform--right {
    left: 49%;
  }

  .trunk-layer {
    width: clamp(115px, 31vw, 130px);
  }

  .tilt-status {
    bottom: 78px;
    font-size: 11px;
    padding: 7px 10px;
  }

  .game-controls {
    left: 18px;
    right: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .clouds,
  .leaf-platform,
  .sparkles i {
    animation-play-state: paused;
  }

  .dog-position,
  .dachshund-sprite {
    transition-duration: 1ms;
  }
}
</style>
