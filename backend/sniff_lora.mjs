import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://127.0.0.1:1884');

client.on('connect', () => {
  console.log('Sniffer connected to MQTT broker. Subscribing to # ...');
  client.subscribe('#');
});

client.on('message', (topic, message) => {
  console.log(`\n=== Topic: ${topic} (Length: ${message.length} bytes) ===`);
  console.log('Hex:', message.toString('hex'));
  console.log('ASCII:', message.toString('latin1').replace(/[^\x20-\x7E]/g, '.'));
  try {
    const json = JSON.parse(message.toString());
    console.log('JSON:', json);
  } catch (e) {
    // not json
  }
});

setTimeout(() => {
  console.log('\nFinished sniffing.');
  client.end();
  process.exit(0);
}, 60000);
