require('./test').test({
  numberOfPublishers: 1,
  numberOfSubscribers: 400,
  publishersPerBrowser: 1,
  subscribersPerBrowser: 20,
  duration: 10000,
  audioMuted: false,
  videoMuted: false,
  singlePC: false,
  enableStats: true,
  url: process.env.LICODE_HOST || 'http://licode:3001',
});
