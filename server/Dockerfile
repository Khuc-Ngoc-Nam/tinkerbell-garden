FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tzdata
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV TZ=Asia/Ho_Chi_Minh
EXPOSE 5000
CMD ["npm", "start"]
