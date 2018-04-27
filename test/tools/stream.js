let globalStreamId = 0;
class Stream {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.browser = client.browser;
    this.id = globalStreamId++;
    this.browser.createStream(this);
  }

  initialize() {
    this.browser.initializeStream(this);
    this.browser.waitUntilStreamInitialized(this);
  }

  publish(options = {}) {
    this.browser.publishStream(this, options);
    this.browser.waitUntilStreamPublished(this);
  }

  subscribeFrom(client, options = {}) {
    client.browser.subscribeToStream(this, options);
    client.browser.waitUntilStreamSubscribed(this);
    if (this.config.video) {
      client.browser.waitUntilStreamIsNotBlack(this);
    }
  }

  isPublishingSimulcast() {
    return this.browser.isPublishingSimulcast(this);
  }

  isPublishingCodec(codec) {
    return this.browser.containsCodec(this, codec);
  }
}

exports.Stream = Stream;
