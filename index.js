const express = require('express');
const port = process.env.PORT || 5000;
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.42e2srw.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const appointmentOptionCollection = client.db('doctor-portal').collection('appointment-options');
        const bookingsCollection = client.db('doctor-portal').collection('bookings');

        app.get('/appointmentOptions', async(req,res)=>{
            const query = {}
            const date = req.query.date;
            console.log('date: ',date);
            const options = await appointmentOptionCollection.find(query).toArray();
             // get the bookings of the provided date
             const bookingQuery = { AppointmentDate: date }
             const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
 
             // code carefully :D
             options.forEach(option => {
                 const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
                 const bookedSlots = optionBooked.map(book => book.slot);
                 const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
                 option.slots = remainingSlots;

                 console.log(date, option.name,remainingSlots.length);
             })

            res.send(options);
        });

        app.post('/bookings', async(req, res)=>{
            const booking = req.body;
            console.log(booking);
            const query = {
                AppointmentDate: booking.AppointmentDate,
                email: booking.email,
                treatment: booking.treatment
            };

            const alreadyBooked = await bookingsCollection.find(query).toArray();

            if(alreadyBooked.length){
                const message = `You already have a booking on ${booking.AppointmentDate}`
                return res.send({acknowledge: false, message})
            }

            const result = await bookingsCollection.insertOne(booking);

            res.send(result);
        })

    }
    finally {}
}
run().catch(e=>console.error('run error => ', e))

app.get('/',async (req,res)=>{
    res.send('doctor portal is running...');
});

app.listen(port,()=>{
    console.log('server is running on: ', port);
});