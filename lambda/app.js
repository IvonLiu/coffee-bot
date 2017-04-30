var request = require('request');
var PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
var FIREBASE_URL = 'https://coffee-bot-8ca6d.firebaseio.com';

exports.handler = (event, context, callback) => {

    var data = JSON.parse(event.body);
    console.log(event.body);

    if (data.object === 'page') {
        data.entry.forEach(function(entry) {

            var pageID = entry.id;
            var timeOfEvent = entry.time;
            
            entry.messaging.forEach(function(event) {
                if (event.message) {
                    receivedMessage(event);
                } else {
                    console.log("Webhook received unknown event: ", event);
                }
            });
        });
    }
    
    var response = {
        'statusCode': 200
    };
    callback(null, response);
    
};

function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;
    
    var messageId = message.mid;
    var messageText = message.text;
    var messageAttachments = message.attachments;

    console.log('Received message from ' + senderID + ': ' + messageText)

    request({
        uri: FIREBASE_URL + '/members.json',
        method: 'GET'
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);
            var userKey = null;
            for (key in data) {
                if (data[key].id == senderID) {
                    userKey = key;
                    break;
                }
            }
            if (userKey == null) {
                addNewUser(senderID);
            } else {
                request({
                    uri: FIREBASE_URL + '/members/' + userKey + '/current.json',
                    method: 'GET'
                }, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var data = JSON.parse(body);
                        var recipients = [];
                        for (key in data) {
                            recipients.push(data[key]);
                        }
                        recipients.forEach(function(recipientId) {
                            if (messageText) {
                                sendTextMessage(recipientId, messageText);
                            } else if (messageAttachments) {
                                sendTextMessage(recipientId, "Message with attachment received");
                            }
                        });
                    } else {
                        console.log('Error getting current pairings for ' + senderID + ': ' + error);
                    }
                });
            }
        } else {
            console.log('Error getting member data: ' + error);
        }
    });
}

function addNewUser(senderID) {
    request({
        uri: FIREBASE_URL + '/members.json',
        method: 'POST',
        json: {
            id: senderID
        }
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            sendTextMessage(senderID, 'Welcome to Coffee Chats! Please await your pairing!');
        } else {
            console.log('Error adding new user: ' + error);
        }
    });
}

function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData);
}

function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: messageData
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;
        
            console.log("Successfully sent generic message with id %s to recipient %s", 
                messageId, recipientId);
        } else {
            console.error("Unable to send message.");
            console.error(response);
            console.error(error);
        }
    });  
}
