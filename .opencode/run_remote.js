const { Client } = require('ssh2');

const conn = new Client();
const localPath = 'C:\\Users\\iSystem Asia\\.gemini\\antigravity\\brain\\b9710812-db9b-408a-b122-bfabcfc8d57c\\scratch\\test_spse5.js';

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(localPath, '/opt/sinyaltender/apps/backend/test_spse5.js', {}, (err2) => {
      if (err2) throw err2;
      sftp.end();
      // Run from backend dir which has puppeteer-extra installed
      conn.exec('cd /opt/sinyaltender/apps/backend && node test_spse5.js', (err3, stream) => {
        if (err3) throw err3;
        stream.on('close', () => conn.end())
              .on('data', (d) => process.stdout.write(d))
              .stderr.on('data', (d) => process.stderr.write(d));
      });
    });
  });
}).connect({
  host: '72.62.78.190',
  port: 22,
  username: 'root',
  password: 'AkuStei2021.',
  readyTimeout: 20000
});
