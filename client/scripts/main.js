(function () {

     window.addEventListener("load", function() {
        var form = document.querySelector('form');
        document.querySelector(".chat-info-counters-messages").querySelector("span").textContent = 0;
        logIn();
        sendUserSignedIn();
        makeGrowable(document.querySelector('.js-growable'));
        sendChatMessage(form);
        poll(0, form);
    });

    window.addEventListener('beforeunload', function() {
        var form = document.querySelector('form');
        navigator.sendBeacon(form.action, JSON.stringify(new RequestData("newSignOut", null)));
    });

    function register(userInfo) {
        var user = {
            currentMessage: '',
            userInfo: {
                name: userInfo.name,
                email: userInfo.email
            }
        };
        localStorage.setItem("babble", JSON.stringify(user));
    }

    function getMessages(number, callback) {
        
    }

    function postMessage(message, callback) {

    }

    function deleteMessage(id, callback) {

    }

    function getStats(callback) {
        
    }



    function RequestData(type, content) {
        this.messageType = type;
        this.messageContent = content;
    }

    function request(method, action, data, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, action);
        if (method === 'post') {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        if (callback) {
            xhr.addEventListener('load', function (e) { 
                callback(e);
            });
        }
        xhr.send(JSON.stringify(data));
    }

    function saveLocalStorage(name, email, message) {
        var user = {
            currentMessage: message,
            userInfo: {
                name: name,
                email: email
            }
        };
        localStorage.setItem("babble", JSON.stringify(user));
    }

    function logIn() {
        var localUser = localStorage.getItem("babble");
        if (typeof(Storage) === "undefined" || localUser === null) { // Code for localStorage + getting the username
            var modal = document.querySelector('.modal-overlay');
            modal.style.display = "block";
            var modalConfirm = modal.querySelector('.confirm').addEventListener("click", function() {
                saveLocalStorage(document.querySelector("#name"), document.querySelector("#email").value, '');
                document.querySelector('.modal-overlay').style.display = "none";
            });
            var modalDiscard = modal.querySelector('.discard').addEventListener("click", function() {
                var form = document.querySelector('form');
                request(form.method, form.action, new RequestData("getId", null), function(e) {
                    var user = {
                        email: "anonymous#" + JSON.parse(e.target.responseText).messageContent.id,
                        message: ''
                    };
                    localStorage.setItem("babble", JSON.stringify(user));
                    document.querySelector('.modal-overlay').style.display = "none";
                });
            });
        } else {
            var form = document.querySelector("form");
            form.elements[0].value = JSON.parse(localUser).message;
        }
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

    function sendUserSignedIn() {
        var form = document.querySelector('form');
        request(form.method, form.action, new RequestData("newLogIn", null), function(e) {
            var message = JSON.parse(e.target.responseText);
            document.querySelector(".chat-info-counters-messages").querySelector("span").textContent = message.messageContent.messagesCount;
            document.querySelector(".chat-info-counters-users").querySelector("span").textContent = message.messageContent.usersCount;
        })
    }

    // Based on: link sent on slack and on https://alistapart.com/article/expanding-text-areas-made-elegant
    function makeGrowable(container) {
        if (container != null) {
            var area = container.querySelector('textarea');
            var clone = container.querySelector('span');
            area.addEventListener('input', function(e) {
                clone.textContent = area.textContent;
                var user = JSON.parse(localStorage.getItem("babble"));
                user.currentMessage = area.value;
                saveLocalStorage(user.userInfo.name, user.userInfo.email, area.value);
            });
        }
    }

    function sendChatMessage(form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            var localUser = JSON.parse(localStorage.getItem("babble"));

            if (!localUser.currentMessage) {
                return;
            }

            var data = {
                email: localUser.email,
                message: localUser.message
            }

            request(form.method, form.action, new RequestData("newMessage", data), null);
            form.elements[0].value = "";
            localUser.currentMessage = "";
            saveLocalStorage(localUser.userInfo.name, localUser.userInfo.email, '');
        });
    }

    function addNewMessage(id, avatar, name, email, message) {
        var ol = document.getElementById("messages-list");
        var li = document.createElement("li");
        var img = document.createElement("img");
        var div = document.createElement("div");
        var cite = document.createElement("cite");
        var time = document.createElement("time");
        var del = document.createElement("button");
        var p = document.createElement("p");

        img.setAttribute("class", "avatar");
        img.setAttribute("src", avatar);//"https://yt3.ggpht.com/-MlnvEdpKY2w/AAAAAAAAAAI/AAAAAAAAAAA/tOyTWDyUvgQ/s900-c-k-no-mo-rj-c0xffffff/photo.jpg");

        cite.textContent = name;

        time.textContent = "15:23"
        time.setAttribute("datetime", "2017-5-25 15:23");

        p.textContent = message;

        div.setAttribute("tabIndex", "0");
        div.setAttribute("class", "message-body");
        div.appendChild(cite);
        div.appendChild(time);
        div.appendChild(del);
        div.appendChild(p);

        div.addEventListener("focusin", function() {
            if (email === JSON.parse(localStorage.getItem("babble")).email) {
                del.style.display = "inline";
            }
        });
        div.addEventListener("mouseenter", function() {
            if (email === JSON.parse(localStorage.getItem("babble")).email) {
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
            console.log('delete! delete! delete!');
            form = document.querySelector('form');
            request(form.method, form.action, new RequestData("deleteMessage", data), null);
        });

        li.setAttribute("id", 'message#' + id);
        li.setAttribute("class", "message");
        li.appendChild(img);
        li.appendChild(div);

        ol.appendChild(li);
    }

    var poll = function(messageCounter, form) {
        var data = {
            counter: messageCounter
        }
        request(form.method, form.action, new RequestData("getMessage", data), function(e) {
            var message = JSON.parse(e.target.responseText);
            handleIncomingMessage(message);
            poll(message.messageContent.messagesCount, form);
        });
    }
}(this.window));    