# Estágio de base
FROM node:20-slim AS base
WORKDIR /app

# Estágio de instalação de dependências
FROM base AS install
# Instalamos dependências para compilar better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ 
COPY package.json package-lock.json* ./
RUN npm install

# Estágio de build
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Imagem final de produção
FROM node:20-slim AS release
WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/build ./build
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