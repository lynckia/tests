let globalStreamId = 0;

class Stream {
  constructor(client, sessionId, config) {
    this.client = client;
    this.config = config;
    this.browser = client.browser;
    this.sessionId = sessionId;
    this.id = globalStreamId++;
    this.streamIds = [];
  }

  async initialize() {
    await this.browser.createStream(this, this.config);
    await this.browser.initializeStream(this);
    await this.browser.waitUntilStreamInitialized(this);
  }

  async publish(options = {}) {
    await this.browser.publishStream(this, options);
    await this.browser.waitUntilStreamPublished(this);
  }

  async subscribeFrom(client, options = {}) {
    await client.browser.subscribeToStream(this, options);
    await client.browser.waitUntilStreamSubscribed(this);
    if (this.config.video) {
      await client.browser.waitUntilStreamIsNotBlack(this);
    }
  }

  async isPublishingSimulcast() {
    return await this.browser.isPublishingSimulcast(this);
  }

  async isPublishingCodec(codec) {
    return await this.browser.containsCodec(this, codec);
  }
}

exports.Stream = Stream;
