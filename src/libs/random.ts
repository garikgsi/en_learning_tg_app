export default function random(from: number, to: number, exclude?: number): number {

  const getRange = (from: number, to: number, exclude?: number): { from: number, to: number } => {

    if (exclude) {
      if (exclude === from) {
        return {from: exclude + 1, to: to}
      }

      if (exclude === to) {
        return {from: from, to: to - 1}
      }

      if (random(0, 1)) {
        return {from: from, to: exclude - 1}
      }

      return {from: exclude + 1, to: to}
    }

    return {from, to};
  }

  const {from: start, to: finish} = getRange(from, to, exclude);

  return Math.floor(Math.random() * (finish - start + 1)) + start;
}
