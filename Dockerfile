FROM node:23-alpine
# Mirror the host structure so ../../../learner-prompts resolves correctly from src/hooks/
WORKDIR /workspace/learner-frontend
COPY learner-frontend/package*.json ./
RUN npm install
COPY learner-prompts /workspace/learner-prompts
COPY learner-frontend .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]