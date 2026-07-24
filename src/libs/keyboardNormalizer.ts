const englishLayout = "`QWERTYUIOP[]ASDFGHJKL;'ZXCVBNM,."
const russianLayout = 'ЁЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ'

const createLayoutMap = (source: string, target: string) => {
  return Object.fromEntries(
    Array.from(source, (letter, index) => [letter, target[index]])
  ) as Record<string, string>
}

const englishToRussian = createLayoutMap(englishLayout, russianLayout)
const russianToEnglish = createLayoutMap(russianLayout, englishLayout)

export const normalizeKeyboardInput = (value: string, expectedValue: string) => {
  const upperValue = value.toUpperCase()
  const layoutMap = /[А-ЯЁ]/i.test(expectedValue)
    ? englishToRussian
    : /[A-Z]/i.test(expectedValue)
      ? russianToEnglish
      : null

  if (!layoutMap) {
    return upperValue
  }

  return Array.from(upperValue, letter => layoutMap[letter] ?? letter).join('')
}
