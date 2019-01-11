# docker build command

# docker build -t brozeph/simple-socks:latest ./docker

# Build
# * build all npm modules
# * run eslint
# * Babel transpile to dist
# * clean up npm modules and install production dependencies only

ARG ALPINE_VERSION=v3.8
ARG NODE_JS_VERSION=10.15

FROM node:$NODE_JS_VERSION-alpine AS base-build

LABEL authors = "Joshua Thomas <github.com/brozeph>"

ENV APP_NAME simple-socks
ENV APP_ROOT /opt
WORKDIR $APP_ROOT/$APP_NAME

# create directories
RUN echo http://dl-cdn.alpinelinux.org/alpine/$ALPINE_VERSION/main >> /etc/apk/repositories && \
		echo http://dl-cdn.alpinelinux.org/alpine/$ALPINE_VERSION/community >> /etc/apk/repositories && \
		mkdir -p $APP_ROOT/$APP_NAME && \
		apk update && \
		apk add --no-cache gcc make python

# Add the necessary build and runtime dependencies
ADD ./package.json .
ADD ./.eslintrc.yml .
ADD ./.babelrc .
ADD ./gulpfile.babel.js .
ADD ./src ./src
ADD ./test ./test

RUN npm install && \
		# lint and test
		npm run lint && \
		# build using gulp
		npm run build && \
		# remove NPM modules with dev dependencies
		rm -rf node_modules && \
		# install production NPM dependencies
		npm install --only=production

# Base Release
# * build production NPM modules
FROM node:$NODE_JS_VERSION-alpine AS base-release

# Production
# * copy production NPM modules
# * copy dist
FROM  node:$NODE_JS_VERSION-alpine

USER root

ENV APP_NAME broadcast-svc
ENV APP_ROOT /opt
WORKDIR $APP_ROOT/$APP_NAME

RUN mkdir -p $APP_ROOT/$APP_NAME

ADD ./package.json .
ADD ./.babelrc .
COPY --from=base-build $HOME/$DIR_NAME/node_modules ./node_modules
COPY --from=base-build $HOME/$DIR_NAME/dist ./dist

CMD ["node", "dist"]
