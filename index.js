const express = require('express');
const app = express()
require('dotenv').config()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;


//middleware

app.use(cors({
    origin:[
        "http://localhost:5173",
    ],
    credentials: true,
    // optionSuccessStatus:200,
    // methods: "GET,HEAD,PUT,PATCH,POST,DELETE"
}));
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.qou3k4c.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const userCollection = client.db('bistroDB').collection('users')
        const menuCollection = client.db('bistroDB').collection('menu')
        const reviewCollection = client.db('bistroDB').collection('reviewes')
        const cartCollection = client.db('bistroDB').collection('carts')
        const paymentCollection = client.db('bistroDB').collection('payment')

        // jwt related API
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            });
            res.send({ token });

        })

        // middlewares
        const verifyToken = (req, res, next)=>{
            // console.log("in verify token",req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({message: 'unauthorized access'});
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err, decoded) =>{
                if(err){
                    return res.status(401).send({message: 'unauthorized access'})
                }
                req.decoded = decoded;
                next();
            })
        }

        const verifyAdmin = async(req,res, next) =>{
            const email = req.decoded.email;
            const query = {email:email};
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({message:'forbidden access'})
                
            }
            next()
        }
        // users related api
        app.get("/users",verifyToken,verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })
        app.get('/users/admin/:email', verifyToken,  async(req,res) =>{
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({message:'forbidden access'})
                
            }
            const query ={email:email};
            const user = await userCollection.findOne(query);
            let admin = false;
            if(user){
                admin = user?.role === 'admin';
            }
            res.send({admin});
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.patch('/users/admin/:id',verifyAdmin,verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: "admin"
                }
            }
            const result = await userCollection.updateOne(query, updatedDoc);
            res.send(result);

        })
        app.delete('/users/:id', verifyAdmin, verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);

        })

        // menu
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result);
        })
        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const query= {_id: new ObjectId(id)}
            const result = await menuCollection.findOne(query);
            res.send(result);
        })
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        app.patch('/menu/:id', async (req, res)=>{
             const item = req.body
             const id = req.params.id
             const filter = {_id : new ObjectId(id)}
             const updatedDoc ={
                $set:{
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    recipe: item.recipe,
                    image: item.image
                }
             }
             const result = await menuCollection.updateOne(filter, updatedDoc);
             res.send(result);
        })

        app.post('/menu',verifyToken,verifyAdmin, async(req,res) =>{
            const item = req.body;
            const result = await menuCollection.insertOne(item);
            res.send(result);
        })

        app.delete('/menu/:id',verifyToken,verifyAdmin, async (req, res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await menuCollection.deleteOne(query);
            res.send(result);
        })
        // cart Collection
        app.get('/carts', async (req, res) => {
            const email = req.query.email; 
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })
        app.post('/carts', async (req, res) => {
            const item = req.body;
            console.log(item);
            const result = await cartCollection.insertOne(item);
            res.send(result);
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        })
        // payment
        app.post('/create-payment-intent', async(req,res) =>{
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log(amount, ' amount');

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'gbp',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        app.get('/payments/:email',verifyToken, async(req,res) =>{
            const query = {email: req.params.email}
            if (req.params.email !== req.decoded.email) {
                return res.status(403).send({message:'forbidden access'});
            }
            const result = await paymentCollection.find(query).toArray();
            res.send(result);
        })
        app.post('/payments', async(req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment);
            const query = {_id:{
                $in: payment.cartId.map(id=> new ObjectId(id))
            }}

            const deleteResult = await cartCollection.deleteMany(query);

            // delete item from cart
            console.log('payment info', payment);
            res.send({paymentResult, deleteResult})
        })

        app.get('/admin-stats', async(req, res) =>{
            const users = await userCollection.estimatedDocumentCount();
            const menuItems = await menuCollection.estimatedDocumentCount();
            const orders = await paymentCollection.estimatedDocumentCount();

            // const payments = await paymentCollection.find().toArray();
            // const revenue = payments.reduce( ( total, payment) => total + payment.price, 0)

            const result = await paymentCollection.aggregate([
                {
                    $group:{
                        _id: null,
                        totalRevenue: {
                            $sum: '$price'
                        }
                    }
                }
            ]).toArray()

            const revenue = result.length > 0 ? result[0].totalRevenue : 0;

            res.send({
                users,
                menuItems,
                orders,
                revenue

            })
        })

        // using aggregate pipeline

        app.get('/order-stats', async(req, res) =>{
            const result = await paymentCollection.aggregate([

                {
                    $unwind: '$menuItemId'
                },
                {

                    $lookup: {
                        from: 'menu',
                        localField: 'menuItemId',
                        foreignField: '_id',
                        as: 'menuItems'
                    }
                },
                {
                    $unwind: '$menuItems'
                },
                {
                    $group: {
                        _id: '$menuItems.category',
                        quantity:{
                            $sum: 1
                        },
                        revenue:{$sum: '$menuItems.price'}
                    }
                },
                {
                    $project:{
                        _id: 0,
                        category:'$_id',
                        quantity: '$quantity',
                        revenue:'$revenue'
                    }
                }
            ]).toArray();

            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('boss is sitting')
})

app.listen(port, () => {
    console.log(`Bistro boss is sitting on port ${port}`);
})