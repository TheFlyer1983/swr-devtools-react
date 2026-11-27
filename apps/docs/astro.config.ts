import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

const site = 'https://swr-devtools-react.theflyer1983.dev';

export default defineConfig({
  site,
  integrations: [
    starlight({
      title: 'SWR Devtools for React',
      head: [
        // Share previews need an absolute image URL.
        { tag: 'meta', attrs: { property: 'og:image', content: `${site}/og-image.png` } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:alt',
            content:
              'The SWR Devtools panel listing cache keys with their status, next to the data of the selected key.'
          }
        }
      ],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/TheFlyer1983/swr-devtools-react'
        }
      ],
      sidebar: [
        { label: 'Start here', items: ['getting-started', 'nextjs', 'demo'] },
        {
          label: 'Using the panel',
          items: [
            'panel/inspecting-data',
            'panel/search-and-sort',
            'panel/editing',
            'panel/revalidating-and-deleting'
          ]
        },
        { label: 'Guides', items: ['production'] },
        { label: 'Reference', items: ['api-reference', 'known-limits'] }
      ]
    }),
    react()
  ]
});
