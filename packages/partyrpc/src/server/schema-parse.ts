// https://github.com/trpc/trpc/blob/fa7f6d6b804df71d8dd15970168f7be18aeecaf2/packages/server/src/core/internals/getParseFn.ts#L5
import { Parser } from "./schema-infer";

export type ParseFn<TType> = (value: unknown) => Promise<TType> | TType;

export function getParseFn<TType>(procedureParser: Parser): ParseFn<TType> {
  const parser = procedureParser as any;

  if (typeof parser === "function") {
    // ParserCustomValidatorEsque
    return parser;
  }

  if (typeof parser.parseAsync === "function") {
    // ParserZodEsque
    return parser.parseAsync.bind(parser);
  }

  if (typeof parser.parse === "function") {
    // ParserZodEsque
    // ParserValibotEsque
    return parser.parse.bind(parser);
  }

  if (typeof parser.validateSync === "function") {
    // ParserYupEsque
    return parser.validateSync.bind(parser);
  }

  if (typeof parser.create === "function") {
    // ParserSuperstructEsque
    return parser.create.bind(parser);
  }

  if (typeof parser.assert === "function") {
    // ParserScaleEsque
    return (value) => {
      parser.assert(value);
      return value as TType;
    };
  }

  throw new Error("Could not find a validator fn");
}

/**
 * @deprecated only for backwards compat
 * @internal
 */
export function getParseFnOrPassThrough<TType>(procedureParser: Parser | undefined): ParseFn<TType> {
  if (!procedureParser) {
    return (v) => v as TType;
  }
  return getParseFn(procedureParser);
}
