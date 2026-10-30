// Exportação estática para o GitHub Pages: o site roda inteiro no navegador, sem servidor nem banco.
// NEXT_PUBLIC_BASE_PATH vem do workflow de deploy (nome do repositório); local fica vazio.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
