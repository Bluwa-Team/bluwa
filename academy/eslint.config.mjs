// eslint.config.mjs — ESLint v9 flat config pour Next.js 16
import nextConfig from 'eslint-config-next'

const config = [
  ...nextConfig,
  {
    rules: {
      // Les apostrophes françaises dans le JSX sont intentionnelles
      'react/no-unescaped-entities': 'off',
    },
  },
]

export default config
