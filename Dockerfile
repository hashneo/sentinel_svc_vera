FROM mhart/alpine-node:6.2.1

COPY ./ /app

WORKDIR /app

RUN npm install

EXPOSE 8080

ENTRYPOINT ["npm", "start"]
