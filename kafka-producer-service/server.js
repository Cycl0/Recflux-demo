const express = require('express');
const cors = require('cors');
const { Kafka } = require('kafkajs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const kafkaBrokers = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'];
const kafka = new Kafka({
  clientId: 'kafka-service',
  brokers: kafkaBrokers,
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'api-consumer-group' });
const topic = 'accessibility-test-results';
let results = []; // In-memory store for results

const run = async () => {
  // Connect producer and consumer
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const result = JSON.parse(message.value.toString());
        results.push(result);
        console.log('Stored message from Kafka:', result);
      } catch (e) {
        console.error('Error parsing or storing message', e);
      }
    },
  });
};

run().catch(e => console.error('[kafka-service] Error:', e.message, e));

app.post('/publish', async (req, res) => {
  try {
    const message = req.body;
    await producer.send({
      topic: topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log('Message published successfully:', message);
    res.status(200).json({ status: 'success', message: 'Message published' });
  } catch (error) {
    console.error('Failed to publish message:', error);
    res.status(500).json({ status: 'error', message: 'Failed to publish message' });
  }
});

app.get('/results', (req, res) => {
  res.status(200).json(results);
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Kafka service (producer/consumer) listening on port ${port}`);
});

const gracefulShutdown = async () => {
  console.log('Closing Kafka connections...');
  try {
    await producer.disconnect();
    await consumer.disconnect();
  } catch (e) {
    console.error('Error during graceful shutdown', e);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown); 