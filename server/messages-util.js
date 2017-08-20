(function(global, factory) {
    'use strict';

    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        global.utils = factory();
    }
}(this, function() {
    var messages = [];
    var messageId = 0;
    var lastRequestedId = 0;
    return {
        getMessages: function(number) {
            var requiredMessages = []
            if (number < messages.length)
                requiredMessages.push(messages[number].message);
            /*for (var i = 0; i < Math.min(number + 1, messages.length); i++) {
                if (messages[i].id > lastRequestedId) {
                    requiredMessages.push({
                        name: messages[i].name,
                        email: messages[i].email,
                        avatar: messages[i].avatar,
                        message: messages[i].message,
                        timestamp: messages[i].timestamp
                    });
                    lastRequestedId = messages[i].id;
                }
            }*/
            return requiredMessages;
        },
        getMessagesId: function(number) {
            var requiredMessages = []
            if (number < messages.length)
                requiredMessages.push(messages[number].id);
            /*for (var i = 0; i < Math.min(number + 1, messages.length); i++) {
                if (messages[i].id > lastRequestedId) {
                    requiredMessages.push({
                        name: messages[i].name,
                        email: messages[i].email,
                        avatar: messages[i].avatar,
                        message: messages[i].message,
                        timestamp: messages[i].timestamp
                    });
                    lastRequestedId = messages[i].id;
                }
            }*/
            return requiredMessages;
        },
        addMessage: function(message) {
            messages.push({
                id: ++messageId,
                message: message
            });
            return messageId;
        },
        deleteMessage: function(id) {
            for (i = messages.length - 1; i >= 0; i--) {
                if (messages[i].id == id) {
                    messages.splice(i, 1);
                    return;
                }
            }
        },
        getMessagesCount: function() {
            return messages.length;
        }
    };
}));   