import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const postSchema = z.object({
  title: z.string(),
  summary: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()),
  ages: z.enum(['all', '4-6', '7-10']),
  hero: z.string(),
  heroAlt: z.string(),
  heroCredit: z.string().optional(),
  featured: z.boolean().optional(),
  weekend: z.boolean().optional(),
});

function collection(folder: string) {
  return defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: `./src/content/${folder}` }),
    schema: postSchema,
  });
}

export const collections = {
  adventures: collection('adventures'),
  fun: collection('fun'),
  lessons: collection('lessons'),
  kids: collection('kids'),
  camping: collection('camping'),
  rockhounding: collection('rockhounding'),
  gymnastics: collection('gymnastics'),
  aviation: collection('aviation'),
  gaming: collection('gaming'),
};

export type PostData = z.infer<typeof postSchema>;
