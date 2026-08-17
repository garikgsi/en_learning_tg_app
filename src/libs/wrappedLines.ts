export const getWrappedLineEndIndexes = (
  lineOffsets: number[],
): number[] => {
  return lineOffsets.flatMap((offset, index) => {
    const nextOffset = lineOffsets[index + 1];

    return nextOffset !== undefined && nextOffset > offset
      ? [index]
      : [];
  });
};
