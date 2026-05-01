declare module "rxjs" {
  export type Observable<T = unknown> = unknown;
  export function of<T>(value: T): unknown;
  export function from<T>(value: Promise<T>): unknown;
}

declare module "rxjs/operators" {
  export function mergeMap<T, R>(project: (value: T) => R): unknown;
}
