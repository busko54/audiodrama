export const metadata = {
  title: 'Narratescape — Books That Come Alive',
  description: 'AI audio dramas with unique character voices, ambient sound, and cinematic music — automatically generated from classic books.',
  openGraph: {
    title: 'Narratescape — Books That Come Alive',
    description: 'AI audio dramas with unique character voices, ambient sound, and cinematic music.',
    url: 'https://audiodrama.vercel.app',
    siteName: 'Narratescape',
    images: [{ url: 'https://audiodrama.vercel.app/og.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Narratescape — Books That Come Alive',
    description: 'AI audio dramas with unique character voices, ambient sound, and cinematic music.',
    images: ['https://audiodrama.vercel.app/og.png'],
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✦</text></svg>",
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
