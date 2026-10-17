import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string().default('Camil Benameur'),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    correction: z.object({ date: z.coerce.date(), text: z.string() }).optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // French versions sit in src/content/blog/fr/ with lang "fr" and slug "fr/<english slug>" (see src/i18n.js).
    lang: z.enum(['en', 'fr']).default('en'),
  }),
});

export const collections = { blog };
