// The one bit of Node's `process` the package uses. App bundlers replace
// `process.env.NODE_ENV` at build time. Declared here instead of loading
// @types/node, so the browser code can't use other Node APIs by mistake.
declare const process: { readonly env: { readonly NODE_ENV?: string } };
