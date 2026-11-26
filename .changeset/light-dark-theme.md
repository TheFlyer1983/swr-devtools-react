---
'swr-devtools-react': minor
---

The panel has a dark theme. It follows the system setting until you pick System, Light or Dark in the panel's header, and remembers that choice. Apps and devtools hosts with their own theme setting can pass `theme` to `<SWRDevtools />` or `<SWRDevtoolsPanel />` instead, which hides the picker.
