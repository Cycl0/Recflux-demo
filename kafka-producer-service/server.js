const express = require('express');
const cors = require('cors');
const { Kafka } = require('kafkajs');

const app = express();
app.use(cors());
app.use(express.json());

const kafkaBrokers = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'];
const kafka = new Kafka({
  clientId: 'accessibility-test-producer',
  brokers: kafkaBrokers,
});

const producer = kafka.producer();
const topic = 'accessibility-test-results';

app.post('/publish', async (req, res) => {
  try {
    const message = req.body;
    await producer.connect();
    await producer.send({
      topic: topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log('Message published successfully:', message);
    res.status(200).json({ status: 'success', message: 'Message published' });
  } catch (error) {
    console.error('Failed to publish message:', error);
    res.status(500).json({ status: 'error', message: 'Failed to publish message' });
  } finally {
    await producer.disconnect();
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Kafka producer service listening on port ${port}`);
}); 