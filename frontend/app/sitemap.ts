import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://xhedge.app', lastModified: new Date() },
    { url: 'https://xhedge.app/vault', lastModified: new Date() },
    { url: 'https://xhedge.app/learn', lastModified: new Date() },
    { url: 'https://xhedge.app/settings', lastModified: new Date() },
  ];
}
