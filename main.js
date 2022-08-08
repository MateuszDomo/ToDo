const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const TodoData = require("./models/TodoData");
const User = require("./models/User")
const session = require("express-session");
const { request, response } = require("express");
dotenv.config();
// Test Login
console.log("hi");
// Username: DarthVader
// Password: Starwars

// Variables that contain code to filter Query Documents in the MongoDB database
var filterType = {
    urgency:`[{"$set":
                {"sort-key":{"$indexOfArray":[["High", "Medium", "Low"], "$urgency"]}}},
                {"$sort":{"sort-key":1}},{"$unset":["sort-key"]}]`,
    none:`[{$match:{}}]`
}

// Session Middleware
// Contains the filter variable to be easily accessed
app.use(session({
    filter: String,
    secret: "Secret-for-todo",
    resave: true,
    saveUninitialized: true
}));

app.use("/static", express.static("public"));
app.use(express.urlencoded({extended : true}));

// Connect to Database then create HTTP webpage
// Connection link to the mongoose Database is stored in .env (DB_CONNECT)
mongoose.connect(process.env.DB_CONNECT,{useNewUrlParser:true}, () =>{
    console.log("Connected to Database!");
    app.listen(3000, () => console.log("Server Up and Running"));
});

// Figures out which filter to use
var filter;
function returnFilterCode(filter){
    if(filter==="urgency"){
        return filterType.urgency;
    }else if(filter==="Select Filter" || typeof(filter)==="undefined"){
        return filterType.none;
    }
}

app.set("view engine", "ejs");

// Home page/Not logged in
// Read Tasks
// .aggregate finds and filters tasks in the Database
app.get("/", (req,res) => {
    session.loggedin = false;
    TodoData.aggregate(eval(returnFilterCode(session.filter))) .exec( function (err, entries){
        if (err){
            console.log(err);
        }else{
            res.render("pages/index.ejs", {todoDataList: entries,filter});
        }
    });
});

// Read Tasks
// .aggregate finds and filters tasks in the Database
app.get("/loggedin", (req,res) => {
    TodoData.aggregate(eval(returnFilterCode(session.filter))).exec( function (err, entries){
        if (err){
            console.log(err);
        }else{
            res.render("pages/loggedin.ejs", {todoDataList: entries,filter, username: req.session.username});
        }
    });
});

// Logs User out
app.post("/logout", (req,res) => {
    req.session.loggedin = false;
    res.redirect("/")
});

// Creates a new User and tries to find the User in the Database
// If the user is found, the the User is logged in and is redirected to the "/loggedin" page
// Else, the User is redirected to the home page or ("/")
app.post("/auth" , async (req,res) =>{
    const user = new User({
        username: (req.body.username).replace(/\s+/g, ''),
        password: (req.body.password).replace(/\s/g, '')
    });
    doc = await User.findOne({username: user.username, password: user.password });
    if(doc === null){
        res.redirect("/");
    }else{
        req.session.loggedin = true;
        req.session.username = user.username;
        res.redirect("/loggedin");
    }
});

// Create tasks and save them in the Database
// All fields in TodoData are required
app.post('/loggedin', async (req,res) => {
    session.filter = req.body.todo_filter;
    const todoData = new TodoData({
        activityDescription: req.body.activity,
        urgency: req.body.urgency,
        activityType: req.body.subject,
        username: req.session.username
    });
    try{
        await todoData.save();
        res.redirect("/loggedin");
    } catch (err){
        res.redirect("/loggedin");
    }
});

// Creates a new User and saves the new User in the Database to be logged into later on
// Logs the User in and redirects them to the "/loggedin" page
app.post('/createUser', async (req,res) => {
    const user = new User({
        username: (req.body.username).replace(/\s+/g, ''),
        password: (req.body.password).replace(/\s/g, '')
    });
    await user.save();
    req.session.loggedin = true;
    req.session.username = user.username;
    res.redirect("/loggedin");
});

// Home page/Not logged in
// Purpose: Filter can be used by a not logged in User
app.post("/", async (req,res) => {
    session.filter = req.body.todo_filter;
    res.redirect("/");
});

// Update Task
// .aggregate finds and filters tasks in the Database
// Finds and filters the tasks, then finds the task to be updated by its ID in the Database and changes it
app.route("/edit/:id")
.get((req, res) => {
    const id = req.params.id;
    TodoData.aggregate(eval(returnFilterCode(session.filter))).exec( function (err, entries){
        res.render("pages/edit.ejs", { todoDataList: entries, itemID: id, username: req.session.username});
    });
})
.post((req, res) => {
    const id = req.params.id;
    TodoData.findByIdAndUpdate(id, { 
        activityDescription: req.body.activity, 
        urgency: req.body.urgency,
        activityType: req.body.subject,
        username: req.session.username
    }, 
    err => {
        if (err){
            return res.send(500, err);
        };
    res.redirect("/loggedin");
    });
});

// Remove Task
// Finds the task to be deleted through its ID and deletes it from the Database
app.route("/remove/:id")
.get((req, res) => {
    const id = req.params.id;
    TodoData.findByIdAndRemove(id, err => {
    if (err) return res.send(500, err);
        res.redirect("/loggedin");
    });
});