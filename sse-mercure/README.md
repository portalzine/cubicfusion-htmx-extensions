# HTMX Server-Sent Events (SSE) Extension - ID-Based

A modified version of the [HTMX](https://htmx.org/) SSE extension that uses message **IDs** instead of event types for routing Server-Sent Events messages. This modification was specifically created for seamless integration with **[Mercure](https://mercure.rocks/)**, the real-time communication protocol.

## Overview

This extension enables [HTMX](https://htmx.org/) to work with Server-Sent Events (SSE) by filtering messages based on their `id` field rather than the `event` field. This approach is particularly well-suited for **[Mercure](https://mercure.rocks/)**, which primarily uses message IDs for routing and doesn't rely on event types.

The modification provides:

- **Mercure Compatibility**: Direct support for Mercure's ID-based message routing
- **Better Performance**: Single message listener instead of multiple event-specific listeners
- **Flexible Message Handling**: Unique identifier-based message routing
- **Type-Based Data Transformation**: Process messages differently based on their type field

## Key Differences from Standard HTMX SSE Extension

- **[Mercure](https://mercure.rocks/) Integration**: Designed specifically to work with Mercure's ID-based message routing
- **ID-Based Routing**: Messages are filtered by their `id` field (`event.lastEventId`) instead of event types
- **Single Message Listener**: Uses one `'message'` event listener per element instead of multiple event-specific listeners
- **Better Performance**: Reduced number of event listeners for complex applications with many SSE message types
- **Type-Based Processing**: Transform message content based on Mercure's `type` field before swapping

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

### Triggering Actions with hx-trigger

```html
<div hx-ext="sse" sse-connect="/events">
  <button hx-get="/refresh" hx-trigger="sse:refresh-signal">
    <!-- Button will be triggered when a message with id="refresh-signal" is received -->
    Refresh Data
  </button>
</div>
```

### Auto-closing Connections

```html
<div hx-ext="sse" sse-connect="/events" sse-close="stream-end">
  <!-- Connection will close when a message with id="stream-end" is received -->
</div>
```

### Type-Based Data Transformation

The extension supports transforming message data based on Mercure's `type` field before it's swapped into the DOM. This allows you to process different types of messages differently.

```javascript
// Override the default transformation function
htmx.transformSSEData = function(data, type, element) {
    if (type === 'user-update') {
        // Wrap user updates with special styling
        return '<div class="user-update animate-pulse">' + data + '</div>';
    } else if (type === 'notification') {
        // Add notification styling and icons
        return '<div class="notification alert-info"><i class="icon-bell"></i>' + data + '</div>';
    } else if (type === 'error') {
        // Style error messages differently
        return '<div class="alert alert-danger">' + data + '</div>';
    }
    // Return unchanged for unknown types or no type
    return data;
};
```

This transformation happens automatically when:

- The SSE message includes a `type` field (as per Mercure specification)
- The `type` field is not empty
- The transformation occurs before HTMX swaps the content

## Server-Side Implementation

Your server should send SSE messages with `id` fields. This format is native to **Mercure** and other ID-based SSE systems.

### Mercure Example with Type

```bash
# Publish to Mercure hub with type
curl -X POST 'https://your-mercure-hub.example.com/.well-known/mercure' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'topic=user-updates' \
  -d 'id=user-123-update' \
  -d 'type=user-update' \
  -d 'data=<div class="user">John Doe - Online</div>'
```

Learn more about [Mercure's publish API](https://mercure.rocks/docs/hub/publish).

### Example Server Response

```
id: user-update
type: user-update
data: <div class="user">John Doe - Online</div>

id: notification
type: notification
data: <div class="alert">New message received!</div>

id: error-123
type: error
data: Something went wrong!

id: refresh-signal
data: trigger

id: stream-end
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
            'user-123-update', // This becomes the message ID
            'user-update'      // This becomes the message type
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

  // Send user update with type
  res.write(`id: user-update\n`);
  res.write(`type: user-update\n`);
  res.write(`data: <div class="user">John Doe - Online</div>\n\n`);

  // Send notification with type
  res.write(`id: notification\n`);
  res.write(`type: notification\n`);
  res.write(`data: <div class="alert">New message!</div>\n\n`);
});
```

### Python Flask Example

```python
from flask import Flask, Response
import json

@app.route('/events')
def events():
    def generate():
        yield f"id: user-update\ntype: user-update\ndata: <div class='user'>Jane Doe - Online</div>\n\n"
        yield f"id: notification\ntype: notification\ndata: <div class='alert'>Welcome!</div>\n\n"

    return Response(generate(), mimetype='text/event-stream')
```

## API Reference

### Attributes

| Attribute            | Description                                                           | Example                     |
| -------------------- | --------------------------------------------------------------------- | --------------------------- |
| `sse-connect`        | Establishes SSE connection to specified URL                           | `sse-connect="/events"`     |
| `sse-swap`           | Comma-separated list of message IDs that will replace element content | `sse-swap="update,refresh"` |
| `sse-close`          | Message ID that will close the SSE connection                         | `sse-close="stream-end"`    |
| `hx-trigger="sse:*"` | Triggers HTMX actions when message with specified ID is received      | `hx-trigger="sse:reload"`   |

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

// Transform SSE data based on type (can be overridden)
htmx.transformSSEData = function(data, type, element) {
  // Custom transformation logic here
  return data;
};

// Listen to SSE events
document.addEventListener('htmx:sseOpen', function(evt) {
  console.log('SSE connection opened', evt.detail.source);
});

document.addEventListener('htmx:sseMessage', function(evt) {
  console.log('SSE message received with ID:', evt.detail.lastEventId);
});
```

## Advanced Features

### Reconnection Handling

The extension automatically handles reconnections with exponential backoff:

- Initial retry: 500ms
- Maximum retry interval: 64 seconds
- Automatic cleanup of orphaned connections

### Multiple Message Types

```html
<div hx-ext="sse" sse-connect="/events">
  <div sse-swap="chat-message,user-joined,user-left">
    <!-- Responds to multiple message IDs -->
  </div>
</div>
```

### Nested SSE Elements

```html
<div hx-ext="sse" sse-connect="/events">
  <div sse-swap="header-update">Header content</div>
  <div sse-swap="body-update">Body content</div>
  <div sse-swap="footer-update">Footer content</div>
</div>
```

## Why This Modification?

This extension was specifically modified to work seamlessly with **[Mercure](https://mercure.rocks/)**, a modern real-time communication protocol. Key reasons for the change:

### Mercure's Architecture

- **Topic-based subscriptions**: [Mercure](https://mercure.rocks/) uses topics for subscriptions, not event types
- **ID-based message routing**: Messages are identified by unique IDs rather than event names
- **RESTful approach**: Follows REST principles with URL-based topic subscriptions
- **Type support**: [Mercure specification](https://mercure.rocks/spec#publication) includes optional `type` field for message classification

### Benefits for Mercure Users

- **Direct Integration**: No need for additional mapping between Mercure IDs and [HTMX](https://htmx.org/) events
- **Simplified Server Code**: [Mercure](https://mercure.rocks/) naturally provides message IDs and types
- **Better Performance**: Single listener approach reduces overhead
- **Type-Aware Processing**: Leverage Mercure's type field for intelligent content transformation
- **Natural Fit**: Aligns with [Mercure's design philosophy](https://mercure.rocks/docs/getting-started)

### Example Mercure Integration

```html
<!-- Connect to Mercure hub -->
<div hx-ext="sse" sse-connect="https://your-mercure-hub.example.com/.well-known/mercure?topic=user-updates">
  <div sse-swap="user-123-update,user-456-update">
    <!-- Updates when specific user messages are received -->
    <!-- Content will be transformed based on message type -->
  </div>
</div>
```

## Migration from Event-Based SSE

If you're migrating from the standard [HTMX SSE extension](https://htmx.org/extensions/server-sent-events/) or transitioning to [Mercure](https://mercure.rocks/):

### Before (Event-based)

```
event: user-update
data: <div>User content</div>
```

### After (ID-based with optional type)

```
id: user-update
type: user-update
data: <div>User content</div>
```

The HTML attributes remain the same, only the server-side message format changes.

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
- **[Mercure Specification](https://mercure.rocks/spec#publication)** - Technical specification including type field
- **[Symfony MercureBundle](https://symfony.com/bundles/MercureBundle/current/index.html)** - Symfony integration

## Troubleshooting

### Common Issues

**Messages not being received:**

- Check that your server is sending `id:` fields, not `event:` fields
- Verify the SSE endpoint is accessible
- Check browser developer tools for connection errors

**Type transformation not working:**

- Ensure your server is sending the `type:` field in SSE messages
- Verify your `htmx.transformSSEData` function is correctly defined
- Check that the type field is not empty or whitespace-only

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
