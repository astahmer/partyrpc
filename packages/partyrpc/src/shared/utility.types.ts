// https://github.com/ecyrbe/zodios/blob/bc1c08ca26ccf6ebd67b172e90bf3fe265fb6c6d/packages/core/src/utils.types.ts#L3

export type Pretty<T> = { [K in keyof T]: T[K] } & {};

/**
 * filter an array type by a predicate value
 * @param T - array type
 * @param C - predicate object to match
 * @details - this is using tail recursion type optimization from typescript 4.5
 */
export type FilterArrayByValue<
  T extends readonly unknown[] | unknown[] | undefined,
  C,
  Acc extends unknown[] = [],
> = T extends readonly [infer Head, ...infer Tail]
  ? Head extends C
    ? FilterArrayByValue<Tail, C, [...Acc, Head]>
    : FilterArrayByValue<Tail, C, Acc>
  : T extends [infer Head, ...infer Tail]
  ? Head extends C
    ? FilterArrayByValue<Tail, C, [...Acc, Head]>
    : FilterArrayByValue<Tail, C, Acc>
  : Acc;

/**
 * find the first value in an array type that matches a predicate
 * @param T - array type
 * @param C - predicate object to match
 * @details - this is using tail recursion type optimization from typescript 4.5
 */
export type FindArrayByValue<T extends readonly unknown[] | unknown[] | undefined, C> = T extends readonly [
  infer Head,
  ...infer Tail,
]
  ? Head extends C
    ? Head
    : FindArrayByValue<Tail, C>
  : T extends [infer Head, ...infer Tail]
  ? Head extends C
    ? Head
    : FindArrayByValue<Tail, C>
  : never;
