# Backend proxy (Express + Cursor SDK) — for platforms that run a persistent
# Node process/container (Railway, Render, Fly.io, VPS). NOT for Netlify/Vercel
# serverless, which can't host the long-lived process + Cursor CLI this needs.

# Node >= 22.13 required: Cursor SDK local agent storage uses the built-in
# node:sqlite module, which is unavailable on Node 20.
FROM node:22-slim

# Cursor SDK local runtime shells out to the `cursor-agent` CLI, which needs
# git + curl available in the image.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install the Cursor CLI (provides cursor-agent used by the SDK local runtime).
RUN curl https://cursor.com/install -fsS | bash

# Make the installed CLI discoverable regardless of the installer's target dir.
ENV PATH="/root/.local/bin:/root/.cursor/bin:${PATH}"

WORKDIR /app

# Install only production dependencies (express, cors, @cursor/sdk, ...).
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the backend source (frontend is deployed separately to Netlify/Vercel).
COPY server ./server

ENV PORT=8787
EXPOSE 8787

CMD ["node", "server/index.mjs"]
