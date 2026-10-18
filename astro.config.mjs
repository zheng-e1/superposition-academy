import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// 部署时用 PUBLIC_SITE_URL 覆盖（Cloudflare Pages / Vercel 的环境变量），
// 未设置时退回占位域名，保证本地开发不报错。
// 当前生产地址；绑定自定义域名后通过 PUBLIC_SITE_URL 覆盖，不必改这里。
const siteUrl = process.env.PUBLIC_SITE_URL || 'https://superposition-academy.481828896.workers.dev';

export default defineConfig({
  site: siteUrl,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: false, throwOnError: false }]],
    }),
    shikiConfig: { theme: 'github-light', wrap: true },
  },
  build: { inlineStylesheets: 'auto' },
});
