import {
  parseBooleanValue,
  parseIntegerValue,
  toArrayValue,
  trimArrayValues,
  trimLowerCase,
  trimUpperCase,
  trimValue,
} from './transforms';

/* Os lambdas de referencia abaixo replicam o codigo antigo tal como era,
   inclusive o `any` implicito que motivou esta fase -- e por isso que as
   regras de tipo ficam desligadas neste arquivo, e so nele. */

/* eslint-disable @typescript-eslint/no-unsafe-return */

// Os lambdas exatamente como estavam escritos nos DTOs antes da extracao.
//
// O objetivo destes testes nao e cobrir os helpers em si, e provar que a
// extracao nao mudou a normalizacao. Nenhum DTO tem spec, entao uma divergencia
// entre helper e lambda passaria calada -- um campo comecaria a aceitar
// entrada que antes rejeitava, sem nada acusar.

const oldTrim = (v: any) => (typeof v === 'string' ? v.trim() : v);
const oldLower = (v: any) =>
  typeof v === 'string' ? v.trim().toLowerCase() : v;
const oldUpper = (v: any) =>
  typeof v === 'string' ? v.trim().toUpperCase() : v;
const oldInt = (v: any) => {
  if (v === undefined) return undefined;
  const parsed = Number.parseInt(String(v), 10);
  return Number.isNaN(parsed) ? v : parsed;
};
const oldBool = (v: any) => {
  if (v === undefined) return undefined;
  return v === true || v === 'true';
};
const oldArray = (v: any) => {
  if (v === undefined || v === null) return undefined;
  return Array.isArray(v) ? v : [v];
};
const oldArrayTrim = (v: any) =>
  Array.isArray(v)
    ? v.map((i: unknown) => (typeof i === 'string' ? i.trim() : i))
    : v;

const INPUTS: unknown[] = [
  '  texto  ',
  'JÁ Maiúsculo',
  '',
  '   ',
  'a',
  0,
  1,
  -1,
  42,
  3.9,
  '0',
  '2',
  '  7 ',
  '2abc',
  'abc',
  'NaN',
  'Infinity',
  true,
  false,
  'true',
  'false',
  undefined,
  null,
  {},
  [],
  ['  a  ', 'b', 1],
  [{}],
  new Date(0),
];

describe('transforms mantem o comportamento dos lambdas originais', () => {
  const cases: Array<[string, (v: unknown) => unknown, (v: any) => unknown]> = [
    ['trimValue', (v) => trimValue({ value: v }), oldTrim],
    ['trimLowerCase', (v) => trimLowerCase({ value: v }), oldLower],
    ['trimUpperCase', (v) => trimUpperCase({ value: v }), oldUpper],
    ['parseBooleanValue', (v) => parseBooleanValue({ value: v }), oldBool],
    ['toArrayValue', (v) => toArrayValue({ value: v }), oldArray],
    ['trimArrayValues', (v) => trimArrayValues({ value: v }), oldArrayTrim],
  ];

  for (const [name, helper, original] of cases) {
    it(`${name} bate com o lambda antigo em toda a amostra`, () => {
      for (const input of INPUTS) {
        expect(helper(input)).toEqual(original(input));
      }
    });
  }

  it('parseIntegerValue bate no que importa e melhora o caso de objeto', () => {
    for (const input of INPUTS) {
      const isObjectLike =
        typeof input === 'object' && input !== null && !Array.isArray(input);
      if (isObjectLike || Array.isArray(input)) continue;
      expect(parseIntegerValue({ value: input })).toEqual(oldInt(input));
    }
    // Objeto: antes String({}) dava '[object Object]', parse falhava e o valor
    // original voltava. O resultado observavel e o mesmo, por caminho explicito.
    expect(parseIntegerValue({ value: {} })).toEqual(oldInt({}));
    expect(parseIntegerValue({ value: [] })).toEqual(oldInt([]));
  });
});
