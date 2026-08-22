/**
 * Minimal type declarations for `pako`.
 *
 * pako v2 ships no type definitions of its own, and the `@types/pako` package
 * is a deprecated empty stub that breaks `tsc` when installed. Only the two
 * inflate functions used by the document text extractor are declared here.
 */
declare module 'pako' {
  export function inflate(data: Uint8Array): Uint8Array;
  export function inflateRaw(data: Uint8Array): Uint8Array;
  export function deflate(data: Uint8Array): Uint8Array;
  export function deflateRaw(data: Uint8Array): Uint8Array;
}
