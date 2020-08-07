const socket = io()

// Elements
const $messageForm = document.querySelector('#message-form') // Dollar sign is a convention that messageForm is a selected element from the DOM.
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector("#send-location")
const $messages = document.querySelector('#messages')

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML // Need innerHTML to render template correctly
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Options
// qs library imported as a script in chat.html. Location search gives the query string for the chat room. 
// ignoreQueryPrefix removes leading ? before username. Gives query string as object.
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true }) // Object destructuring for property names.

const autoScroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild // Grabs last message element as a child.

    // Height of new message
    const newMessageStyles = getComputedStyle($newMessage) // Gets style for the selected element. Made available by browser.
    const newMessageMargin = parseInt(newMessageStyles.marginBottom) // Gets margin bottom size as an integer value.
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin // Does not take margin into account, hence the + newMessageMargin

    // Visible Height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight // Gives total height that we are able to scroll through.

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight
    // .scrollTop gives, as a number, the amount of distance we have scrolled from the top. Becomes larger as we scroll down.
    // + visibleHeight give more accurate picture of distance from the bottom.

    if (containerHeight - newMessageHeight <= scrollOffset) {
        // /\ Checks if we were scrolled to the bottom before the last message was added. 
        // If newMessageHeight not accounted for, we will never be scrolled to the bottom, because we are running this code after adding the new message, and user does not have chance to scroll down.
        
        $messages.scrollTop = $messages.scrollHeight // Pushes how far down we are scrolled to all the way down.
        // If we wanted to always scrool the user to the bottom, we would only need the above line.
    }
}

socket.on('message', (message) => {
    // message will always be an object. See messages.js
    console.log(message)

    // Stores final html that will be rendered in the browser.
    const html = Mustache.render(messageTemplate, {
        // This is the data provided to the template
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a') // moment is provided in a script tag in chat.html
    })

    $messages.insertAdjacentHTML('beforeend', html) // Allows us to insert other html adjacent to the elements that is selected (in this case, messages div).
    autoScroll()
})

socket.on('locationMessage', (locationUrlData) => {
    console.log(locationUrlData)

    const html = Mustache.render(locationMessageTemplate, {
        username: locationUrlData.username,
        mapsUrl: locationUrlData.mapsUrl,
        createdAt: moment(locationUrlData.createdAt).format('h:mm a')
    })

    $messages.insertAdjacentHTML('beforeend', html)
    autoScroll()
})

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html // Populates the sidebar with the room name and username of users.
})

socket.on('sendMessage', (message) => {
    // Name of first argument must match the name of the arguments created in socket.emit in index.js
    // Name of argument in callback can be anything, but chose second value in socket.emit().
    // Receives event from server.
    console.log(message)
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()

    $messageFormButton.setAttribute('disabled', 'disabled') // Disables form once it has been submitted.

    const message = e.target.elements.message.value // Target represent target that we are listening for the event on, aka form. Now we have access to elements by their name.
    socket.emit('sendMessage', message, (error) => {
        // Server knows the message, so do not need to send data across.
        // Last argument is a function that runs when the event is acknowledged.

        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = '' // Sets the value to an empty string to clear the previous sent message.
        $messageFormInput.focus() // Keeps the cursor inside the message box.

        if (error) { return console.log(error) }
        console.log('The message was delivered.')
    }) 
})

$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) { return alert('Geolocation is not supported by your browser.') }

    $sendLocationButton.setAttribute('disabled', 'disabled')

    navigator.geolocation.getCurrentPosition((position) => {
        // position is an object, and contains the information we would like to share.
        // Last argument (the empty function) is a function that runs when the event is acknowledged.
        socket.emit('sendLocation', {
            'lat': position.coords.latitude, 
            'long': position.coords.longitude 
        }, () => {
            $sendLocationButton.removeAttribute('disabled')
            console.log('Location shared.')
        })
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/' // Sends the user back to the homepage if there is an error.
    }
})

