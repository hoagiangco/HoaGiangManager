import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HoaGiang Manager',
    short_name: 'HoaGiang',
    description: 'Quản lý vật tư, thiết bị và báo cáo hư hỏng cho Hoa Giang.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0d6efd',
    lang: 'vi',
    scope: '/',
    categories: ['productivity', 'business'],
    dir: 'ltr',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
}
