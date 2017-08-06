(function () {

     window.addEventListener("load", function() {
        var form = document.querySelector('form');
        document.querySelector(".chat-info-counters-messages").querySelector("span").textContent = 0;
        window.location.href = "http://Paradine181.github.io/babble/#/vegans";
        logIn();
        getStats(setStats);
        getMessages(0, addMessages);

        makeGrowable(document.querySelector('.js-growable'));

        sendChatMessage(form);

        //poll(0, form);
    });

    window.addEventListener('beforeunload', function() {
        var form = document.querySelector('form');
        navigator.sendBeacon(form.action + 'logout');
    });

    function UserInfo(name, email) {
        this.name = name;
        this.email = email;
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
            });
            var modalDiscard = modal.querySelector('.discard').addEventListener('click', function() {
                register(new UserInfo('', ''));
                document.querySelector('.modal-overlay').style.display = "none";
            });
        } else {
            var currentMessage = localUser.currentMessage;
            register(new UserInfo(localUser.userInfo.name, localUser.userInfo.email));
            var localStorage = getLocalStorage();
            setLocalStorage(localStorage.userInfo, currentMessage);
            document.querySelector('.modal-overlay').style.display = "none";
            form.elements[0].value = localUser.currentMessage;
        }
    }

    function register(userInfo) {
        console.log('register called');
        var form = document.querySelector("form");
        setLocalStorage(userInfo, '');
        sendRequestToServer('GET', form.action + 'login', null, function(e) {
            console.log('register received: ' + e);
            var userId = JSON.parse(e).id;
            document.querySelector('.modal-overlay').style.display = "none";
        });
    }

    function Message(name, email, message, timestamp) {
        this.name = name;
        this.email = email;
        this.message = message;
        this.timestamp = timestamp;
    }

    function getMessages(counter, callback) {
        console.log('counter is: ' + counter)
        form = document.querySelector('form');
        sendRequestToServer('GET', form.action + 'messages?counter=' + counter, null, function(e) {
            console.log('got message: ' + e);
            callback(counter, JSON.parse(e));
        });
    }

    function addMessages(counter, messagesList)  {
        console.log('addMessages: counter=' + counter + ' messagelist length=' + messagesList.length);
        for (i = 0; i < messagesList.length; i++) {
            var message = messagesList[i];
            console.log(JSON.stringify(message));
            addNewMessage(message.id, message.avatar, message.name, message.email, message.message, message.timestamp);
        }
        getMessages(counter + messagesList.length, addMessages);
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
        var del = document.createElement("button");
        var p = document.createElement("p");

        img.setAttribute("class", "avatar");
        img.setAttribute("src", avatarUrl);
        console.log('avatar: ' + avatar + ' but: ' + avatarUrl);

        cite.textContent = name;

        time.innerHTML = dateTime.getHours() + ':' + dateTime.getMinutes();
        time.setAttribute("datetime", dateTime);

        header.setAttribute("class", "message-header");
        header.appendChild(cite);
        header.appendChild(time);
        header.appendChild(del);

        p.textContent = message;

        div.setAttribute("tabIndex", "0");
        div.setAttribute("class", "message-body");
        div.appendChild(header);
        div.appendChild(p);

        div.addEventListener("focusin", function() {
            if (email === JSON.parse(localStorage.getItem("babble")).userInfo.email) {
                del.style.display = "inline";
            }
        });
        div.addEventListener("mouseenter", function() {
            if (email === JSON.parse(localStorage.getItem("babble")).userInfo.email) {
                del.style.display = "inline";
            }
        });

        div.addEventListener("mouseleave", function() {
            del.style.display = "none";
        });

        del.setAttribute("tabIndex", "0");
        del.addEventListener("focusout", function() {
            del.style.display = "none";
        });
        del.addEventListener("click", function() {
            var data = {
                id: id
            }
            form = document.querySelector('form');
            sendRequestToServer('DELETE', form.action + 'messages/' + id, new RequestData("deleteMessage", data), null);
        });

        li.setAttribute("id", 'message#' + id);
        li.setAttribute("class", "message");
        li.appendChild(img);
        li.appendChild(div);

        ol.appendChild(li);
    }

    function postMessage(message, callback) {
        form = document.querySelector('form');
        sendRequestToServer('POST', form.action + 'messages', message, function(e) {
            console.log('post received');
        });
    }

    function deleteMessage(id, callback) {

    }

    function getStats(callback) {
        form = document.querySelector('form');
        sendRequestToServer('GET', form.action + 'stats', null, function(e) {
            var replyObject = JSON.parse(e);
            callback(replyObject.users, replyObject.messages);
        });
    }

    function setStats(users, messages) {
        document.querySelector('.users-counter').textContent = users;
        document.querySelector('.messages-counter').textContent = messages;
    }

    function sendRequestToServer(method, action, data, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, action);
        if (method.toUpperCase() === 'POST') {
            xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
        }
        xhr.addEventListener('load', function (e) {
            if (xhr.status == "200") {
                console.log('200');
                if (callback) {
                    callback(e.target.responseText);
                }
            } else {
                console.error('received the following status from server: ' + xhr.status);
                console.log('received the following status from server: ' + xhr.status);
            }
        });
        xhr.send(JSON.stringify(data));
    }

    function getLocalStorage() {
        return JSON.parse(localStorage.getItem("babble"));
    }

    function setLocalStorage(userInfo, message) {
        var user = {
            currentMessage: message,
            userInfo: userInfo
        };
        localStorage.setItem("babble", JSON.stringify(user));
    }

    function handleIncomingMessage(message) {
        if (message.messageType === "deleteMessage") {
            try {
                var reqMessage = document.getElementById('message#' + message.messageContent.id);
                reqMessage.parentNode.removeChild(reqMessage);
            } catch (err) { }
        } else {
            for (i = 0; i < message.messageContent.messages.length; i++) {
                var incoming = message.messageContent.messages[i];
                addNewMessage(incoming.id, incoming.avatar, incoming.name, incoming.email, incoming.message);
            }
        }
        document.querySelector(".chat-info-counters-messages").querySelector("span").textContent = message.messageContent.messagesCount;
        document.querySelector(".chat-info-counters-users").querySelector("span").textContent = message.messageContent.usersCount;
    }

    // Based on: link sent on slack and on https://alistapart.com/article/expanding-text-areas-made-elegant
    function makeGrowable(container) {
    /*    if (container != null) {
            var area = container.querySelector('textarea');
            var clone = container.querySelector('span');
            area.addEventListener('input', function(e) {
                clone.textContent = area.textContent;
                var user = JSON.parse(localStorage.getItem("babble"));
                user.currentMessage = area.value;
                setLocalStorage(user.userInfo, area.value);
            });
        }*/
    }

    function sendChatMessage(form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            var localUser = getLocalStorage();

            /*if (!localUser.currentMessage) {
                return;
            }*/

            var message = {
                name: localUser.userInfo.name,
                email: localUser.userInfo.email,
                message: form.elements[0].value,
                timestamp: Date.now()
            }
            
            postMessage(message, addNewMessage);
            form.elements[0].value = '';
            setLocalStorage(localUser.userInfo, '');
        });
    }
}(window.Babble));    