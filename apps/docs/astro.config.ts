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
      sidebar: [{ label: 'Guides', items: ['getting-started', 'demo'] }]
    }),
    react()
  ]
});
