require('./test').test({
  numberOfPublishers: 20,
  numberOfSubscribers: 1, // 2 * 1 = 2,
  publishersPerBrowser: 5,
  subscribersPerBrowser: 1, // 20,
  duration: 15000,
  audioMuted: false,
  videoMuted: false,
  singlePC: false,
  enableStats: true,
  url: process.env.LICODE_HOST || 'http://licode:3001',
});
