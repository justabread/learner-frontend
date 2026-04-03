FROM node:23-alpine
# Mirror the host structure so ../../../prompts resolves correctly from src/hooks/
WORKDIR /workspace/learner-frontend
COPY learner-frontend/package*.json ./
RUN npm install
COPY prompts /workspace/prompts
COPY learner-frontend .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]