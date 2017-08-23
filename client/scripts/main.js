window.Babble = {
    messages: [],

    /**
     * Registers the user and updated the server about the newly signed in user
     * @param {UserInfo} userInfo 
     */
    register: function(userInfo) {
        setLocalStorage(userInfo, '');
    },

    /**
     * Send request to server for the next available message
     * @param {Number} counter 
     * @param {Function} callback 
     */
    getMessages: function(counter, callback) {
        sendRequestToServer('GET', 'messages?counter=' + counter, null,
        function(e) {
            var addedMessages = callback(e);
            Babble.addDeleteButton();
            Babble.getStats(setStats);
            Babble.getMessages(Math.max(counter + addedMessages, 0), handleMessages);
        }, function() {
            Babble.getMessages(counter, callback);
        });
    },

    /**
     * Posts a new message to the server
     * @param {Object} message - the message to be added
     * @param {Function} callback - the function to be done when action complete
     */
    postMessage: function(message, callback) {
        sendRequestToServer('POST', 'messages', message,
        function(e) {
            callback(e);
        }, function() {
            Babble.postMessage(message, callback);
        });
    },

    /**
     * Deletes a message with the given id from the server
     * @param {String} id - the id of the message to be deleted
     * @param {Function} callback - the function to be called when message was deleted
     */
    deleteMessage: function(id, callback) {
        sendRequestToServer('DELETE', 'messages/' + id, null, callback, function() {
            Babble.deleteMessage(id, callback)
        });
    },

    /**
     * This methods receives the stats of the chat room (# of users and # of messages) from the server
     * @param {Function} callback - the function to be called when the action is complete
     */
    getStats: function(callback) {
        sendRequestToServer('GET', 'stats', null,
        function(e) {
            callback(e);
        }, function() {
            Babble.getStats(callback);
        });
    },

    addSentByAnonymous: function(messageId) {
        if (getLocalStorage().userInfo.name === '')
            Babble.messages.push(messageId);
    },

    addDeleteButton: function() {
        for (var i = Babble.messages.length - 1; i >= 0; i--) {
            if (addDeleteMessage(Babble.messages[i]) === true) {
                Babble.messages.splice(i, 1);
            }
        }
    }
};

/**
 * Actions to be done when the page loads
 */
window.addEventListener('load', function() {
    loadDeferredStyles();

    var form = document.querySelector('.js-growable');

    logIn(form);

    makeGrowable(document.querySelector('.expanding-textarea'));

    sendChatMessage(form);
});

/**
 * Actions to be done before page is unloaded
 */
window.addEventListener('beforeunload', function() {
    var form = document.querySelector('.js-growable');
    navigator.sendBeacon(form.action + 'logout'); // send logout message to server (so that it can update the users counter)
});

function loadDeferredStyles() {
    var addStylesNode = document.querySelector("#deferred-styles");
    var replacement = document.createElement("div");
    replacement.innerHTML = addStylesNode.textContent;
    document.body.appendChild(replacement)
    addStylesNode.parentElement.removeChild(addStylesNode);
}

/**
 * Gets the saved babble item from local storage: babble = { currentMessage, userInfo }
 * @returns returns the babble item from local storage
 */
function getLocalStorage() {
    return JSON.parse(localStorage.getItem("babble"));
}

/**
 * Saves the user's info and current message into local storage
 * @param {UserInfo} userInfo - the user's info (name + email)
 * @param {String} message - the current message
 */
function setLocalStorage(userInfo, message) {
    var user = {
        currentMessage: message,
        userInfo: userInfo
    };
    localStorage.setItem("babble", JSON.stringify(user));
}

// Based on: link sent on slack and on https://alistapart.com/article/expanding-text-areas-made-elegant
function makeGrowable(container) {
    if (container != null) {
        var area = container.querySelector('textarea');
        var clone = container.querySelector('span');
        area.addEventListener('input', function(e) {
            clone.textContent = area.value;
            setLocalStorage(getLocalStorage().userInfo, area.value);
        });
    }
}

/**
 * Constructor of the UserInfo type: UserInfo = { name, email }
 * @param {String} name - the name of the user
 * @param {String} email - the email of the user
 */
function UserInfo(name, email) {
    this.name = name;
    this.email = email;
}

function logIn(form) {
    var localUser = getLocalStorage();
    if (typeof(localUser) === 'undefined' || localUser === null) { // Code for localStorage + getting the username
        var modal = document.querySelector('.modal-overlay');
        modal.style.display = 'block';
        modal.style.visibility = 'visible';
        var modalConfirm = modal.querySelector('.confirm').addEventListener('click', function() {
            register(new UserInfo(document.querySelector('#name').value, document.querySelector('#email').value));
            document.querySelector('.modal-overlay').style.display = 'none';
            document.querySelector('.modal-overlay').style.visibility = 'hidden';
            Babble.getStats(setStats);
            Babble.getMessages(0, handleMessages);
        });
        var modalDiscard = modal.querySelector('.discard').addEventListener('click', function() {
            register(new UserInfo('', ''));
            document.querySelector('.modal-overlay').style.display = 'none';
            document.querySelector('.modal-overlay').style.visibility = 'hidden';
            Babble.getStats(setStats);
            Babble.getMessages(0, handleMessages);
        });
    } else {
        var currentMessage = localUser.currentMessage;
        register(new UserInfo(localUser.userInfo.name, localUser.userInfo.email));
        var localStorage = getLocalStorage();
        setLocalStorage(localStorage.userInfo, currentMessage);
        document.querySelector('.modal-overlay').style.display = 'none';
        document.querySelector('.modal-overlay').style.visibility = 'hidden';
        form.elements[0].value = localUser.currentMessage;
        Babble.getStats(setStats);
        Babble.getMessages(0, handleMessages);
    }
}

/**
 * Registers the user and updated the server about the newly signed in user
 * @param {UserInfo} userInfo 
 */
function register(userInfo) {
    var form = document.querySelector("form");
    Babble.register(userInfo);
    sendRequestToServer('GET', 'login', null,
    function(e) {
        var userId = e.id;
        document.querySelector('.modal-overlay').style.display = 'none';
        document.querySelector('.modal-overlay').style.visibility = 'hidden';
    }, function() {
        register(userInfo);
    });
}


function Message(name, email, message, timestamp) {
    this.name = name;
    this.email = email;
    this.message = message;
    this.timestamp = timestamp;
}

/**
 * This method is in charge of handling new messages received from server
 * @param {Number} counter - the previous number of messages
 * @param {Array} messagesList - the received message list
 */
function handleMessages(messagesList)  {
    var addedMessages = 0;
    for (i = 0; i < messagesList.length; i++) {
        var message = messagesList[i];
        var messageElement = document.querySelector('#message_' + message.id);
        if (typeof(messageElement) === 'undefined' || messageElement === null) {
            addNewMessage(message.id, message.avatar, message.name, message.email, message.message, message.timestamp);
            addedMessages++;
        } else {
            messageElement.parentNode.removeChild(messageElement)
            addedMessages--;
        }
    }
    return addedMessages;
}

function addNewMessage(id, avatar, name, email, message, messageTime) {
    var dateTime = new Date(messageTime);
    var avatarUrl = avatar;

    if (avatarUrl === '')
        avatarUrl = '../images/anonymous.png'

    var ol = document.getElementById("messages-list");
    var li = document.createElement("li");
    var img = document.createElement("img");
    var div = document.createElement("div");
    var header = document.createElement("header");
    var cite = document.createElement("cite");
    var time = document.createElement("time");
    var p = document.createElement("p");
    var hours = dateTime.getHours().toString();
    var minutes = dateTime.getMinutes().toString();
    if (hours.length < 2)
        hours = '0' + hours;
    if (minutes.length < 2)
        minutes = '0' + minutes;

    img.setAttribute("class", "avatar");
    img.setAttribute("alt", "");
    img.setAttribute("src", avatarUrl);

    cite.textContent = name;

    time.innerHTML = hours + ':' + minutes;
    time.setAttribute("datetime", dateTime);

    header.setAttribute("class", "message-header");
    header.appendChild(cite);
    header.appendChild(time);

    p.textContent = message;

    div.setAttribute("tabIndex", "0");
    div.setAttribute("class", "message-body");
    div.appendChild(header);
    div.appendChild(p);

    li.setAttribute("id", 'message_' + id);
    li.setAttribute("class", "message");
    li.appendChild(img);
    li.appendChild(div);

    ol.appendChild(li);
    
    if (email !== '' && email === getLocalStorage().userInfo.email)
        addDeleteMessage({id: id});
}

function addDeleteMessage(messageId) {
    var id = messageId.id;

    var m = document.querySelector('#message_' + id);
    var messageHeader = document.querySelector('#message_' + id + ' header');
    var delButton = document.querySelector('#message_' + id + ' header button');

    if (typeof(messageHeader) === 'undefined' || messageHeader === null || delButton !== null)
        return false;

    var div = document.querySelector('#message_' + id + ' .message-body');
    var del = document.createElement("button");

    del.setAttribute("tabIndex", "0");
    del.setAttribute("aria-label", "Delete message #" + id);
    del.addEventListener("focusout", function() {
        del.style.display = "none";
        del.style.visibility = "hidden";
    });

    del.addEventListener("click", function() {
        Babble.deleteMessage(id, function(e) { });
    });

    div.addEventListener("focusin", function() {
        del.style.display = "inline";
        del.style.visibility = "visible";
    });

    div.addEventListener("mouseenter", function() {
        del.style.display = "inline";
        del.style.visibility = "visible";
    });

    div.addEventListener("mouseleave", function() {
        del.style.display = "none";
        del.style.visibility = "hidden";
    });

    messageHeader.appendChild(del);
    return true;
}

function setStats(chatInfo) {
    document.querySelector('.users-counter').textContent = chatInfo.users;
    document.querySelector('.messages-counter').textContent = chatInfo.messages;
}

/**
 * This method is in charge of sending a request to the server and initial handle of its response
 * @param {String} method - the method to be used to send to the server
 * @param {String} action - the action of the request (request's destination)
 * @param {Object} data - the data to be sent
 * @param {Function} callback - callback function to be called upon receiving the response
 */
function sendRequestToServer(method, action, data, callback, errorCallback) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, 'http://localhost:9000/' + action);
    if (method.toUpperCase() === 'POST') {
        xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    }
    xhr.addEventListener('load', function (e) {
        if (xhr.status == 200) {
            if (callback) {
                callback(JSON.parse(e.target.responseText));
            }
        } else {
            console.error('received the following status from server: ' + xhr.status);
            console.log('received the following status from server: ' + xhr.status);
        }
    });
    xhr.addEventListener('error', function (e) {
        if (errorCallback) {
            errorCallback();
        }
    });
    xhr.send(JSON.stringify(data));
}

function sendChatMessage(form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        var localUser = getLocalStorage();
        var username = localUser.userInfo.name;
        if (username === '')
            username = "Anonymous";
        var message = {
            name: username,
            email: localUser.userInfo.email,
            message: form.elements[0].value,
            timestamp: Date.now()
        }
        
        Babble.postMessage(message, Babble.addSentByAnonymous);
        form.elements[0].value = '';
        var clone = form.querySelector('span');
        clone.textContent = '';
        setLocalStorage(localUser.userInfo, '');
    });
}