import * as v from "valibot";

// Compatiblity layer for the future migration to typeschema
export type AnySchema = v.BaseSchema<any, any, any>;
export type Infer<TSchema> = TSchema extends v.BaseSchema<any, any, any> ? v.InferOutput<TSchema> : never;

export class ValidationIssue extends Error {
  constructor(message: string, public path?: Array<string | number | symbol>) {
    super(message);
  }
}

export const createAssert = <TSchema extends AnySchema>(schema: TSchema) => {
  return (data: unknown) => {
    const result = v.safeParse(schema, data);
    if (result.success) {
      return result.output;
    }

    return {
      _issues: result.issues.map(vIssuesToValidationIssues),
    };
  };
};

export const vIssuesToValidationIssues = ({ message, path }: v.BaseIssue<any>) => {
  return new ValidationIssue(message, path?.map(({ key }) => key as string) ?? []);
};
//
