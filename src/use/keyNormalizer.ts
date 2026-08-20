export type KeyNormalizerLanguage = 'en' | 'ru';

const englishLayout = "`QWERTYUIOP[]ASDFGHJKL;'ZXCVBNM,.";
const russianLayout = 'ЁЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ';

const createLayoutMap = (source: string, target: string) => {
  return Object.fromEntries(
    Array.from(source, (letter, index) => [letter, target[index]]),
  ) as Record<string, string>;
}

const englishToRussian = createLayoutMap(englishLayout, russianLayout);
const russianToEnglish = createLayoutMap(russianLayout, englishLayout);

export const useKeyNormalizer = () => {
  const isAnswerLetterCorrect = (
    answerLetter: string,
    expectedLetter: string,
    language: KeyNormalizerLanguage,
  ): boolean => {
    const answer = answerLetter.toLowerCase();
    const expected = expectedLetter.toLowerCase();

    if (answer === expected) {
      return true;
    }

    return language === 'ru' && (
      (answer === 'е' && expected === 'ё')
      || (answer === 'ь' && expected === 'ъ')
    );
  }

  const normalizeLanguageText = (
    value: string,
    language: KeyNormalizerLanguage,
  ): string => {
    return language === 'ru'
      ? value.replace(/[^а-яё -]/giu, '')
      : value.replace(/[^a-z -]/giu, '');
  }

  const normalizeKeyboardInput = (value: string, expectedValue: string) => {
    const upperValue = value.toUpperCase();
    const layoutMap = /[А-ЯЁ]/i.test(expectedValue)
      ? englishToRussian
      : /[A-Z]/i.test(expectedValue)
        ? russianToEnglish
        : null;

    if (!layoutMap) {
      return upperValue;
    }

    return Array.from(
      upperValue,
      letter => layoutMap[letter] ?? letter,
    ).join('');
  }

  const normalizeAnswer = (
    value: string,
    expectedValue: string,
    language: KeyNormalizerLanguage,
  ): string => {
    const keyboardNormalized = normalizeKeyboardInput(
      value,
      expectedValue,
    );

    return normalizeLanguageText(keyboardNormalized, language);
  }

  return {
    isAnswerLetterCorrect,
    normalizeAnswer,
    normalizeKeyboardInput,
    normalizeLanguageText,
  };
}
