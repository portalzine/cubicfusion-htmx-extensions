/*
SSE-MERCURE (Unrestricted Version)
A modified version of the HTMX SSE extension that removes event type restrictions and supports flexible message routing.
Supports routing by message IDs, event types, or processing all messages.
*/

(function() {
  /** @type {import("../htmx").HtmxInternalApi} */
  var api

  htmx.defineExtension('sse', {

    /**
     * Init saves the provided reference to the internal HTMX API.
     *
     * @param {import("../htmx").HtmxInternalApi} api
     * @returns void
     */
    init: function(apiRef) {
      // store a reference to the internal API.
      api = apiRef

      // set a function in the public API for creating new EventSource objects
      if (htmx.createEventSource == undefined) {
        htmx.createEventSource = createEventSource
      }
    },

    getSelectors: function() {
      return ['[sse-connect]', '[data-sse-connect]', '[sse-swap]', '[data-sse-swap]']
    },

    /**
     * onEvent handles all events passed to this extension.
     *
     * @param {string} name
     * @param {Event} evt
     * @returns void
     */
    onEvent: function(name, evt) {
      var parent = evt.target || evt.detail.elt
      switch (name) {
        case 'htmx:beforeCleanupElement':
          var internalData = api.getInternalData(parent)
          // Try to remove remove an EventSource when elements are removed
          var source = internalData.sseEventSource
          if (source) {
            api.triggerEvent(parent, 'htmx:sseClose', {
              source,
              type: 'nodeReplaced',
            })
            internalData.sseEventSource.close()
          }

          return

        // Try to create EventSources when elements are processed
        case 'htmx:afterProcessNode':
          ensureEventSourceOnElement(parent)
      }
    }
  })

  /// ////////////////////////////////////////////
  // HELPER FUNCTIONS
  /// ////////////////////////////////////////////

  /**
   * createEventSource is the default method for creating new EventSource objects.
   * it is hoisted into htmx.config.createEventSource to be overridden by the user, if needed.
   *
   * @param {string} url
   * @returns EventSource
   */
  function createEventSource(url) {
    return new EventSource(url, { withCredentials: true })
  }

  /**
   * registerSSE looks for attributes that can contain sse events, right
   * now hx-trigger and sse-swap and adds listeners based on these attributes too
   * the closest event source
   *
   * @param {HTMLElement} elt
   */
  function registerSSE(elt) {
    // Add message handlers for every `sse-swap` attribute
    if (api.getAttributeValue(elt, 'sse-swap')) {
      // Find closest existing event source
      var sourceElement = api.getClosestMatch(elt, hasEventSource)
      if (sourceElement == null) {
        // api.triggerErrorEvent(elt, "htmx:noSSESourceError")
        return null // no eventsource in parentage, orphaned element
      }

      // Set internalData and source
      var internalData = api.getInternalData(sourceElement)
      var source = internalData.sseEventSource

      var sseSwapAttr = api.getAttributeValue(elt, 'sse-swap')
      
      // Create a single message listener that handles flexible message routing
      const messageListener = function(event) {
        // If the source is missing then close SSE
        if (maybeCloseSSESource(sourceElement)) {
          return
        }

        // If the body no longer contains the element, remove the listener
        if (!api.bodyContains(elt)) {
          source.removeEventListener('message', messageListener)
          return
        }

        var shouldProcess = false

        // Check if we should process all messages (wildcard or empty)
        if (sseSwapAttr === '*' || sseSwapAttr.trim() === '') {
          shouldProcess = true
        } else {
          // Parse the swap attribute for specific filters
          var sseEventFilters = sseSwapAttr.split(',')
          var messageId = event.lastEventId || ''
          var eventType = event.type || 'message'

          for (var i = 0; i < sseEventFilters.length; i++) {
            var filter = sseEventFilters[i].trim()
            
            // Check for ID-based routing (id:value)
            if (filter.startsWith('id:')) {
              var targetId = filter.substring(3)
              if (messageId === targetId) {
                shouldProcess = true
                break
              }
            }
            // Check for event type routing (type:value)
            else if (filter.startsWith('type:')) {
              var targetType = filter.substring(5)
              if (eventType === targetType) {
                shouldProcess = true
                break
              }
            }
            // Check for data content matching (data:value)
            else if (filter.startsWith('data:')) {
              var targetData = filter.substring(5)
              if (event.data && event.data.includes(targetData)) {
                shouldProcess = true
                break
              }
            }
            // Backward compatibility: treat bare values as message IDs
            else if (messageId === filter) {
              shouldProcess = true
              break
            }
          }
        }

        if (!shouldProcess) {
          return
        }

        // swap the response into the DOM and trigger a notification
        if (!api.triggerEvent(elt, 'htmx:sseBeforeMessage', event)) {
          return
        }
        swap(elt, event.data)
        api.triggerEvent(elt, 'htmx:sseMessage', event)
      }

      // Register the message listener
      api.getInternalData(elt).sseEventListener = messageListener
      source.addEventListener('message', messageListener)

      // Also listen for all event types, not just 'message'
      registerEventTypeListeners(source, messageListener, elt)
    }

    // Add message handlers for every `hx-trigger="sse:*"` attribute
    if (api.getAttributeValue(elt, 'hx-trigger')) {
      // Find closest existing event source
      var sourceElement = api.getClosestMatch(elt, hasEventSource)
      if (sourceElement == null) {
        // api.triggerErrorEvent(elt, "htmx:noSSESourceError")
        return null // no eventsource in parentage, orphaned element
      }

      // Set internalData and source
      var internalData = api.getInternalData(sourceElement)
      var source = internalData.sseEventSource

      var triggerSpecs = api.getTriggerSpecs(elt)
      var sseTriggersFilters = []
      
      // Collect all SSE trigger filters
      triggerSpecs.forEach(function(ts) {
        if (ts.trigger.slice(0, 4) === 'sse:') {
          sseTriggersFilters.push({
            filter: ts.trigger.slice(4),
            triggerSpec: ts
          })
        }
      })

      if (sseTriggersFilters.length > 0) {
        // Create a single message listener for all SSE triggers
        var listener = function (event) {
          if (maybeCloseSSESource(sourceElement)) {
            return
          }
          if (!api.bodyContains(elt)) {
            source.removeEventListener('message', listener)
            return
          }

          var messageId = event.lastEventId || ''
          var eventType = event.type || 'message'
          
          sseTriggersFilters.forEach(function(triggerInfo) {
            var filter = triggerInfo.filter
            var shouldTrigger = false

            // Handle wildcard or empty filter
            if (filter === '*' || filter === '') {
              shouldTrigger = true
            }
            // Handle ID-based filtering
            else if (filter.startsWith('id:')) {
              var targetId = filter.substring(3)
              shouldTrigger = (messageId === targetId)
            }
            // Handle event type filtering
            else if (filter.startsWith('type:')) {
              var targetType = filter.substring(5)
              shouldTrigger = (eventType === targetType)
            }
            // Handle data content filtering
            else if (filter.startsWith('data:')) {
              var targetData = filter.substring(5)
              shouldTrigger = (event.data && event.data.includes(targetData))
            }
            // Backward compatibility: treat bare values as message IDs
            else {
              shouldTrigger = (messageId === filter)
            }

            if (shouldTrigger) {
              // Trigger events to be handled by the rest of htmx
              htmx.trigger(elt, triggerInfo.triggerSpec.trigger, event)
              htmx.trigger(elt, 'htmx:sseMessage', event)
            }
          })
        }

        // Register the new listener
        api.getInternalData(elt).sseEventListener = listener
        source.addEventListener('message', listener)

        // Also listen for all event types
        registerEventTypeListeners(source, listener, elt)
      }
    }
  }

  /**
   * Register event listeners for common SSE event types
   * @param {EventSource} source 
   * @param {Function} listener 
   * @param {HTMLElement} elt 
   */
  function registerEventTypeListeners(source, listener, elt) {
    // Get all configured event types from the element's attributes
    var configuredEventTypes = getConfiguredEventTypes(elt)
    
    // Add common SSE event types
    var commonEventTypes = ['open', 'error', 'ping', 'update', 'notification', 'heartbeat', 'close']
    
    // Combine and deduplicate
    var allEventTypes = Array.from(new Set(configuredEventTypes.concat(commonEventTypes)))
    
    allEventTypes.forEach(function(eventType) {
      if (eventType !== 'message') { // 'message' is handled separately
        source.addEventListener(eventType, function(event) {
          // Create a modified event object with the correct type
          var modifiedEvent = {
            data: event.data || '',
            lastEventId: event.lastEventId || '',
            type: eventType,
            origin: event.origin || '',
            source: event.source || null,
            target: event.target || null,
            timeStamp: event.timeStamp || Date.now()
          }
          listener(modifiedEvent)
        })
      }
    })
  }

  /**
   * Extract event types mentioned in element's SSE attributes
   * @param {HTMLElement} elt 
   * @returns {Array<string>}
   */
  function getConfiguredEventTypes(elt) {
    var eventTypes = []
    
    // Check sse-swap attribute
    var sseSwapAttr = api.getAttributeValue(elt, 'sse-swap')
    if (sseSwapAttr) {
      var filters = sseSwapAttr.split(',')
      filters.forEach(function(filter) {
        filter = filter.trim()
        if (filter.startsWith('type:')) {
          eventTypes.push(filter.substring(5))
        }
      })
    }
    
    // Check hx-trigger attribute for sse: triggers
    var triggerSpecs = api.getTriggerSpecs(elt)
    if (triggerSpecs) {
      triggerSpecs.forEach(function(ts) {
        if (ts.trigger.slice(0, 4) === 'sse:') {
          var filter = ts.trigger.slice(4)
          if (filter.startsWith('type:')) {
            eventTypes.push(filter.substring(5))
          }
        }
      })
    }
    
    // Check sse-close attribute
    var closeAttr = api.getAttributeValue(elt, 'sse-close')
    if (closeAttr && closeAttr.startsWith('type:')) {
      eventTypes.push(closeAttr.substring(5))
    }
    
    return eventTypes
  }

  /**
   * ensureEventSourceOnElement creates a new EventSource connection on the provided element.
   * If a usable EventSource already exists, then it is returned.  If not, then a new EventSource
   * is created and stored in the element's internalData.
   * @param {HTMLElement} elt
   * @param {number} retryCount
   * @returns {EventSource | null}
   */
  function ensureEventSourceOnElement(elt, retryCount) {
    if (elt == null) {
      return null
    }

    // handle extension source creation attribute
    if (api.getAttributeValue(elt, 'sse-connect')) {
      var sseURL = api.getAttributeValue(elt, 'sse-connect')
      if (sseURL == null) {
        return
      }

      ensureEventSource(elt, sseURL, retryCount)
    }

    registerSSE(elt)
  }

  function ensureEventSource(elt, url, retryCount) {
    var source = htmx.createEventSource(url)

    source.onerror = function(err) {
      // Log an error event
      api.triggerErrorEvent(elt, 'htmx:sseError', { error: err, source })

      // If parent no longer exists in the document, then clean up this EventSource
      if (maybeCloseSSESource(elt)) {
        return
      }

      // Otherwise, try to reconnect the EventSource
      if (source.readyState === EventSource.CLOSED) {
        retryCount = retryCount || 0
        retryCount = Math.max(Math.min(retryCount * 2, 128), 1)
        var timeout = retryCount * 500
        window.setTimeout(function() {
          ensureEventSourceOnElement(elt, retryCount)
        }, timeout)
      }
    }

    source.onopen = function(evt) {
      api.triggerEvent(elt, 'htmx:sseOpen', { source })

      if (retryCount && retryCount > 0) {
        const childrenToFix = elt.querySelectorAll("[sse-swap], [data-sse-swap], [hx-trigger], [data-hx-trigger]")
        for (let i = 0; i < childrenToFix.length; i++) {
          registerSSE(childrenToFix[i])
        }
        // We want to increase the reconnection delay for consecutive failed attempts only
        retryCount = 0
      }
    }

    api.getInternalData(elt).sseEventSource = source

    var closeAttribute = api.getAttributeValue(elt, "sse-close");
    if (closeAttribute) {
      // close eventsource when condition is met
      const closeListener = function(event) {
        var shouldClose = false
        var messageId = event.lastEventId || ''
        var eventType = event.type || 'message'

        // Handle different close conditions
        if (closeAttribute === '*') {
          shouldClose = true // Close on any message
        } else if (closeAttribute.startsWith('id:')) {
          var targetId = closeAttribute.substring(3)
          shouldClose = (messageId === targetId)
        } else if (closeAttribute.startsWith('type:')) {
          var targetType = closeAttribute.substring(5)
          shouldClose = (eventType === targetType)
        } else if (closeAttribute.startsWith('data:')) {
          var targetData = closeAttribute.substring(5)
          shouldClose = (event.data && event.data.includes(targetData))
        } else {
          // Backward compatibility: treat as message ID
          shouldClose = (messageId === closeAttribute)
        }

        if (shouldClose) {
          api.triggerEvent(elt, 'htmx:sseClose', {
            source,
            type: 'message',
          })
          source.close()
        }
      }
      
      source.addEventListener('message', closeListener)
      // Also listen for other event types for close conditions
      registerEventTypeListeners(source, closeListener, elt)
    }
  }

  /**
   * maybeCloseSSESource confirms that the parent element still exists.
   * If not, then any associated SSE source is closed and the function returns true.
   *
   * @param {HTMLElement} elt
   * @returns boolean
   */
  function maybeCloseSSESource(elt) {
    if (!api.bodyContains(elt)) {
      var source = api.getInternalData(elt).sseEventSource
      if (source != undefined) {
        api.triggerEvent(elt, 'htmx:sseClose', {
          source,
          type: 'nodeMissing',
        })
        source.close()
        // source = null
        return true
      }
    }
    return false
  }

  /**
   * @param {HTMLElement} elt
   * @param {string} content
   */
  function swap(elt, content) {
    api.withExtensions(elt, function(extension) {
      content = extension.transformResponse(content, elt)
    })

    var swapSpec = api.getSwapSpecification(elt)
    var target = api.getTarget(elt)
    api.swap(target, content, swapSpec, { contextElement: elt })
  }

  function hasEventSource(node) {
    return api.getInternalData(node).sseEventSource != null
  }
})()