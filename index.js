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
        const bookingCollection = client.db('doctor-portal').collection('bookings');

        app.get('/appointmentOptions', async(req,res)=>{
            const query = {}
            const result = await appointmentOptionCollection.find(query).toArray();

            res.send(result);
        });

        app.post('/bookings', async(req, res)=>{
            const booking = req.body;
            console.log(booking);
            // const query = {
            //     appointmentDate: booking.appointmentDate,
            //     email: booking.email,
            //     treatment: booking.treatment
            // }

            const result = await bookingCollection.insertOne(booking);

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