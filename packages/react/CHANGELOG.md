# swr-devtools-react

## 0.2.0

### Minor Changes

- 06d1ba4: The npm page now links to the docs site at https://swr-devtools-react.theflyer1983.dev, and the README links to it too.
- 8a5ce20: The panel shows how many mounted hooks use each key, in the list and the key's details. Keys no hook uses any more, which SWR keeps in the cache, are marked Unused, and Revalidate is disabled for them, since there's no fetcher to call. That includes `useSWRInfinite`'s page keys. It needs no setup.
- c655a9a: The panel has a dark theme. It follows the system setting until you pick System, Light or Dark in the panel's header, and remembers that choice. Apps and devtools hosts with their own theme setting can pass `theme` to `<SWRDevtools />` or `<SWRDevtoolsPanel />` instead, which hides the picker.

## 0.1.2

### Patch Changes

- ff290e4: Clearer npm description and more keywords, so the package is easier to find in npm search.

## 0.1.1

### Patch Changes

- 2c109f8: Package sites that read the README from the package's folder on GitHub, such as npmx, now find one there that links to the full docs. The published package still includes the full README.

## 0.1.0

### Minor Changes

- f158c04: First release. A floating, resizable panel that lists every key in the SWR cache with its status, and lets you search, sort, inspect, revalidate, edit and delete them. It renders nothing in production builds unless you import `swr-devtools-react/production`.
