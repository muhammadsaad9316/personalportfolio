/**
 * Hero content data.
 *
 * The developer side types this out live, so the code has to be described as
 * tokens rather than JSX — the typewriter needs a character count per span.
 */

export type TokenKind = "kw" | "var" | "key" | "str" | "fn" | "punc";

export type Token = { t: string; k?: TokenKind };

export type CodeLine = {
  /** Rendered gutter number. Empty string draws an unnumbered line. */
  no: string;
  /** Indent steps, one step = one nesting level. */
  indent?: number;
  tokens: Token[];
};

export const CODE_LINES: CodeLine[] = [
  {
    no: "01",
    tokens: [
      { t: "const", k: "kw" },
      { t: " " },
      { t: "saad", k: "var" },
      { t: " = {", k: "punc" },
    ],
  },
  {
    no: "02",
    indent: 1,
    tokens: [
      { t: "role", k: "key" },
      { t: ": [", k: "punc" },
      { t: '"Designer"', k: "str" },
      { t: ", ", k: "punc" },
      { t: '"Developer"', k: "str" },
      { t: "],", k: "punc" },
    ],
  },
  {
    no: "03",
    indent: 1,
    tokens: [
      { t: "passion", k: "key" },
      { t: ": ", k: "punc" },
      { t: '"Building digital products"', k: "str" },
      { t: ",", k: "punc" },
    ],
  },
  {
    no: "04",
    indent: 1,
    tokens: [
      { t: "skills", k: "key" },
      { t: ": [", k: "punc" },
      { t: '"UI/UX"', k: "str" },
      { t: ", ", k: "punc" },
      { t: '"React"', k: "str" },
      { t: ", ", k: "punc" },
      { t: '"Next.js"', k: "str" },
      { t: ", ", k: "punc" },
      { t: '"Node.js"', k: "str" },
      { t: "],", k: "punc" },
    ],
  },
  {
    no: "05",
    indent: 1,
    tokens: [
      { t: "craft", k: "key" },
      { t: ": ", k: "punc" },
      { t: '"Clean code. Thoughtful design."', k: "str" },
    ],
  },
  { no: "06", tokens: [{ t: "};", k: "punc" }] },
  { no: "07", tokens: [] },
  {
    no: "08",
    tokens: [
      { t: "createImpact", k: "fn" },
      { t: "(", k: "punc" },
      { t: "saad", k: "var" },
      { t: ")", k: "punc" },
    ],
  },
  {
    no: "09",
    indent: 1,
    tokens: [
      { t: ".", k: "punc" },
      { t: "design", k: "fn" },
      { t: "().", k: "punc" },
      { t: "develop", k: "fn" },
      { t: "().", k: "punc" },
      { t: "deploy", k: "fn" },
      { t: "();", k: "punc" },
    ],
  },
];

/** Dashboard chart. Values are 0–1 and drive both the curve and the delta. */
export const CHART_SERIES: { values: number[]; delta: number }[] = [
  { values: [0.18, 0.22, 0.2, 0.34, 0.52, 0.62, 0.78], delta: 24.5 },
  { values: [0.24, 0.31, 0.44, 0.4, 0.58, 0.72, 0.88], delta: 31.2 },
  { values: [0.14, 0.19, 0.28, 0.47, 0.44, 0.66, 0.71], delta: 18.7 },
];

/** Type specimen card. */
export const TYPE_SPECS = [
  { label: "Inter Regular", weight: 400 },
  { label: "Inter Medium", weight: 500 },
  { label: "Inter SemiBold", weight: 600 },
  { label: "Inter Bold", weight: 700 },
];
