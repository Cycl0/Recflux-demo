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

// Enable CORS with more specific options
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Increase JSON limit for larger payloads
app.use(express.json({ limit: '500mb' }));

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Use environment variable for Kafka brokers or default to kafka:9092 (Docker service name)
const kafkaBrokers = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['kafka:9092'];
console.log(`Using Kafka brokers: ${kafkaBrokers.join(', ')}`);

// Store results directly in memory as a fallback
let directResults = [];

// Initialize Kafka client
let kafka;
let producer;
let consumer;
const topic = 'accessibility-test-results';

// Try to initialize Kafka
try {
  kafka = new Kafka({
    clientId: 'kafka-service',
    brokers: kafkaBrokers,
  });
  
  producer = kafka.producer();
  consumer = kafka.consumer({ groupId: 'api-consumer-group' });
  
  // Connect to Kafka asynchronously
  const connectToKafka = async () => {
    try {
      console.log('Connecting to Kafka producer...');
      await producer.connect();
      console.log('Kafka producer connected successfully');
      
      console.log('Connecting to Kafka consumer...');
      await consumer.connect();
      console.log('Kafka consumer connected successfully');
      
      console.log(`Subscribing to topic: ${topic}`);
      await consumer.subscribe({ topic, fromBeginning: true });
      console.log(`Subscribed to topic: ${topic}`);
      
      // Start consuming messages
      await consumer.run({
        eachMessage: async ({ message }) => {
          try {
            const result = JSON.parse(message.value.toString());
            console.log(`Received message from Kafka for URL: ${result.url}`);
            
            // Store in direct results for redundancy
            const existingIndex = directResults.findIndex(r => r.url === result.url);
            if (existingIndex >= 0) {
              console.log(`Updating existing result for URL: ${result.url}`);
              directResults[existingIndex] = result;
            } else {
              console.log(`Adding new result for URL: ${result.url}`);
              directResults.push(result);
            }
            
            console.log(`Total results in memory: ${directResults.length}`);
          } catch (e) {
            console.error('Error processing Kafka message:', e);
          }
        },
      });
    } catch (error) {
      console.error('Failed to connect to Kafka:', error.message);
      console.log('Will continue with direct storage only');
    }
  };
  
  // Start connection process but don't wait for it
  connectToKafka().catch(e => {
    console.error('Kafka connection failed:', e.message);
  });
} catch (error) {
  console.error('Error initializing Kafka client:', error.message);
  console.log('Will operate in direct storage mode only');
}

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
    console.log(`Received publish request for URL: ${message.url}`);
    
    // Always store directly in memory first for reliability
    const existingIndex = directResults.findIndex(r => r.url === message.url);
    if (existingIndex >= 0) {
      console.log(`Updating existing direct result for URL: ${message.url}`);
      directResults[existingIndex] = message;
    } else {
      console.log(`Adding new direct result for URL: ${message.url}`);
      directResults.push(message);
    }
    
    // Try to publish to Kafka if available
    if (producer) {
      try {
        await producer.send({
          topic: topic,
          messages: [{ value: JSON.stringify(message) }],
        });
        console.log('Message also published to Kafka successfully');
      } catch (kafkaError) {
        console.error('Failed to publish to Kafka:', kafkaError.message);
        console.log('Continuing with direct storage only');
      }
    }
    
    console.log(`Total results in memory: ${directResults.length}`);
    res.status(200).json({ 
      status: 'success', 
      message: 'Message stored successfully',
      resultsCount: directResults.length
    });
  } catch (error) {
    console.error('Failed to process publish request:', error);
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
  console.log(`Returning ${directResults.length} results from direct storage`);
  res.status(200).json(directResults);
});

// Add a debug endpoint to check service status
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    resultsCount: directResults.length,
    kafkaEnabled: !!producer,
    kafkaBrokers: kafkaBrokers
  });
});

// Add a test endpoint to add dummy data
app.post('/test-data', (req, res) => {
  const testData = {
    url: "https://example.com/test",
    resolution: { width: 1920, height: 1080 },
    actions: [{ action: "click", selector: "button" }],
    states: [{
      action: "initial",
      accessibilityReport: {
        violations: [
          { id: "test-violation", impact: "critical", help: "Test violation" }
        ],
        passes: [
          { id: "test-pass", impact: "minor", help: "Test pass" }
        ],
        incomplete: []
      }
    }]
  };
  
  directResults.push(testData);
  console.log(`Added test data. Total results: ${directResults.length}`);
  res.status(200).json({ status: 'success', message: 'Test data added', resultsCount: directResults.length });
});

const gracefulShutdown = async () => {
  console.log('Shutting down server...');
  try {
    if (producer) {
      await producer.disconnect();
      console.log('Kafka producer disconnected');
    }
    if (consumer) {
      await consumer.disconnect();
      console.log('Kafka consumer disconnected');
    }
  } catch (e) {
    console.error('Error during graceful shutdown', e);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

app.listen(port, () => {
  console.log(`Service listening on port ${port}`);
  console.log(`API documentation available at http://localhost:${port}/api-docs`);
}); 