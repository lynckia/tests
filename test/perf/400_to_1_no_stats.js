require('./test').test({
  numberOfPublishers: 40,
  numberOfSubscribers: 10, // 2 * 1 = 2,
  publishersPerBrowser: 2,
  subscribersPerBrowser: 10, // 20,
  duration: 40000,
  audioMuted: true,
  videoMuted: true,
  singlePC: false,
  enableStats: false,
  url: process.env.LICODE_HOST || 'http://licode:3001',
});
