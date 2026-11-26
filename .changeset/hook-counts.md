---
'swr-devtools-react': minor
---

The panel shows how many mounted hooks use each key, in the list and the key's details. Keys no hook uses any more, which SWR keeps in the cache, are marked Unused, and Revalidate is disabled for them, since there's no fetcher to call. That includes `useSWRInfinite`'s page keys. It needs no setup.
