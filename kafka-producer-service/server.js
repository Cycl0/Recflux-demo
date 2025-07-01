const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { Kafka } = require('kafkajs');

const app = express();
const port = process.env.PORT || 3004;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kafka Producer Service API',
      version: '1.0.0',
      description: 'API for publishing messages to Kafka and retrieving test results',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./server.js'], // Path to the API docs
};

const specs = swaggerJsdoc(swaggerOptions);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

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

/**
 * @swagger
 * /publish:
 *   post:
 *     summary: Publish message to Kafka
 *     description: Publish a message to the Kafka topic for accessibility test results
 *     tags: [Kafka]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: The message to publish to Kafka
 *             example:
 *               url: "https://example.com"
 *               resolution: { width: 1920, height: 1080 }
 *               actions: [{ action: "click", selector: "button" }]
 *               states: [{ action: "initial", violations: [] }]
 *     responses:
 *       200:
 *         description: Message published successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Message published"
 *       500:
 *         description: Failed to publish message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Failed to publish message"
 */
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

/**
 * @swagger
 * /results:
 *   get:
 *     summary: Get stored results
 *     description: Retrieve all stored accessibility test results from memory
 *     tags: [Results]
 *     responses:
 *       200:
 *         description: List of stored results
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                     description: The URL that was tested
 *                   resolution:
 *                     type: object
 *                     properties:
 *                       width:
 *                         type: number
 *                       height:
 *                         type: number
 *                   actions:
 *                     type: array
 *                     items:
 *                       type: object
 *                   states:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         action:
 *                           type: string
 *                         violations:
 *                           type: array
 *                         passes:
 *                           type: array
 */
app.get('/results', (req, res) => {
  res.status(200).json(results);
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

app.listen(port, () => {
  console.log(`Kafka service (producer/consumer) listening on port ${port}`);
  console.log(`API documentation available at http://localhost:${port}/api-docs`);
}); 