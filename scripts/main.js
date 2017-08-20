(function () {

    /**
     * Actions to be done when the page loads
     */
     window.addEventListener('load', function() {
        loadDeferredStyles();

        var form = document.querySelector('form');
        document.querySelector('.chat-info-counters-messages').querySelector('span').textContent = 0;

        logIn();

        makeGrowable(document.querySelector('.expanding-textarea'));

        sendChatMessage(form);
    });

    /**
     * Actions to be done before page is unloaded
     */
    window.addEventListener('beforeunload', function() {
        var form = document.querySelector('form');
        navigator.sendBeacon(form.action + 'logout'); // send logout message to server (so that it can update the users counter)
    });

    function loadDeferredStyles() {
        var addStylesNode = document.querySelector("#deferred-styles");
        var replacement = document.createElement("div");
        replacement.innerHTML = addStylesNode.textContent;
        document.body.appendChild(replacement)
        addStylesNode.parentElement.removeChild(addStylesNode);
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

    function logIn() {
        var localUser = getLocalStorage();
        var form = document.querySelector('form');
        if (typeof(Storage) === 'undefined' || localUser === null) { // Code for localStorage + getting the username
            var modal = document.querySelector('.modal-overlay');
            modal.style.display = 'block';
            var modalConfirm = modal.querySelector('.confirm').addEventListener('click', function() {
                register(new UserInfo(document.querySelector('#name').value, document.querySelector('#email').value));
                document.querySelector('.modal-overlay').style.display = 'none';
                getStats(setStats);
                getMessages(0, handleMessages);
            });
            var modalDiscard = modal.querySelector('.discard').addEventListener('click', function() {
                register(new UserInfo('', ''));
                document.querySelector('.modal-overlay').style.display = "none";
                getStats(setStats);
                getMessages(0, handleMessages);
            });
        } else {
            var currentMessage = localUser.currentMessage;
            register(new UserInfo(localUser.userInfo.name, localUser.userInfo.email));
            var localStorage = getLocalStorage();
            setLocalStorage(localStorage.userInfo, currentMessage);
            document.querySelector('.modal-overlay').style.display = "none";
            form.elements[0].value = localUser.currentMessage;
            getStats(setStats);
            getMessages(0, handleMessages);
        }
    }

    /**
     * Registers the user and updated the server about the newly signed in user
     * @param {UserInfo} userInfo 
     */
    function register(userInfo) {
        var form = document.querySelector("form");
        setLocalStorage(userInfo, '');
        sendRequestToServer('GET', form.action + 'login', null,
        function(e) {
            var userId = e.id;
            document.querySelector('.modal-overlay').style.display = "none";
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
     * Send request to server for the next available message
     * ___________________________________________________________________________________
     * |----------------------------------- Important -----------------------------------|
     * |_________________________________________________________________________________|
     * |Note: Due to the lack of explanation in the requirements document,               |
     * |      I implemented this method such that it retrives only one message at a time |
     * |_________________________________________________________________________________|
     * @param {Number} counter 
     * @param {Function} callback 
     */
    function getMessages(counter, callback) {
        form = document.querySelector('form');
        sendRequestToServer('GET', form.action + 'messages?counter=' + counter, null,
        function(e) {
            callback(counter, e);
        }, function() {
            getMessages(counter, callback);
        });
    }

    /**
     * This method is in charge of handling new messages received from server
     * @param {Number} counter - the previous number of messages
     * @param {Array} messagesList - the received message list
     */
    function handleMessages(counter, messagesList)  {
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
        getStats(setStats);
        getMessages(Math.max(counter + addedMessages, 0), handleMessages);
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
            addDeleteMessage(id);
    }

    function addDeleteMessage(id) {
        var messageHeader = document.querySelector('#message_' + id + ' header');
        var delButton = document.querySelector('#message_' + id + ' header button');
        
        if (typeof(messageHeader) === 'undefined' || messageHeader === null || delButton !== null)
            return;

        var div = document.querySelector('#message_' + id + ' .message-body');
        var del = document.createElement("button");

        del.setAttribute("tabIndex", "0");
        del.setAttribute("aria-label", "Delete message #" + id);
        del.addEventListener("focusout", function() {
            del.style.display = "none";
        });

        del.addEventListener("click", function() {
            deleteMessage(id, function(e) { });
        });

        div.addEventListener("focusin", function() {
            del.style.display = "inline";
        });

        div.addEventListener("mouseenter", function() {
            del.style.display = "inline";
        });

        div.addEventListener("mouseleave", function() {
            del.style.display = "none";
        });

        messageHeader.appendChild(del);
    }

    function postMessage(message, callback) {
        form = document.querySelector('form');
        sendRequestToServer('POST', form.action + 'messages', message,
        function(e) {
            addDeleteMessage(e.id);
        }, function() {
            postMessage(message, callback);
        });
    }

    function deleteMessage(id, callback) {
        form = document.querySelector('form');
        sendRequestToServer('DELETE', form.action + 'messages/' + id, null, callback, function() {
            deleteMessage(id, callback)
        });
    }

    function getStats(callback) {
        form = document.querySelector('form');
        sendRequestToServer('GET', form.action + 'stats', null,
        function(e) {
            callback(e.users, e.messages);
        }, function() {
            getStats(callback);
        });
    }

    function setStats(users, messages) {
        document.querySelector('.users-counter').textContent = users;
        document.querySelector('.messages-counter').textContent = messages;
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
        xhr.open(method, action);
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
            var message = {
                name: localUser.userInfo.name,
                email: localUser.userInfo.email,
                message: form.elements[0].value,
                timestamp: Date.now()
            }
            
            postMessage(message, addNewMessage);
            form.elements[0].value = '';
            var clone = form.querySelector('span');
            clone.textContent = '';
            setLocalStorage(localUser.userInfo, '');
        });
    }
}(window.Babble));    
