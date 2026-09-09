/**
 * Normalizacoes reaproveitadas pelos DTOs via `@Transform`.
 *
 * Existem por dois motivos. O primeiro e duplicacao: o mesmo lambda de trim
 * aparecia em 14 arquivos. O segundo e tipagem -- `TransformFnParams.value` e
 * `any` no class-transformer, entao todo `({ value }) => ... value` era um
 * unsafe return. Recebendo `unknown` aqui, o `any` da biblioteca para nesta
 * fronteira em vez de se espalhar por 15 DTOs.
 *
 * Cada funcao devolve o valor original quando nao reconhece o formato: validar
 * e papel do class-validator, e converter aqui esconderia entrada invalida.
 */

type TransformParams = { value: unknown };

/** Remove espaco nas pontas de texto. */
export function trimValue({ value }: TransformParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Trim mais caixa baixa. Usado em e-mail, onde a unicidade e por valor
 * normalizado, e em extensao de arquivo, comparada contra a whitelist de MIME.
 */
export function trimLowerCase({ value }: TransformParams): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

/** Trim mais caixa alta, para codigos que sao sempre maiusculos. */
export function trimUpperCase({ value }: TransformParams): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

/**
 * Converte parametro de query em inteiro.
 *
 * Query string chega sempre como texto, e `@IsInt` rejeitaria `'2'`. Quando a
 * conversao falha, devolve o valor original de proposito: assim o
 * class-validator reporta o campo invalido, em vez de receber um NaN.
 */
export function parseIntegerValue({ value }: TransformParams): unknown {
  if (value === undefined) {
    return undefined;
  }

  // So texto e numero sao convertidos. A versao anterior chamava String() em
  // qualquer coisa: um objeto virava '[object Object]', o parse falhava e o
  // valor original era devolvido -- o resultado batia por acidente. Aqui a
  // intencao fica explicita.
  if (typeof value !== 'string' && typeof value !== 'number') {
    return value;
  }

  const parsed = Number.parseInt(String(value), 10);

  return Number.isNaN(parsed) ? value : parsed;
}

/** Converte a string `'true'` da query no booleano correspondente. */
export function parseBooleanValue({ value }: TransformParams): unknown {
  if (value === undefined) {
    return undefined;
  }

  return value === true || value === 'true';
}

/**
 * Garante array quando a query aceita valor repetido.
 *
 * `?examIds=a&examIds=b` chega como array, mas `?examIds=a` chega como string
 * unica -- sem isto, `@IsArray` reprovaria o caso de um item so.
 */
export function toArrayValue({ value }: TransformParams): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}

/** Aplica trim a cada item de um array de texto. */
export function trimArrayValues({ value }: TransformParams): unknown {
  return Array.isArray(value)
    ? value.map((item: unknown) =>
        typeof item === 'string' ? item.trim() : item,
      )
    : value;
}
