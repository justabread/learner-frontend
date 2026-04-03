FROM node:23-alpine
ARG VITE_BACKEND_URL=http://localhost:3001
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
WORKDIR /app
COPY learner-frontend/package*.json ./
RUN npm install
COPY learner-frontend .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]