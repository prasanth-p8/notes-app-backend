const express = require("express")
const path = require("path")
const {open} = require("sqlite")
const sqlite3 = require("sqlite3")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const app = express();
app.use(express.json());

// database path getting using path method
const dbPath = path.join(__dirname,'user_notes.db');

let db = null;

// connecting database and server
const initializeDBAndServer = async () => {
    try{
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        app.listen(3000, () => {
            console.log("Server Running at http://localhost:3000/")
        });
    }
    catch(e){
        console.log(`DB error message: ${e.message}`);
        process.exit(1);
    }
};

// calling function for initializing database and server
initializeDBAndServer();


// register user api
app.post("/register", async (req, res) => {
    const {name, email, password} = req.body;
    const selectUserQuery = `select * from users where email = '${email}'`;
    const dbUser = await db.get(selectUserQuery);
    console.log(dbUser)
    if(dbUser === undefined){
        const hashedPassword = await bcrypt.hash(password, 10);
        const createUserQuery = `insert into users(name, email, password)
                                 values ('${name}','${email}','${hashedPassword}');`;
        const dbResponse = await db.run(createUserQuery);
        console.log(dbResponse)
        res.send(`last created id: ${dbResponse.lastID}`)
    }else{
        res.status = 400;
        res.send("E-mail already exists. Try with new one!")
    }
})

// login user api
app.post('/login', async(req, res) => {
    const {email, password} = req.body;
    const selectUserQuery = `select * from users where email = '${email}'`;
    const dbUser = await db.get(selectUserQuery);
    if(dbUser !== undefined){
        const isPasswordMatch = await bcrypt.compare(password, dbUser.password);
        if(isPasswordMatch){
            const payload = {
                email: email
            };
            const jwtToken = jwt.sign(payload, "my_secret_key");
            res.send({jwtToken})
        }else{
            res.status = 400;
            res.send("Password Incorrect")
        }
    }else{
        res.status = 400;
        res.send("email doesn't exists. Register an account.")
    }
})

app.get("/", (req, res) => {
    let jwtToken;
    const authHeader = req.headers['authorization'];
    if(authHeader !== undefined){
        jwtToken = authHeader.split(" ")[1];
    }
    if(jwtToken !== undefined){
        jwt.verify(jwtToken, "my_secret_key", async (err, payload) => {
            if(err){
                res.send("Invalid Access Token")
            }else{
                req.email = payload.email;
                const {email} = req;
                const selectUserQuery = `select * from users where email = '${email}'`;
                const dbUser = await db.get(selectUserQuery);
                res.send(`Hi ${dbUser.name}...`)
            }
        })
    }else{
        res.status(400);
        res.send("Invalid Access Token")
    }
})


