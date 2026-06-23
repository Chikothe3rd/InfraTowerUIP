FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3001

# Run prisma migration/push, seeding, and dev server
CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && npm run dev"]
