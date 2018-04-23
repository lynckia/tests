FROM circleci/node:4.9

ADD package.json /tmp
RUN cd /tmp && npm install --only=dev
ADD docker-entrypoint.sh /tmp
ADD wdio.conf.js /tmp
ADD test /tmp/test
WORKDIR /tmp

ENTRYPOINT ["/tmp/docker-entrypoint.sh"]
CMD ["start"]
