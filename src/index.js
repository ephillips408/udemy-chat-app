const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public/')

const app = express()
const server = http.createServer(app) // Allows us to create new web server. Express normally does this behind the scenes. A part of making sure socket.io runs.
const io = socketio(server) // socket.io expects a call from a raw http server, hence the above line.

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    // socket is an object that contains information about the connection.
    console.log('New WebSocket connection.')

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })
        // socket.id is the unique id for this particular connection.
        // Object destructuring gives error if addUser() returns an error, or the user data if successful.

        if (error) {
            return callback(error)
        }
        
        socket.join(user.room) // Allows for user to join desired room. socket.join is only available on the server. 
        // user.room because of formatting in messages.js. This allows for calling the values that result from addUser().

        socket.emit('message', generateMessage('Admin', 'Welcome')) // Sends event from server to single client. The second argument is available in the callback of the client function socket.on() in chat.js
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`)) 
        // Broadcast sends a message to every other client except the recently joined user.
        // to(room) makes sure that the message is only emitted to the room in which the user has joined.

        io.to(user.room).emit('roomData', {
            // Makes sure that the client gets the room data. Necessary for populating sidebar.
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback() // No argument because no error.
    })
    
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('message', generateMessage(user.username, message)) // Emits event to every connection that is currently available. socket.emit() would emit event to specific connection.
        callback() // This receives the callback provided by socket.emit from the client. Have access to callback argument in client in form of callback parameter.
    })

    socket.on('disconnect', () => {
        // Use socket.on inside connection callback when a given socket is disconnected. Disconnect provided by socket.io library.
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left.`))
            // Accounts for scenario where person disconnecting was never part of a room.
            
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }   
    })
    
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.lat},${coords.long}`))
        callback() // This receives the callback provided by socket.emit from the client. Have access to callback argument in client in form of callback parameter.
    })
})

server.listen(port, () => {
    // Need to change to server.listen to make sure socket.io can run
    console.log(`Server is up on port ${port}.`)
})