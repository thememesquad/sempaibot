FROM debian:latest

RUN apt-get update && apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_7.x | bash -
RUN echo deb http://www.deb-multimedia.org jessie main non-free >> /etc/apt/sources.list
RUN apt-get update && apt-get install -y --force-yes deb-multimedia-keyring
RUN apt-get update && apt-get install -y nodejs build-essential libatlas3-base ffmpeg

RUN mkdir /source
WORKDIR /source

ADD package.json /source/package.json
RUN npm install snowboy
RUN npm install node-opus
RUN npm install

ADD config.js /source/config.js
ADD src /source/src
ADD resources/sempai.pmdl /source/resources/sempai.pmdl
ADD resources/common.res /source/resources/common.res
ADD resources/ding.wav /source/resources/ding.wav
ADD resources/dong.wav /source/resources/dong.wav

VOLUME /source/data
VOLUME /source/output

ENTRYPOINT npm start

