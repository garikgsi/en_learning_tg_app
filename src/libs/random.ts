export default function random(from: number, to: number, exclude?: number): number {

  const getRange = (from: number, to: number, exclude?: number): { from: number, to: number } => {

    if (exclude) {
      if (exclude > to || exclude < from) {
        return {from: from, to: to}
      }

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

  const rand = Math.floor(Math.random() * (finish - start)) + start;

  const isOk = rand >= from && rand <= to && rand !== exclude;

  console.log(`random ${from}, ${to}, ${exclude} = ${rand}`, isOk);

  return rand;
}
