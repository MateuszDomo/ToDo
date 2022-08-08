const mongoose = require("mongoose");

const Schema = new mongoose.Schema({

    activityDescription: {
        type: String,
        required: true
    },

    urgency: {
        type: String,
        required: true
    },

    activityType: {
        type: String,
        required: true
    },
    
    username: {
        type: String,
        required: true
    }
    
});

module.exports = mongoose.model("TodoData",Schema);