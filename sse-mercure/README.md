# HTMX Server-Sent Events (SSE) Extension - Enhanced

A modified version of the [HTMX](https://htmx.org/) SSE extension that supports flexible message routing using message IDs, event types, and data content filtering. This modification was specifically created for seamless integration with **[Mercure](https://mercure.rocks/)**, the real-time communication protocol, while also supporting standard SSE patterns.

## Overview

This extension enables [HTMX](https://htmx.org/) to work with Server-Sent Events (SSE) by providing multiple filtering options for message routing. While originally designed for **[Mercure's](https://mercure.rocks/)** ID-based routing, it now supports event types and content-based filtering as well.

The modification provides:

- **Mercure Compatibility**: Direct support for Mercure's ID-based message routing
- **Event Type Support**: Filter messages by SSE event types
- **Content Filtering**: Filter messages by data content
- **Wildcard Processing**: Process all messages regardless of type or ID
- **Better Performance**: Efficient message listener implementation
- **Flexible Message Handling**: Multiple routing strategies in one extension

## Key Differences from Standard HTMX SSE Extension

- **[Mercure](https://mercure.rocks/) Integration**: Designed specifically to work with Mercure's ID-based message routing
- **Multiple Filtering Options**: Messages can be filtered by ID, event type, or data content
- **Wildcard Support**: Process all messages with `*` filter
- **Enhanced Performance**: Optimized listener registration for configured event types only
- **Backward Compatibility**: Still supports original ID-based routing

## Installation

1. Download the `sse-mercure.js` file
2. Include it in your HTML after the main [HTMX](https://htmx.org/) library:

```html
<script src="https://unpkg.com/htmx.org@1.9.10"></script>
<script src="path/to/sse-mercure.js"></script>
```

Or use it as an ES module:

```javascript
import './sse-mercure.js';
```

## Usage

### Basic Connection

```html
<div hx-ext="sse" sse-connect="/events">
  <!-- SSE connection established to /events endpoint -->
</div>
```

### Message Swapping with sse-swap

#### ID-Based Filtering (Mercure Style)

```html
<div hx-ext="sse" sse-connect="/events">
  <div sse-swap="user-update">
    <!-- This div will be replaced when a message with id="user-update" is received -->
  </div>

  <div sse-swap="notification,alert">
    <!-- This div will be replaced when messages with id="notification" or id="alert" are received -->
  </div>
</div>
```

#### Event Type Filtering

```html
<div hx-ext="sse" sse-connect="/events">
  <div sse-swap="type:notification">
    <!-- This div will be replaced when 'notification' event type is received -->
  </div>

  <div sse-swap="type:update,type:ping">
    <!-- This div will be replaced when 'update' or 'ping' event types are received -->
  </div>
</div>
```

#### Data Content Filtering

```html
<div hx-ext="sse" sse-connect="/events">
  <div sse-swap="data:urgent">
    <!-- This div will be replaced when message data contains "urgent" -->
  </div>
</div>
```

#### Wildcard Processing

```html
<div hx-ext="sse" sse-connect="/events">
  <div sse-swap="*">
    <!-- This div will be replaced by any SSE message -->
  </div>
</div>
```

#### Mixed Filtering

```html
<div hx-ext="sse" sse-connect="/events">
  <div sse-swap="id:user-123,type:notification,data:alert">
    <!-- Multiple filter types can be combined -->
  </div>
</div>
```

### Triggering Actions with hx-trigger

#### ID-Based Triggers

```html
<div hx-ext="sse" sse-connect="/events">
  <button hx-get="/refresh" hx-trigger="sse:refresh-signal">
    <!-- Button will be triggered when a message with id="refresh-signal" is received -->
    Refresh Data
  </button>
</div>
```

#### Event Type Triggers

```html
<div hx-ext="sse" sse-connect="/events">
  <button hx-get="/update" hx-trigger="sse:type:ping">
    <!-- Button will be triggered when 'ping' event type is received -->
    Update Status
  </button>
</div>
```

#### Wildcard Triggers

```html
<div hx-ext="sse" sse-connect="/events">
  <button hx-get="/log" hx-trigger="sse:*">
    <!-- Button will be triggered by any SSE message -->
    Log Activity
  </button>
</div>
```

### Auto-closing Connections

#### ID-Based Closing

```html
<div hx-ext="sse" sse-connect="/events" sse-close="stream-end">
  <!-- Connection will close when a message with id="stream-end" is received -->
</div>
```

#### Event Type Closing

```html
<div hx-ext="sse" sse-connect="/events" sse-close="type:disconnect">
  <!-- Connection will close when 'disconnect' event type is received -->
</div>
```

#### Data Content Closing

```html
<div hx-ext="sse" sse-connect="/events" sse-close="data:session-expired">
  <!-- Connection will close when message data contains "session-expired" -->
</div>
```

#### Wildcard Closing

```html
<div hx-ext="sse" sse-connect="/events" sse-close="*">
  <!-- Connection will close on any message -->
</div>
```

## Server-Side Implementation

Your server can send SSE messages using various formats depending on your filtering needs.

### Mercure Example

```bash
# Publish to Mercure hub
curl -X POST 'https://your-mercure-hub.example.com/.well-known/mercure' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'topic=user-updates' \
  -d 'id=user-123-update' \
  -d 'data=<div class="user">John Doe - Online</div>'
```

Learn more about [Mercure's publish API](https://mercure.rocks/docs/hub/publish).

### Example Server Response Formats

#### ID-Based Messages (Mercure Style)

```
id: user-update
data: <div class="user">John Doe - Online</div>

id: notification
data: <div class="alert">New message received!</div>

id: refresh-signal
data: trigger
```

#### Event Type Messages

```
event: notification
data: <div class="alert">System notification</div>

event: update
data: <div class="status">Status updated</div>

event: ping
data: heartbeat
```

#### Mixed Messages

```
id: user-123
event: notification
data: <div class="user-alert">User notification</div>

event: update
data: <div class="system">System update</div>

id: close-signal
data: Connection closing
```

### Mercure with Symfony Example

```php
<?php
// Symfony with MercureBundle
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;

class NotificationController
{
    public function sendUpdate(HubInterface $hub): Response
    {
        $update = new Update(
            'user-updates',
            '<div class="user">Jane Doe - Online</div>',
            false,
            'user-123-update' // This becomes the message ID
        );

        $hub->publish($update);

        return new Response('Update sent');
    }
}
```

See the [Symfony MercureBundle documentation](https://symfony.com/bundles/MercureBundle/current/index.html) for more details.

### Node.js Example

```javascript
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send ID-based message
  res.write(`id: user-update\n`);
  res.write(`data: <div class="user">John Doe - Online</div>\n\n`);

  // Send event type message
  res.write(`event: notification\n`);
  res.write(`data: <div class="alert">New message!</div>\n\n`);

  // Send mixed message
  res.write(`id: urgent-123\n`);
  res.write(`event: alert\n`);
  res.write(`data: <div class="urgent">Critical system alert</div>\n\n`);
});
```

### Python Flask Example

```python
from flask import Flask, Response
import json

@app.route('/events')
def events():
    def generate():
        # ID-based message
        yield f"id: user-update\ndata: <div class='user'>Jane Doe - Online</div>\n\n"

        # Event type message
        yield f"event: notification\ndata: <div class='alert'>Welcome!</div>\n\n"

        # Mixed message
        yield f"id: system-123\nevent: update\ndata: <div class='system'>System updated</div>\n\n"

    return Response(generate(), mimetype='text/event-stream')
```

## API Reference

### Attributes

| Attribute            | Description                                                 | Example                                   |
| -------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| `sse-connect`        | Establishes SSE connection to specified URL                 | `sse-connect="/events"`                   |
| `sse-swap`           | Comma-separated list of filters for message processing      | `sse-swap="update,type:ping,data:urgent"` |
| `sse-close`          | Filter condition that will close the SSE connection         | `sse-close="type:disconnect"`             |
| `hx-trigger="sse:*"` | Triggers HTMX actions when message matches specified filter | `hx-trigger="sse:type:reload"`            |

### Filter Formats

| Filter Format | Description                           | Example                        |
| ------------- | ------------------------------------- | ------------------------------ |
| `*`           | Match all messages                    | `sse-swap="*"`                 |
| `id:VALUE`    | Match by message ID                   | `sse-swap="id:user-123"`       |
| `type:VALUE`  | Match by event type                   | `sse-swap="type:notification"` |
| `data:VALUE`  | Match by data content                 | `sse-swap="data:urgent"`       |
| `VALUE`       | Match by message ID (backward compat) | `sse-swap="user-update"`       |

### Events

The extension triggers several custom events:

| Event                   | Description                            | Event Detail                          |
| ----------------------- | -------------------------------------- | ------------------------------------- |
| `htmx:sseOpen`          | Fired when SSE connection opens        | `{source: EventSource}`               |
| `htmx:sseClose`         | Fired when SSE connection closes       | `{source: EventSource, type: string}` |
| `htmx:sseError`         | Fired when SSE connection error occurs | `{error: Event, source: EventSource}` |
| `htmx:sseBeforeMessage` | Fired before processing SSE message    | `MessageEvent`                        |
| `htmx:sseMessage`       | Fired after processing SSE message     | `MessageEvent`                        |

### JavaScript API

```javascript
// Create custom EventSource (can be overridden)
htmx.createEventSource = function(url) {
  return new EventSource(url, { withCredentials: true });
};

// Listen to SSE events
document.addEventListener('htmx:sseOpen', function(evt) {
  console.log('SSE connection opened', evt.detail.source);
});

document.addEventListener('htmx:sseMessage', function(evt) {
  console.log('SSE message received with ID:', evt.detail.lastEventId);
  console.log('Event type:', evt.detail.type);
});
```

## Advanced Features

### Reconnection Handling

The extension automatically handles reconnections with exponential backoff:

- Initial retry: 500ms
- Maximum retry interval: 64 seconds
- Automatic cleanup of orphaned connections

### Multiple Filter Types

```html
<div hx-ext="sse" sse-connect="/events">
  <div sse-swap="id:chat-123,type:notification,data:urgent">
    <!-- Responds to multiple filter criteria -->
  </div>
</div>
```

### Nested SSE Elements

```html
<div hx-ext="sse" sse-connect="/events">
  <div sse-swap="id:header-update">Header content</div>
  <div sse-swap="type:body-update">Body content</div>
  <div sse-swap="data:footer">Footer content</div>
</div>
```

## Why This Modification?

This extension was specifically modified to work seamlessly with **[Mercure](https://mercure.rocks/)**, a modern real-time communication protocol, while also supporting traditional SSE patterns. Key reasons for the enhancement:

### Mercure's Architecture

- **Topic-based subscriptions**: [Mercure](https://mercure.rocks/) uses topics for subscriptions, not event types
- **ID-based message routing**: Messages are identified by unique IDs rather than event names
- **RESTful approach**: Follows REST principles with URL-based topic subscriptions

### Benefits for All SSE Users

- **Flexible Integration**: Works with Mercure, traditional SSE, and custom implementations
- **Multiple Routing Options**: Choose between ID, event type, or content-based routing
- **Simplified Server Code**: Use whatever message format works best for your system
- **Better Performance**: Optimized listener approach reduces overhead
- **Universal Compatibility**: Works with any SSE implementation

### Example Mercure Integration

```html
<!-- Connect to Mercure hub -->
<div hx-ext="sse" sse-connect="https://your-mercure-hub.example.com/.well-known/mercure?topic=user-updates">
  <div sse-swap="id:user-123-update,id:user-456-update">
    <!-- Updates when specific user messages are received -->
  </div>
</div>
```

### Example Traditional SSE Integration

```html
<!-- Connect to traditional SSE endpoint -->
<div hx-ext="sse" sse-connect="/events">
  <div sse-swap="type:notification,type:alert">
    <!-- Updates when notification or alert events are received -->
  </div>
</div>
```

## Migration from Event-Based SSE

If you're migrating from the standard [HTMX SSE extension](https://htmx.org/extensions/server-sent-events/):

### Before (Event-based only)

```html
<div sse-swap="user-update">
```

Server sends:

```
event: user-update
data: <div>User content</div>
```

### After (Flexible filtering)

```html
<!-- Use event type filtering -->
<div sse-swap="type:user-update">

<!-- Or use ID-based filtering (Mercure style) -->
<div sse-swap="id:user-update">

<!-- Or use backward compatible format -->
<div sse-swap="user-update">
```

Server can send either format:

```
event: user-update
data: <div>User content</div>
```

Or:

```
id: user-update  
data: <div>User content</div>
```

## Browser Compatibility

- All modern browsers that support Server-Sent Events
- Internet Explorer is not supported (no SSE support)
- Requires [HTMX](https://htmx.org/) 1.8.0 or later

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This extension follows the same license as [HTMX](https://htmx.org/).

## Useful Links

- **[HTMX Official Website](https://htmx.org/)** - Main HTMX documentation
- **[HTMX SSE Extension](https://htmx.org/extensions/server-sent-events/)** - Original event-based SSE extension
- **[Mercure Official Website](https://mercure.rocks/)** - Real-time communication protocol
- **[Mercure Documentation](https://mercure.rocks/docs/getting-started)** - Getting started with Mercure
- **[Symfony MercureBundle](https://symfony.com/bundles/MercureBundle/current/index.html)** - Symfony integration

## Troubleshooting

### Common Issues

**Messages not being received:**

- Check that your filter format matches your server's message format
- For ID filtering: ensure server sends `id:` fields
- For event type filtering: ensure server sends `event:` fields
- Verify the SSE endpoint is accessible
- Check browser developer tools for connection errors

**Event type filtering not working:**

- Ensure your server sends proper `event:` fields
- Use `type:` prefix in your filter: `sse-swap="type:notification"`
- Check that the event type name matches exactly

**Multiple connections:**

- Ensure you're not calling `sse-connect` on multiple nested elements
- Use browser dev tools to monitor EventSource connections

**Memory leaks:**

- The extension automatically cleans up connections when elements are removed
- Manually close connections if needed using the `sse-close` attribute

### Debug Mode

Enable [HTMX](https://htmx.org/) logging to see SSE events:

```html
<script>
htmx.logger = function(elt, event, data) {
  if(console) {
    console.log("HTMX:", event, elt, data);
  }
}
</script>
```
