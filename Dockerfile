# Estágio de base
FROM node:20.20.2-alpine3.23 AS base
WORKDIR /app

# Estágio de instalação de dependências
FROM base AS install
# Dependências para compilar better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install

# Estágio de build
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Instalação apenas de dependências de produção (sem devDependencies)
FROM base AS production-deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --omit=dev

# Imagem final de produção (mínima)
FROM node:20.20.2-alpine3.23 AS release
WORKDIR /app

# Copia apenas dependências de produção (sem TypeScript, Vite, Tailwind, etc.)
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json

# Garante que a pasta data exista para o volume do Dokploy
RUN mkdir -p /app/data

# Configurações de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Porta da aplicação
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "start"]