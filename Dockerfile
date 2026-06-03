# Estágio de base
FROM node:22-alpine AS base
WORKDIR /app

# Estágio de instalação de dependências
FROM base AS install
COPY package.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm install
RUN npx prisma generate

# Estágio de build
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Instalação apenas de dependências de produção (sem devDependencies)
FROM base AS production-deps
COPY package.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm install --omit=dev
RUN npx prisma generate

# Imagem final de produção (mínima)
FROM node:22-alpine AS release
WORKDIR /app

# Copia apenas dependências de produção e artefatos de build
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Configurações de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Porta da aplicação
EXPOSE 3000

# Executa o push do banco antes de iniciar o app
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm start"]