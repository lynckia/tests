const fs = require('fs');
const processStats = require('./test').processStats;

const filename = process.argv.length > 2 ? process.argv[2] : '20_pub_400_subs.json';

const data = fs.readFileSync(filename);
const stats = JSON.parse(data);
processStats(stats);
