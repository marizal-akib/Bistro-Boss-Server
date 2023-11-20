const express = require('express');
const app = express()
require('dotenv').config()
const cors = require('cors')
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
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
        
        const userCollection = client.db('bistroDB').collection('user')
        const menuCollection = client.db('bistroDB').collection('menu')
        const reviewCollection = client.db('bistroDB').collection('reviewes')
        const cartCollection = client.db('bistroDB').collection('carts')

        app.get('/menu', async(req,res) =>{
            const result = await menuCollection.find().toArray();
            res.send(result);
        })
        app.get('/reviews', async(req,res) =>{
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })



        // cart Collection
        app.get('/carts', async(req,res) =>{
            const result = await  cartCollection.find().toArray();
            res.send(result);
        })
        app.post('/carts', async(req,res) =>{
            const item = req.body;
            console.log(item);
            const result = await cartCollection.insertOne(item);
            res.send(result);
        })

        app.delete('/carts/:id', async(req,res) =>{
            const id = req.params.id
            const query = {_id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query);
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