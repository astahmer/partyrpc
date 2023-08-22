/**
 * Type Provider for HKT (Higher Kinded Types) in TypeScript
 * @param Schema - The schema type to resolve into native typescript types
 */
interface ApiTypeProvider<Schema = unknown> {
  /**
   * The schema type to resolve into native typescript types
   */
  schema: Schema;
  /**
   * placeholder for resolved input type from the schema
   */
  input: unknown;
  /**
   * placeholder for resolved output type from the schema
   */
  output: unknown;
  /**
   * placeholder for resolved error type from the schema
   */
  error: any;

  /**
   * placeholder for schema base type
   */
  base: any;
}

//   interface ZodTypeProvider extends ApiTypeProvider {
//     input: this["schema"] extends never | v.NeverSchema ? never : Infer<this["schema"]>;
//     output: this["schema"] extends never | v.NeverSchema ? never : Infer<this["schema"]>;
//   }
