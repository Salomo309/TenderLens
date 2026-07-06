const { Client } = require('ssh2');

const conn = new Client();

const cmd = process.argv[2] || 'uname -a';
const password = process.argv[3] || 'AkuStei2021';

console.log(`Attempting SSH to 72.62.78.190 as root with password length ${password.length}...`);

conn.on('ready', () => {
  console.log('SSH Connection ready');
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err.message);
}).connect({
  host: '72.62.78.190',
  port: 22,
  username: 'root',
  password: password,
  readyTimeout: 20000
});
