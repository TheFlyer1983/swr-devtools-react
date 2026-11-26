import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://swr-devtools-react.theflyer1983.dev',
  integrations: [
    starlight({
      title: 'SWR Devtools',
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
