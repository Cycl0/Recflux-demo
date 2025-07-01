import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:kafkabr/kafka.dart';

class DashboardScreen extends StatefulWidget {
  @override
  _DashboardScreenState createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Consumer consumer;
  List<String> messages = [];

  @override
  void initState() {
    super.initState();
    _initKafka();
  }

  void _initKafka() async {
    var session = KafkaSession([ContactPoint('localhost', 29092)]);
    var group = ConsumerGroup(session, 'dashboard-consumer');
    consumer = Consumer(
        session,
        group,
        {
          'accessibility-test-results': {0}
        },
        100,
        1);
    consumer.onOffsetOutOfRange = OffsetOutOfRangeBehavior.resetToEarliest;

    await for (MessageEnvelope envelope in consumer.consume()) {
      setState(() {
        messages.add(String.fromCharCodes(envelope.message.value));
      });
      envelope.commit('metadata'); // Commit message as processed
    }
  }

  @override
  void dispose() {
    consumer.session.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Test Results Dashboard'),
      ),
      body: ListView.builder(
        itemCount: messages.length,
        itemBuilder: (context, index) {
          // Pretty print the JSON
          try {
            var decodedJson = jsonDecode(messages[index]);
            var prettyString =
                JsonEncoder.withIndent('  ').convert(decodedJson);
            return Card(
              margin: EdgeInsets.all(8.0),
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Text(prettyString),
              ),
            );
          } catch (e) {
            return Card(
              margin: EdgeInsets.all(8.0),
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Text('Error decoding JSON: ${messages[index]}'),
              ),
            );
          }
        },
      ),
    );
  }
}
