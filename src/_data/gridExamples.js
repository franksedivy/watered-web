function createExamples(mode, columns, mixedRows) {
  const spans = Array.from(
    { length: columns },
    (_, index) => index + 1
  );

  return {
    mode,
    columns,
    classPrefix: mode === "desktop" ? "desktop-col-" : "col-",
    sections: [
      {
        title: "Every span",
        rows: spans.map((span) => [span]),
      },
      {
        title: "Equal divisions",
        rows: spans
          .filter((span) => columns % span === 0)
          .map((span) => Array(columns / span).fill(span)),
      },
      {
        title: "Unequal pairs",
        rows: spans
          .filter((span) => span < columns && span !== columns / 2)
          .map((span) => [span, columns - span]),
      },
      {
        title: "Mixed compositions",
        rows: mixedRows,
      },
    ],
  };
}

export default [
  createExamples("mobile", 4, [
    [1, 2, 1],
    [1, 1, 2],
  ]),
  createExamples("desktop", 12, [
    [3, 6, 3],
    [2, 7, 3],
    [6, 3, 3],
  ]),
];