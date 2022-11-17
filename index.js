const express = require('express');
const port = process.env.PORT || 5000;
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.42e2srw.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req,res,next){
    // console.log(req.headers.authorization);
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send(`Unauthorized access`);
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token,process.env.TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'forbidden access'})
        }
        req.decoded = decoded;
        next();
    })
}

async function run(){
    try{
        const appointmentOptionCollection = client.db('doctor-portal').collection('appointment-options');
        const bookingsCollection = client.db('doctor-portal').collection('bookings');
        const usersCollection = client.db('doctor-portal').collection('users');

        app.get('/appointmentOptions', async(req,res)=>{
            const query = {}
            const date = req.query.date;
            // console.log('date: ',date);
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

                //  console.log(date, option.name,remainingSlots.length);
             })

            res.send(options);
        });

        app.get('/bookings',verifyJWT, async(req,res)=>{
            const email = req.query.email;
            const query = {email: email};
            const decodedEmail = req.decoded.email;

            if(email !== decodedEmail){
                return res.status(403).send({message: 'forbidden access'});
            }
            const bookings = await bookingsCollection.find(query).toArray();
            
            res.send(bookings);
        })

        app.post('/bookings', async(req, res)=>{
            const booking = req.body;
            // console.log(booking);
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
        });

        app.get('/jwt', async(req,res) => {
            const email = req.query.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);

            if(user){
                const token = jwt.sign({email}, process.env.TOKEN, {expiresIn: '1d'});
                res.send({accessToken: token});
            }

            res.status(403).send({accessToken: 'forbidden'});
        });

        app.post('/users', async(req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);

            res.send(result)
        });

        app.get('/users', async(req,res)=>{
            // const user = req.body;
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users)
        });

        app.get('/users/admin/:email', async(req,res)=>{
            const email = req.params.email;
            const query = { email};
            const user = await usersCollection.findOne(query);

            res.send({isAdmin: user?.role === 'admin'});
        })

        app.put('/users/admin/:id',verifyJWT, async(req,res)=>{
            const decodedEmail = req.decoded.email;
            const query = {email: decodedEmail};
            const user = await usersCollection.findOne(query);

            if(user?.role !== 'admin'){
                res.status(403).send({message: "Forbidden Access"});
            }
        
            const id = req.params.id;
            const filter = { _id:ObjectId(id)};
            const options = { upsert: true}
            const updateDoc={
                $set:{
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options)

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